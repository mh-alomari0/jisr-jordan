import crypto from "crypto";
import { logger } from "@/lib/logger";

export type PaymentMethod = "CASH_ON_DELIVERY" | "EFAWATEERCOM" | "CREDIT_CARD";
export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED";

export interface InitializePaymentInput {
  bookingId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerPhone: string;
  method: PaymentMethod;
}

export interface PaymentResult {
  transactionId: string;
  status: PaymentStatus;
  redirectUrl?: string;
}

class PaymentService {
  /**
   * تهيئة عملية دفع جديدة
   */
  async initializePayment(input: InitializePaymentInput): Promise<PaymentResult> {
    logger.info(`Initializing payment for booking ${input.bookingId}`, {
      context: "PaymentService",
      metadata: { amount: input.amount, method: input.method },
    });

    switch (input.method) {
      case "CASH_ON_DELIVERY":
        return {
          transactionId: `cod_${Date.now()}_${input.bookingId.slice(0, 8)}`,
          status: "PENDING",
        };

      case "EFAWATEERCOM":
        return {
          transactionId: `efaw_${Date.now()}`,
          status: "PENDING",
          redirectUrl: `https://checkout.efawateercom.jo/pay?ref=${input.bookingId}`,
        };

      case "CREDIT_CARD":
        return {
          transactionId: `tx_${Date.now()}`,
          status: "PENDING",
          redirectUrl: `https://checkout.stripe.com/pay/${input.bookingId}`,
        };

      default:
        throw new Error("وسيلة الدفع غير مدعومة");
    }
  }

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

export const paymentService = new PaymentService();