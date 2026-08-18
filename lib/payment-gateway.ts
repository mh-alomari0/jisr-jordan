export interface PaymentIntentRequest {
  bookingId: string;
  amount: number;
  currency: "JOD";
  customerId: string;
}

export interface PaymentIntentResult {
  externalId: string;
  redirectUrl: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  externalId: string;
  bookingId: string;
  status: "PAID" | "FAILED" | "REFUNDED";
}

/** Contract for a real, documented Jordan-compatible payment provider. */
export interface PaymentGatewayAdapter {
  createIntent(input: PaymentIntentRequest): Promise<PaymentIntentResult>;
  verifyWebhook(request: Request): Promise<VerifiedPaymentEvent>;
}

/** Electronic payments fail closed until a real provider adapter is installed. */
export function getPaymentGatewayAdapter(): PaymentGatewayAdapter | null {
  return null;
}
