"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validateStatusTransition } from "@/lib/booking-state-machine";

export type { BookingStatus } from "@/lib/booking-state-machine";
import type { BookingStatus } from "@/lib/booking-state-machine";

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

    // التحقق من أن المستخدم هو مزود الخدمة المعين لهذا الحجز
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, provider_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: "الحجز غير موجود" };
    }

    if (booking.provider_id !== user.id) {
      return { success: false, error: "غير مصرح لك بتحديث حالة هذا الحجز" };
    }

    // التحقق من صحة انتقال حالة الحجز
    const transition = validateStatusTransition(booking.status, status);
    if (!transition.valid) {
      return { success: false, error: transition.error };
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("provider_id", user.id);

    if (error) {
      return { success: false, error: "فشل تحديث حالة الحجز" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء تحديث حالة الحجز" };
  }
}
