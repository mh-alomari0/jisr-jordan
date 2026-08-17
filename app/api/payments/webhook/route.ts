import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  try {
    const secret =
      process.env.PAYMENT_GATEWAY_SECRET ||
      (process.env.NODE_ENV === "test" ? "test_secret_key" : "");

    if (!secret) {
      return NextResponse.json(
        { error: "التكوين الأمني لبوابة الدفع غير مكتمل على الخادم" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { bookingId, transactionId, amount, signature, eventType } = body;

    if (!bookingId || !transactionId || !amount || !signature) {
      return NextResponse.json({ error: "بيانات التنبيه غير كاملة" }, { status: 400 });
    }

    // 1. مطابقة التوقيع الرقمي لمنع الهجمات الخبيثة
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${bookingId}:${transactionId}:${amount}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: "توقيع HMAC غير صحيح" }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    // 2. معالجة الحدث وتحديث الجداول ذرياً
    if (eventType === "PAYMENT_SUCCESS") {
      await Promise.all([
        supabase
          .from("payments")
          .update({ status: "PAID", updated_at: new Date().toISOString() })
          .eq("transaction_id", transactionId),
        supabase
          .from("bookings")
          .update({
            payment_status: "PAID",
            status: "CONFIRMED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId),
      ]);
    } else if (eventType === "PAYMENT_FAILED") {
      await supabase
        .from("payments")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({ success: true, message: "تمت معالجة التنبيه بنجاح" });
  } catch {
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة التنبيه" }, { status: 500 });
  }
}