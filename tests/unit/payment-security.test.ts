import { describe, it, expect } from "vitest";
import { paymentService } from "@/lib/payments";
import crypto from "crypto";

describe("Payment Security & HMAC Webhook Verification Unit Tests", () => {
  const secret = "test_webhook_secret_key_2026";
  const validPayload = JSON.stringify({
    bookingId: "123e4567-e89b-12d3-a456-426614174000",
    status: "SUCCESS",
    transactionId: "tx_987654321",
  });

  it("ينبغي قبول الـ Webhook عند مطابقة توقيع HMAC-SHA256 الصحيح", () => {
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(validPayload)
      .digest("hex");

    const isValid = paymentService.verifyWebhookSignature(validPayload, validSignature, secret);
    expect(isValid).toBe(true);
  });

  it("ينبغي رفض الـ Webhook إذا تم التلاعب بـ Payload (Tampering Protection)", () => {
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(validPayload)
      .digest("hex");

    const tamperedPayload = JSON.stringify({
      bookingId: "123e4567-e89b-12d3-a456-426614174000",
      status: "SUCCESS",
      transactionId: "tx_HACKED_AMOUNT",
    });

    const isValid = paymentService.verifyWebhookSignature(tamperedPayload, validSignature, secret);
    expect(isValid).toBe(false);
  });

  it("ينبغي رفض التوقيع الفارغ أو المفتاح المفقود صراحة", () => {
    expect(paymentService.verifyWebhookSignature(validPayload, "", secret)).toBe(false);
    expect(paymentService.verifyWebhookSignature(validPayload, "invalid_sig", "")).toBe(false);
  });
});