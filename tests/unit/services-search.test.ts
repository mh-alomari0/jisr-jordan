import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchServicesAction } from "@/lib/actions/services-search";

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
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { id: "srv-1", title: "صيانة كهرباء", price: 25, is_active: true },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

describe("Services Search & Filter Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي إرجاع قائمة الخدمات المتاحة بنجاح", async () => {
    const res = await searchServicesAction();

    expect(res.success).toBe(true);
    expect(res.services).toBeDefined();
    expect(res.services?.length).toBeGreaterThan(0);
  });
});
