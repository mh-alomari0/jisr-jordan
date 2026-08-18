import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../app/api/payments/verify/route";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Payment Verify API Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_GATEWAY_SECRET = "test_verify_secret";
  });

  it("ينبغي رفض الطلب بكود 400 إذا كانت بيانات الدفع غير كاملة", async () => {
    const req = new NextRequest("http://localhost/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ bookingId: "b-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ينبغي رفض الطلب بكود 401 عند إرسال توقيع HMAC مزيف", async () => {
    const req = new NextRequest("http://localhost/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({
        bookingId: "b-123",
        transactionId: "tx-999",
        signature: "invalid_signature",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});