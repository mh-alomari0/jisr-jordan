import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { getAdminDashboardStatsAction } from "@/lib/actions/admin-dashboard";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Admin Dashboard Security Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي حظر المستخدمين العاديين من استعراض إحصائيات الإيرادات", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr-normal", email: "client@test.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "USER" }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServerClient>);

    const res = await getAdminDashboardStatsAction();

    expect(res.success).toBe(false);
    expect(res.error).toBe("غير مصرح لك بالوصول لإحصائيات اللوحة");
  });
});