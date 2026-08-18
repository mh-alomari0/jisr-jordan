import crypto from "crypto";
import { logger } from "@/lib/logger";

class PaymentSignatureVerifier {
  /**
   * التحقق المعتمد أمنياً من HMAC-SHA256 ومقارنته بالوقت الثابت لمنع Timing Attacks
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret || !payload) return false;

    try {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
      const checksum = Buffer.from(signature, "utf8");

      if (digest.length !== checksum.length) {
        return false;
      }

      return crypto.timingSafeEqual(digest, checksum);
    } catch (err) {
      logger.error("Error verifying webhook signature", { context: "PaymentService", error: err });
      return false;
    }
  }
}

/** Utility for a future adapter; it is not an operational payment gateway. */
export const paymentService = new PaymentSignatureVerifier();
