"use server";

import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Get a single booking's full details for the customer who owns it.
 */
export async function getBookingDetailAction(bookingId: string) {
  try {
    if (!z.string().uuid().safeParse(bookingId).success) {
      return { success: false, error: "معرف الحجز غير صالح", code: "NOT_FOUND" };
    }
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "يجب تسجيل الدخول", code: "UNAUTHORIZED" };

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, customer_id, provider_id, service_id, listing_id, quote_id, service_title, workflow_type, delivery_type_snapshot, pricing_model_snapshot, agreed_amount, currency, commission_rate_snapshot, commission_amount_snapshot, dispute_status, contact_revealed_at, booking_date, booking_time, start_time, end_time, status, notes, phone, address, payment_status, created_at, updated_at")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: "الحجز غير موجود", code: "NOT_FOUND" };
    }

    // Ownership check: customer must own the booking
    if (booking.customer_id !== user.id) {
      return { success: false, error: "غير مصرح لك بعرض هذا الحجز", code: "FORBIDDEN" };
    }

    const [serviceResult, listingResult, paymentResult, reviewResult, providerResult] = await Promise.all([
      booking.service_id
        ? supabase.from("services").select("id, title, price, category").eq("id", booking.service_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      booking.listing_id
        ? supabase.from("service_listings").select("id, slug, title, category_id, service_categories(name_ar)").eq("id", booking.listing_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("payments").select("id, amount, currency, payment_method, status").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("reviews").select("id").eq("booking_id", bookingId).eq("customer_id", user.id).maybeSingle(),
      booking.provider_id
        ? (booking.contact_revealed_at
          ? supabase.rpc("get_booking_provider_contact", { p_booking_id: bookingId })
          : supabase.rpc("get_public_provider_profile", { p_provider_id: booking.provider_id }))
        : Promise.resolve({ data: null, error: null }),
    ]);

    return {
      success: true,
      booking: {
        ...booking,
        services: serviceResult.data || (listingResult.data ? {
          id: listingResult.data.id,
          title: listingResult.data.title || booking.service_title,
          price: booking.agreed_amount,
          category: listingResult.data.service_categories?.[0]?.name_ar || null,
        } : { id: booking.listing_id || booking.service_id || "", title: booking.service_title, price: booking.agreed_amount, category: null }),
        listing: listingResult.data || null,
        users: providerResult.error ? null : booking.contact_revealed_at
          ? providerResult.data
          : providerResult.data ? { full_name: providerResult.data.name, phone: "" } : null,
      },
      payment: paymentResult.data || null,
      hasReviewed: !!reviewResult.data,
    };
  } catch {
    return { success: false, error: "حدث خطأ أثناء جلب تفاصيل الحجز" };
  }
}

export async function revealBookingProviderContactAction(bookingId: string) {
  if (!z.string().uuid().safeParse(bookingId).success) return { success: false as const, error: "معرف الحجز غير صالح" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const { data, error } = await supabase.rpc("get_booking_provider_contact", { p_booking_id: bookingId });
    if (error || !data) return { success: false as const, error: "بيانات التواصل متاحة بعد حجز مؤكد ومبلغ وعمولة محفوظين" };
    return { success: true as const, contact: data as { full_name: string; phone: string } };
  } catch { return { success: false as const, error: "تعذر إظهار بيانات التواصل" }; }
}

/**
 * Get the original booking's service for rebooking.
 */
export async function getRebookInfoAction(originalBookingId: string) {
  try {
    if (!z.string().uuid().safeParse(originalBookingId).success) {
      return { success: false, error: "معرف الحجز غير صالح" };
    }
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, service_id, customer_id")
      .eq("id", originalBookingId)
      .single();

    if (!booking || booking.customer_id !== user.id) {
      return { success: false, error: "غير مصرح" };
    }

    const { data: service } = await supabase
      .from("services")
      .select("id, title, price")
      .eq("id", booking.service_id)
      .maybeSingle();

    return {
      success: true,
      serviceId: booking.service_id,
      service,
    };
  } catch {
    return { success: false, error: "حدث خطأ" };
  }
}
