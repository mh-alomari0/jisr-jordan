import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paymentService } from "@/lib/payments";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-signature") || "";
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "";

    // 1. التحقق من التوقيع الأمني للإشعار
    const isValid = paymentService.verifyWebhookSignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      logger.warn("Received invalid payment webhook signature", { context: "PaymentWebhook" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { bookingId, status, transactionId } = payload;

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing payload data" }, { status: 400 });
    }

    // 2. استخدام Service Role للوصول المباشر المحمي لقاعدة البيانات
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 3. تحديث حالة الحجز بناءً على النتيجة السيرفرية
    const newStatus = status === "SUCCESS" ? "CONFIRMED" : "CANCELLED";

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      logger.error(`Failed to update booking status via Webhook: ${error.message}`, {
        context: "PaymentWebhook",
      });
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    logger.info(`Booking ${bookingId} updated to ${newStatus} via Webhook [Tx: ${transactionId}]`, {
      context: "PaymentWebhook",
    });

    return NextResponse.json({ received: true, status: newStatus });
  } catch (err) {
    logger.error("Unhandled error in Payment Webhook", { context: "PaymentWebhook", error: err });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}