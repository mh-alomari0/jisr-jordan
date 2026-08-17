import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentIntentAction } from "@/lib/actions/payments";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "usr_cust_123" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "bk_100", customer_id: "usr_cust_123", services: { price: 40 } },
            error: null,
          }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "pay_1", booking_id: "bk_100", amount: 40, status: "PENDING" },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe("Payments Flow Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.PAYMENT_GATEWAY_SECRET = "test_secret_key";
  });

  it("ينبغي إنشاء إذن الدفع بنجاح مع حساب السعر من قاعدة البيانات وتوليد التوقيع", async () => {
    const res = await createPaymentIntentAction("bk_100");

    expect(res.success).toBe(true);
    expect(res.paymentIntent?.amount).toBe(40);
    expect(res.paymentIntent?.currency).toBe("JOD");
    expect(res.paymentIntent?.signature).toBeDefined();
  });
});