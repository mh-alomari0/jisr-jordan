import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { getServicesAction } from "@/lib/actions/services";

// 1. محاكاة next/headers لمنع خطأ cookies()
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

// 2. محاكاة Supabase SSR
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Real Server Actions Integration & Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي جلب قائمة الخدمات المتاحة بنجاح من قاعدة البيانات عبر getServicesAction الحقيقية", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        { id: "srv_1", title: "صيانة كهرباء", price: 30, description: "خدمة صيانة شاملة" },
        { id: "srv_2", title: "سباكة منزلية", price: 20, description: "تصليح وتسريب" },
      ],
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    vi.mocked(createServerClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
          order: mockOrder,
        }),
      }),
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await getServicesAction();

    expect(result.success).toBe(true);
    expect(result.services).toHaveLength(2);
    expect(result.services?.[0].title).toBe("صيانة كهرباء");
  });

  it("ينبغي معالجة خطأ قاعدة البيانات بشكل آمن وإرجاع success = false عند فشل الاستعلام", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    });

    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    vi.mocked(createServerClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
          order: mockOrder,
        }),
      }),
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await getServicesAction();

    expect(result.success).toBe(false);
    expect(result.services).toBeUndefined();
  });
});