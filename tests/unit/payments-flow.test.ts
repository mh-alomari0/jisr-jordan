import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createPaymentIntentAction } from "@/lib/actions/payments";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const bookingId = "123e4567-e89b-42d3-a456-426614174000";

describe("Electronic payments fail-closed boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("يرفض إنشاء دفع إلكتروني للزائر", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createPaymentIntentAction(bookingId);
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("لا ينشئ سجلاً أو توقيعاً وهمياً عندما لا توجد بوابة حقيقية", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "customer-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: bookingId, customer_id: "customer-1" },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createPaymentIntentAction(bookingId);
    expect(result).toMatchObject({
      success: false,
      code: "ONLINE_PAYMENT_NOT_CONFIGURED",
    });
    expect(result).not.toHaveProperty("paymentIntent");
  });
});
