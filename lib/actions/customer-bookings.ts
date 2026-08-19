"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/booking-state-machine";
import { enrichBookingsWithServices } from "@/lib/booking-data";

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
      .select("id, customer_id, provider_id, service_id, listing_id, quote_id, service_title, workflow_type, delivery_type_snapshot, pricing_model_snapshot, agreed_amount, currency, booking_date, booking_time, start_time, end_time, status, notes, phone, address, payment_status, created_at, updated_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: "تعذر تحميل الحجوزات حالياً" };
    }

    return {
      success: true,
      bookings: await enrichBookingsWithServices(supabase, bookings || []),
    };
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

    const { data, error } = await supabase.rpc("transition_booking_status", {
      p_booking_id: bookingId,
      p_new_status: "CANCELLED",
    });

    if (error || !data?.success) {
      const message = error?.message?.includes("CANCELLATION_REQUIRES_ADMIN_REVIEW")
        ? "بعد إظهار بيانات التواصل، يحتاج الإلغاء إلى مراجعة الإدارة لحماية حقوق الطرفين والعمولة"
        : data?.error === "PAID_BOOKING_REQUIRES_REFUND"
          ? "لا يمكن إلغاء حجز مدفوع تلقائياً؛ تواصل مع الدعم لإجراء الاسترداد"
          : "تعذر إلغاء الحجز في حالته الحالية";
      return { success: false, error: message };
    }

    revalidatePath("/bookings");
    return { success: true };
  } catch {
    return { success: false, error: "فشل إلغاء الحجز" };
  }
}
