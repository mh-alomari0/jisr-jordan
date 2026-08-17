"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function createPaymentIntentAction(bookingId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    // 1. جلب السعر الحقيقي للخدمة المربوطة بالحجز من السيرفر
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, customer_id, services(price)")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return { success: false, error: "الحجز غير موجود أو تعذر جلب بياناته" };
    }

    if (booking.customer_id !== user.id) {
      return { success: false, error: "غير مصرح لك بإنشاء طلب دفع لهذا الحجز" };
    }

    const price = (booking.services as unknown as { price: number })?.price || 0;
    if (price <= 0) {
      return { success: false, error: "قيمة الخدمة غير صالحة لمعالجة الدفع" };
    }

    const idempotencyKey = `pay_intent_${bookingId}_${user.id}`;
    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 2. تسجيل سجل الدفع المبدئي بحالة PENDING
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .upsert(
        {
          booking_id: bookingId,
          customer_id: user.id,
          amount: price,
          currency: "JOD",
          status: "PENDING",
          transaction_id: transactionId,
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key" }
      )
      .select()
      .single();

    if (paymentErr) {
      return { success: false, error: "فشل تسجيل سجل الدفع" };
    }

    // 3. توليد توقيع HMAC المشفر
    const secret = process.env.PAYMENT_GATEWAY_SECRET || "test_secret_key";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${bookingId}:${transactionId}:${price}`)
      .digest("hex");

    return {
      success: true,
      paymentIntent: {
        paymentId: payment.id,
        bookingId,
        amount: price,
        currency: "JOD",
        transactionId,
        signature,
      },
    };
  } catch {
    return { success: false, error: "حدث خطأ أثناء إعداد نية الدفع" };
  }
}