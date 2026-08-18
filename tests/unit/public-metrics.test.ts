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
    rpc: vi.fn().mockResolvedValue({
      data: {
        completedBookingsCount: 12,
        activeServicesCount: 8,
        activeProvidersCount: 4,
      },
      error: null,
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
