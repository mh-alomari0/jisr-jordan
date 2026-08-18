import { NextResponse } from "next/server";
import { getPaymentGatewayAdapter } from "@/lib/payment-gateway";

/**
 * A webhook must never mutate bookings until a real gateway adapter verifies
 * the provider signature, event identity, transaction identity, and replay
 * protection. The current deployment therefore fails closed.
 */
export async function POST() {
  if (!getPaymentGatewayAdapter()) {
    return NextResponse.json(
      { error: "Payment webhook adapter is not configured" },
      { status: 501 }
    );
  }

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
