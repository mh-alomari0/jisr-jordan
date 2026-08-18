"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/booking-state-machine";

export interface ProviderBookingItem {
  id: string;
  customer_id: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  services?: {
    title?: string | null;
    price?: number | null;
  } | null;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "حسابك غير مسجل كمزود خدمة" };
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(title, price)")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, bookings: (bookings || []) as unknown as ProviderBookingItem[] };
  } catch {
    return { success: false, error: "فشل جلب طلبات المزود" };
  }
}

export async function updateProviderBookingStatusAction(
  bookingId: string,
  newStatus: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
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

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح للمستخدم بتحديث طلبات المزودين" };
    }

    // جلب حالة الحجز الحالية للتحقق من صحة الانتقال
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .eq("provider_id", user.id)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: "الحجز غير موجود أو لا ينتمي لهذا المزود" };
    }

    const transition = validateStatusTransition(booking.status, newStatus);
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("provider_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/provider");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث حالة الطلب" };
  }
}