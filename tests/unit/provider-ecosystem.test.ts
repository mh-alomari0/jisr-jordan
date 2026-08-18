import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProviderScheduleAction } from "@/lib/actions/provider-schedule";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

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
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { role: "STAFF" }, error: null }),
            }),
          }),
        };
      }
      if (table === "provider_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { is_verified: true, application_status: "APPROVED" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  }),
}));

describe("Provider Ecosystem Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي تحديث جدول عمل المزود بنجاح", async () => {
    const res = await updateProviderScheduleAction([
      { day_of_week: 1, start_time: "09:00", end_time: "17:00", is_active: true },
    ]);

    expect(res.success).toBe(true);
  });
});
