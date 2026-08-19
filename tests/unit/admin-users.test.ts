import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { getAdminUsersAction, updateUserRoleAction } from "@/lib/actions/admin-users";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Admin Users Security Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي حظر المستخدمين العاديين من استعراض قائمة المستخدمين", async () => {
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

    const res = await getAdminUsersAction();

    expect(res.success).toBe(false);
    expect(res.error).toBe("غير مصرح لك بإدارة المستخدمين");
  });

  it("يرفض تعيين STAFF مباشرة لأن الاعتماد يمر عبر دورة مقدمي الخدمة", async () => {
    const res = await updateUserRoleAction("11111111-1111-4111-8111-111111111111", "STAFF" as never);
    expect(res.success).toBe(false);
    expect(res.error).toBe("بيانات تعديل الصلاحية غير صالحة");
  });

  it("يمنع ADMIN من تنفيذ RPC المخصص للمسؤول الأعلى", async () => {
    const rpc = vi.fn();
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role: "ADMIN" } }) }) }) }),
      rpc,
    } as unknown as ReturnType<typeof createServerClient>);
    const res = await updateUserRoleAction("11111111-1111-4111-8111-111111111111", "ADMIN");
    expect(res.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("يمرر تغيير CUSTOMER/ADMIN المصرح إلى RPC المحمي فقط", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "super-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role: "SUPER_ADMIN" } }) }) }) }),
      rpc,
    } as unknown as ReturnType<typeof createServerClient>);
    const target = "11111111-1111-4111-8111-111111111111";
    const res = await updateUserRoleAction(target, "ADMIN");
    expect(res.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("set_user_role_by_super_admin", { p_target_id: target, p_new_role: "ADMIN" });
  });
});
