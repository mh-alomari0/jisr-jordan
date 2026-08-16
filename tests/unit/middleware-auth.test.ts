import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// محاكاة حزمة Supabase SSR بالكامل
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("Real Auth Guard & Middleware Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي تحويل الزائر غير المسجل تلقائياً إلى /login عند فتح مسار محمي مثل /admin", async () => {
    // محاكاة زائر غير مسجل (User = null)
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new NextRequest("http://localhost:3000/admin");
    const res = await updateSession(req);

    // التحقق من إرجاع استجابة تحويل (Redirect) وتضمين رابط اللوجن والمسار المستهدف
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirectTo=%2Fadmin");
  });

  it("ينبغي السماح للزائر بزيارة المسارات العامة مثل /services بدون أي إعادة توجيه", async () => {
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new NextRequest("http://localhost:3000/services");
    const res = await updateSession(req);

    // عدم إرجاع رابط تحويل والسماح بمرور الطلب كالمعتاد
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("ينبغي منع المستخدم العادي (USER) من دخول /admin وإعادته للصفحة الرئيسية", async () => {
    // محاكاة مستخدم مسجل دخول لكن بدور USER عادي في قاعدة البيانات
    (createServerClient as any).mockReturnValue({
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
    });

    const req = new NextRequest("http://localhost:3000/admin");
    const res = await updateSession(req);

    // التحقق من طرد المستخدم للرئيسية
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("ينبغي السماح للأدمن (ADMIN) بالمرور والوصول لوحة التحكم /admin بنجاح", async () => {
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@test.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "ADMIN" }, error: null }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost:3000/admin");
    const res = await updateSession(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});