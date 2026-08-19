import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  sendSystemNotificationAction,
} from "@/lib/actions/notifications";

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
        data: { user: { id: "usr_notify_123" } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "ADMIN" },
                error: null,
              }),
            }),
          }),
        };
      }
      // notifications table
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: "nt_1", title: "تم تأكيد الحجز", is_read: false },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  }),
}));

describe("Notifications System Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي جلب إشعارات المستخدم بنجاح", async () => {
    const res = await getUserNotificationsAction();
    expect(res.success).toBe(true);
    expect(res.notifications).toHaveLength(1);
  });

  it("ينبغي تحديث حالة الإشعار إلى مقروء بنجاح", async () => {
    const res = await markNotificationAsReadAction("11111111-1111-4111-8111-111111111111");
    expect(res.success).toBe(true);
  });

  it("ينبغي إرسال إشعار جديد للنظام بنجاح", async () => {
    const res = await sendSystemNotificationAction(
      "22222222-2222-4222-8222-222222222222",
      "تأكيد حجز",
      "تم تأكيد حجزك بنجاح",
      "BOOKING"
    );
    expect(res.success).toBe(true);
  });
});
