import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createServiceAction } from "@/lib/actions/admin-services";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Admin Services Actions Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي رفض إضافة خدمة جديدة إذا لم يكن المستخدم أدمن", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@test.com" } },
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

    const res = await createServiceAction({
      title: "خدمة جديدة",
      description: "وصف",
      price: 50,
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("غير مصرح لك بإضافة خدمات جديدة");
  });
});