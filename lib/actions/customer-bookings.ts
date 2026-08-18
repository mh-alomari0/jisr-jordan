"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CANCELLABLE_STATUSES, validateStatusTransition } from "@/lib/booking-state-machine";

export async function getCustomerBookingsAction() {
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
      return { success: false, error: "يجب تسجيل الدخول لعرض الحجوزات" };
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(title, price)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, bookings };
  } catch {
    return { success: false, error: "حدث خطأ أثناء جلب الحجوزات" };
  }
}

export async function cancelCustomerBookingAction(bookingId: string) {
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

    // جلب حالة الحجز الحالية للتحقق من صحة الإلغاء
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: "الحجز غير موجود أو لا ينتمي إليك" };
    }

    const transition = validateStatusTransition(booking.status, "CANCELLED");
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .in("status", CANCELLABLE_STATUSES);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/bookings");
    return { success: true };
  } catch {
    return { success: false, error: "فشل إلغاء الحجز" };
  }
}