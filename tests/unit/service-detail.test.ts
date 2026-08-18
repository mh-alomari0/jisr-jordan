import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServiceDetailAction } from "@/lib/actions/service-detail";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "srv-100", title: "صيانة التكييف", price: 35, is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

describe("Service Detail Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي جلب تفاصيل الخدمة المتاحة بنجاح", async () => {
    const res = await getServiceDetailAction("11111111-1111-4111-8111-111111111111");

    expect(res.success).toBe(true);
    expect(res.service?.title).toBe("صيانة التكييف");
  });

  it("ينبغي رفض المعرفات الفارغة", async () => {
    const res = await getServiceDetailAction("");

    expect(res.success).toBe(false);
    expect(res.error).toBe("معرف الخدمة غير صالح");
  });
});
