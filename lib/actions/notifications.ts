"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "BOOKING" | "PAYMENT";
  is_read: boolean;
  created_at: string;
}

export async function getUserNotificationsAction(): Promise<{
  success: boolean;
  error?: string;
  notifications: NotificationItem[];
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح بالوصول", notifications: [] };
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, type, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, error: "فشل جلب الإشعارات", notifications: [] };
    }

    return { success: true, notifications: (notifications as NotificationItem[]) || [] };
  } catch {
    return { success: false, error: "حدث خطأ أثناء جلب الإشعارات", notifications: [] };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    if (!z.string().uuid().safeParse(notificationId).success) {
      return { success: false, error: "معرف الإشعار غير صالح" };
    }
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "فشل تحديث حالة الإشعار" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء تحديث حالة الإشعار" };
  }
}

export async function sendSystemNotificationAction(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "BOOKING" | "PAYMENT" = "INFO"
) {
  try {
    const input = z.object({
      userId: z.string().uuid(),
      title: z.string().trim().min(1).max(120),
      message: z.string().trim().min(1).max(1000),
      type: z.enum(["INFO", "SUCCESS", "WARNING", "BOOKING", "PAYMENT"]),
    }).safeParse({ userId, title, message, type });
    if (!input.success) return { success: false, error: "بيانات الإشعار غير صالحة" };
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // التحقق من هوية المستخدم وصلاحياته (فقط المسؤولين يمكنهم إرسال إشعارات نظامية)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (!role || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return { success: false, error: "غير مصرح: هذه العملية مخصصة للمسؤولين فقط" };
    }

    const rateLimit = await checkRateLimit(`notification:system:${user.id}`, { limit: 20, windowMs: 60_000 });
    if (!rateLimit.success) return { success: false, error: rateLimit.error };

    const { error } = await supabase.from("notifications").insert({
      user_id: input.data.userId,
      title: input.data.title,
      message: input.data.message,
      type: input.data.type,
    });

    if (error) {
      return { success: false, error: "فشل إرسال الإشعار" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء إرسال الإشعار" };
  }
}
