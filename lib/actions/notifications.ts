"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
      .select("*")
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

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
    });

    if (error) {
      return { success: false, error: "فشل إرسال الإشعار" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء إرسال الإشعار" };
  }
}