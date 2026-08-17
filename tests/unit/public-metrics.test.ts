import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicMetricsAction } from "@/lib/actions/public-metrics";

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
        eq: vi.fn().mockResolvedValue({ count: 12, error: null }),
        in: vi.fn().mockResolvedValue({ count: 4, error: null }),
      }),
    }),
  }),
}));

describe("Public System Metrics Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي جلب إحصائيات النظام العامة بنجاح وإرجاع قيم رقمية سليمة", async () => {
    const res = await getPublicMetricsAction();

    expect(res.success).toBe(true);
    expect(res.metrics).toBeDefined();
    expect(typeof res.metrics.completedBookingsCount).toBe("number");
  });
});