import { NextResponse } from "next/server";
import { getPaymentGatewayAdapter } from "@/lib/payment-gateway";

export async function POST() {
  if (!getPaymentGatewayAdapter()) {
    return NextResponse.json(
      { error: "Electronic payment verification is not configured" },
      { status: 501 }
    );
  }

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
