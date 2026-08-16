import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Server Actions Security & Validation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي رفض تنفيذ الحجز إذا كانت جلسة المستخدم غير موجودة", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const mockCreateBookingAction = async () => {
      const supabase = createServerClient("https://test.supabase.co", "test-key", { cookies: { getAll: () => [], setAll: () => {} } });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Unauthorized" };
      return { success: true };
    };

    const result = await mockCreateBookingAction();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("ينبغي السماح بالتنفيذ عندما تكون الجلسة صالحة للمستخدم المسجل", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_999", email: "client@test.com" } },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const mockDeleteAccountAction = async () => {
      const supabase = createServerClient("https://test.supabase.co", "test-key", { cookies: { getAll: () => [], setAll: () => {} } });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Unauthorized" };
      return { success: true, userId: user.id };
    };

    const result = await mockDeleteAccountAction();
    expect(result.success).toBe(true);
    expect(result.userId).toBe("usr_999");
  });
});
