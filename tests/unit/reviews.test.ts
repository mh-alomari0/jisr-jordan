import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { submitServiceReviewAction } from "@/lib/actions/reviews";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Service Reviews Security Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي حظر الزوار غير المسجلين من إرسال تقييمات", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const res = await submitServiceReviewAction("11111111-1111-4111-8111-111111111111", 5, "ممتاز جداً", "33333333-3333-4333-8333-333333333333");

    expect(res.success).toBe(false);
    expect(res.error).toBe("يجب تسجيل الدخول لإضافة تقييم");
  });

  it("ينبغي رفض التقييمات خارج النطاق المسموح (أقل من 1 أو أكبر من 5)", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "22222222-2222-4222-8222-222222222222" } }, error: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const res = await submitServiceReviewAction("11111111-1111-4111-8111-111111111111", 10, "ممتاز جداً", "33333333-3333-4333-8333-333333333333");

    expect(res.success).toBe(false);
    expect(res.error).toBe("يرجى تحديد تقييم صحيح بين 1 و 5 نجوم");
  });
});
