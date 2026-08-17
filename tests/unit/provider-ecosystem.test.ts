import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProviderScheduleAction } from "@/lib/actions/provider";

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
        data: { user: { id: "usr_provider_123" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

describe("Provider Ecosystem Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي تحديث جدول عمل المزود ومناطق التغطية بنجاح", async () => {
    const res = await updateProviderScheduleAction({
      serviceAreas: ["عمان", "الزرقاء"],
      workingHours: { mon: true, fri: false },
    });

    expect(res.success).toBe(true);
  });
});