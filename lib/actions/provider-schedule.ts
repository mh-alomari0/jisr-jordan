"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

    const role = profile?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بتعديل جدول المواعيد" };
    }

    if (role === "STAFF") {
      const { data: providerProfile } = await supabase
        .from("provider_profiles")
        .select("is_verified, application_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!providerProfile?.is_verified || providerProfile.application_status !== "APPROVED") {
        return { success: false, error: "حساب مقدم الخدمة غير معتمد أو موقوف" };
      }
    }

    const parsedSlots = ScheduleSchema.safeParse(slots);
    if (!parsedSlots.success) {
      return { success: false, error: parsedSlots.error.issues[0]?.message || "جدول المواعيد غير صالح" };
    }

    const payload = parsedSlots.data.map((slot) => ({
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
      return { success: false, error: "تعذر حفظ جدول المواعيد" };
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

    const role = profile?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بالوصول لجدول المواعيد" };
    }

    if (role === "STAFF") {
      const { data: providerProfile } = await supabase
        .from("provider_profiles")
        .select("is_verified, application_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!providerProfile?.is_verified || providerProfile.application_status !== "APPROVED") {
        return { success: false, error: "حساب مقدم الخدمة غير معتمد أو موقوف" };
      }
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

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "وقت غير صالح");
const ScheduleSchema = z.array(z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: TimeSchema,
  end_time: TimeSchema,
  is_active: z.boolean(),
})).max(7).superRefine((slots, context) => {
  const days = new Set<number>();
  slots.forEach((slot, index) => {
    if (days.has(slot.day_of_week)) {
      context.addIssue({ code: "custom", path: [index, "day_of_week"], message: "لا يمكن تكرار اليوم" });
    }
    days.add(slot.day_of_week);
    if (slot.start_time >= slot.end_time) {
      context.addIssue({ code: "custom", path: [index, "end_time"], message: "وقت الانتهاء يجب أن يلي وقت البدء" });
    }
  });
});
