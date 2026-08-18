"use server";

import { createServerSupabaseClient, createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * Create a Cash-on-Delivery payment for a booking.
 * COD does NOT generate fake transaction IDs or gateway signatures.
 * Payment status = PAY_ON_COMPLETION, to be settled when service is done.
 */
export async function createCODPaymentAction(bookingId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    const supabase = await createServerSupabaseClient();

    // Verify booking belongs to user and is in CONFIRMED or PENDING state
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, customer_id, status, services(price)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) return { success: false, error: "الحجز غير موجود" };
    if (booking.customer_id !== user.id) return { success: false, error: "غير مصرح" };
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return { success: false, error: "حالة الحجز لا تسمح بإنشاء دفع" };
    }

    const price = (booking.services as { price: number } | null)?.price || 0;
    if (price <= 0) return { success: false, error: "قيمة الخدمة غير صالحة" };

    // Idempotency: check if COD payment already exists
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("payment_method", "CASH_ON_DELIVERY")
      .maybeSingle();

    if (existing) return { success: false, error: "يوجد طلب دفع نقدي مسبق لهذا الحجز" };

    const adminClient = createAdminSupabaseClient();
    const idempotencyKey = `cod_${bookingId}_${user.id}`;

    const { data: payment, error: paymentErr } = await adminClient
      .from("payments")
      .insert({
        booking_id: bookingId,
        customer_id: user.id,
        amount: price,
        currency: "JOD",
        payment_method: "CASH_ON_DELIVERY",
        status: "PAY_ON_COMPLETION",
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (paymentErr) {
      if (paymentErr.message.includes("duplicate") || paymentErr.code === "23505") {
        return { success: false, error: "يوجد طلب دفع مسبق لهذا الحجز" };
      }
      logger.error("COD payment creation failed", { context: "CODPayment", error: paymentErr });
      return { success: false, error: "فشل إنشاء طلب الدفع" };
    }

    // If booking was PENDING, move to CONFIRMED (COD doesn't need online payment verification)
    if (booking.status === "PENDING") {
      await adminClient
        .from("bookings")
        .update({ status: "CONFIRMED", payment_status: "PENDING" })
        .eq("id", bookingId);
    }

    logger.info("COD payment created", {
      context: "CODPayment",
      metadata: { bookingId, paymentId: payment.id, amount: price },
    });

    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return { success: true, payment };
  } catch (err) {
    logger.error("COD payment error", { context: "CODPayment", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
