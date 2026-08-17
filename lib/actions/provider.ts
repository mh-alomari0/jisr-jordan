"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export async function updateProviderScheduleAction(formData: {
  serviceAreas: string[];
  workingHours: Record<string, boolean>;
}) {
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

    const { error } = await supabase.from("provider_profiles").upsert(
      {
        user_id: user.id,
        service_areas: formData.serviceAreas,
        working_hours: formData.workingHours,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return { success: false, error: "فشل تحديث جدول وإعدادات المزود" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء حفظ الإعدادات" };
  }
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      return { success: false, error: "فشل تحديث حالة الحجز" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء تحديث حالة الحجز" };
  }
}

export async function getProviderBookingsAction() {
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
      return { success: false, error: "غير مصرح بالوصول", bookings: [] };
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(title, price), users!customer_id(full_name, email)")
      .or(`provider_id.eq.${user.id},customer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "فشل جلب حجوزات المزود", bookings: [] };
    }

    return { success: true, bookings: bookings || [] };
  } catch {
    return { success: false, error: "حدث خطأ أثناء جلب الحجوزات", bookings: [] };
  }
}