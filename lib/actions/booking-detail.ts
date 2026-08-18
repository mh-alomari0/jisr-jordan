"use server";

import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * Get a single booking's full details for the customer who owns it.
 */
export async function getBookingDetailAction(bookingId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول", code: "UNAUTHORIZED" };

    const supabase = await createServerSupabaseClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services(id, title, price, category),
        users!bookings_provider_id_fkey(full_name, phone)
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: "الحجز غير موجود", code: "NOT_FOUND" };
    }

    // Ownership check: customer must own the booking
    if (booking.customer_id !== user.id) {
      return { success: false, error: "غير مصرح لك بعرض هذا الحجز", code: "FORBIDDEN" };
    }

    // Get payment info
    const { data: payment } = await supabase
      .from("payments")
      .select("id, amount, currency, payment_method, status")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if user already reviewed this service
    const { data: review } = await supabase
      .from("reviews")
      .select("id")
      .eq("service_id", booking.service_id)
      .eq("customer_id", user.id)
      .maybeSingle();

    return {
      success: true,
      booking,
      payment: payment || null,
      hasReviewed: !!review,
    };
  } catch (err) {
    return { success: false, error: "حدث خطأ أثناء جلب تفاصيل الحجز" };
  }
}

/**
 * Get the original booking's service for rebooking.
 */
export async function getRebookInfoAction(originalBookingId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };

    const supabase = await createServerSupabaseClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, service_id, customer_id, services(id, title, price)")
      .eq("id", originalBookingId)
      .single();

    if (!booking || booking.customer_id !== user.id) {
      return { success: false, error: "غير مصرح" };
    }

    return {
      success: true,
      serviceId: booking.service_id,
      service: booking.services,
    };
  } catch {
    return { success: false, error: "حدث خطأ" };
  }
}
