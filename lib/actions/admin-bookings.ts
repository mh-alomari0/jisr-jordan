"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/booking-state-machine";

export interface AdminBookingItem {
  id: string;
  customer_id: string;
  status: string;
  payment_status?: string | null;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  created_at?: string | null;
  services?: {
    title?: string | null;
    price?: number | null;
  } | null;
  users?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
}

export async function getAdminBookingsAction() {
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
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك باستعراض كافة الحجوزات" };
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(title, price), users!customer_id(email, full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, bookings: (bookings || []) as unknown as AdminBookingItem[] };
  } catch {
    return { success: false, error: "فشل جلب قائمة الحجوزات الشاملة" };
  }
}

export async function updateAdminBookingStatusAction(
  bookingId: string,
  newStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
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
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بتحديث حالة الحجوزات" };
    }

    // جلب حالة الحجز الحالية للتحقق من صحة الانتقال
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: "الحجز غير موجود" };
    }

    const transition = validateStatusTransition(booking.status, newStatus);
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث حالة الحجز" };
  }
}