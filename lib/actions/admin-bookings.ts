"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/booking-state-machine";
import type { BookingStatus } from "@/lib/booking-state-machine";
import { enrichBookingsWithServices } from "@/lib/booking-data";

export interface AdminBookingItem {
  id: string;
  customer_id: string;
  provider_id?: string | null;
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

export async function getAdminBookingsAction(page = 1) {
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

    const role = profile?.role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك باستعراض كافة الحجوزات" };
    }

    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const from = (safePage - 1) * pageSize;
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, customer_id, provider_id, service_id, service_title, booking_date, booking_time, start_time, end_time, status, notes, phone, address, payment_status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize);

    if (error) {
      return { success: false, error: "تعذر تحميل الحجوزات" };
    }

    const hasMore = (bookings || []).length > pageSize;
    const pageBookings = (bookings || []).slice(0, pageSize);
    const enriched = await enrichBookingsWithServices(supabase, pageBookings);
    const customerIds = [...new Set(enriched.map((booking) => booking.customer_id).filter(Boolean))];
    const { data: customers } = customerIds.length
      ? await supabase.from("users").select("id, email, full_name").in("id", customerIds)
      : { data: [] };
    const customerMap = new Map((customers || []).map((customer) => [customer.id, customer]));
    const result = enriched.map((booking) => ({
      ...booking,
      users: customerMap.get(booking.customer_id) || null,
    }));

    return { success: true, bookings: result as unknown as AdminBookingItem[], page: safePage, hasMore };
  } catch {
    return { success: false, error: "فشل جلب قائمة الحجوزات الشاملة" };
  }
}

export async function updateAdminBookingStatusAction(
  bookingId: string,
  newStatus: BookingStatus
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

    const role = profile?.role;
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

    const { data, error } = await supabase.rpc("transition_booking_status", {
      p_booking_id: bookingId,
      p_new_status: newStatus,
    });

    if (error || !data?.success) {
      const messages: Record<string, string> = {
        INVALID_TRANSITION: "الانتقال المطلوب غير مسموح في دورة الحجز",
        PAID_BOOKING_REQUIRES_REFUND: "الحجز مدفوع ويحتاج إلى مسار استرداد قبل الإلغاء",
        FORBIDDEN: "غير مصرح بتنفيذ هذا الانتقال",
      };
      return { success: false, error: messages[data?.error] || "فشل تحديث حالة الحجز" };
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث حالة الحجز" };
  }
}
