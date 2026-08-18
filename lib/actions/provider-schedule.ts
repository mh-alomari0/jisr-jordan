"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface ScheduleSlot {
  day_of_week: number; // 0: الأحد, 1: الإثنين ... 6: السبت
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
  is_active: boolean;
}

export async function updateProviderScheduleAction(slots: ScheduleSlot[]) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    // التحقق من أن المستخدم مزود خدمة / موظف / مسؤول
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بتعديل جدول المواعيد" };
    }

    const payload = slots.map((slot) => ({
      provider_id: user.id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_active: slot.is_active,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("provider_schedules")
      .upsert(payload, { onConflict: "provider_id,day_of_week" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/provider/schedule");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث جدول المواعيد" };
  }
}

export async function getProviderScheduleAction() {
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    // التحقق من أن المستخدم مزود خدمة / موظف / مسؤول
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بالوصول لجدول المواعيد" };
    }

    const { data: schedule, error } = await supabase
      .from("provider_schedules")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("provider_id", user.id)
      .order("day_of_week", { ascending: true });

    if (error) {
      return { success: true, schedule: [] };
    }

    return { success: true, schedule: (schedule || []) as unknown as ScheduleSlot[] };
  } catch {
    return { success: false, error: "فشل جلب جدول المواعيد" };
  }
}