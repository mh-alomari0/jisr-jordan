import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // استخدام مفتاح افتراضي آمن حصراً لبيئة الاختبار المباشرة (Vitest)
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
    const { bookingId, transactionId, signature } = body;

    if (!bookingId || !transactionId || !signature) {
      return NextResponse.json({ error: "بيانات الطلب غير كاملة" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${bookingId}:${transactionId}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    // التحقق من تساوى أطوال التوقيعات لتجنب أخطاء timingSafeEqual المباشرة
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: "توقيع HMAC غير صحيح" }, { status: 401 });
    }

    return NextResponse.json({ success: true, status: "VERIFIED" });
  } catch {
    return NextResponse.json({ error: "حدث خطأ أثناء المعالجة" }, { status: 500 });
  }
}