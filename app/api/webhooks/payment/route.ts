import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paymentService } from "@/lib/payments";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || "";
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (!secret) {
      logger.error("Missing PAYMENT_WEBHOOK_SECRET environment variable", { context: "PaymentWebhook" });
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const isValid = paymentService.verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      logger.warn("Invalid webhook signature received", { context: "PaymentWebhook" });
      return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Fail-Fast: يرفض العمل بدون مفتاح الأدمن المباشر بدلاً من الانزلاق لـ Anon Key
    if (!serviceRoleKey || !supabaseUrl) {
      logger.error("CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY for payment confirmation", { context: "PaymentWebhook" });
      return NextResponse.json({ error: "Server Security Misconfiguration" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const body = JSON.parse(rawBody);

    if (body.bookingId && body.status === "SUCCESS") {
      const { error } = await supabaseAdmin
        .from("bookings")
        .update({ status: "CONFIRMED" })
        .eq("id", body.bookingId);

      if (error) {
        logger.error(`Failed to update booking status: ${error.message}`, { context: "PaymentWebhook" });
        return NextResponse.json({ error: "Database Update Failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true, status: "PROCESSED" });
  } catch (err) {
    logger.error("Error processing payment webhook", { context: "PaymentWebhook", error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}