"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateStatusTransition } from "@/lib/booking-state-machine";
import { enrichBookingsWithServices } from "@/lib/booking-data";

export interface ProviderBookingItem {
  id: string;
  customer_id: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  listing_id?: string | null;
  workflow_type?: string | null;
  agreed_amount?: number | null;
  currency?: string | null;
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

    const role = profile?.role;
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "حسابك غير مسجل كمزود خدمة" };
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

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, customer_id, provider_id, service_id, listing_id, quote_id, service_title, workflow_type, delivery_type_snapshot, pricing_model_snapshot, agreed_amount, currency, booking_date, booking_time, start_time, end_time, status, notes, phone, address, payment_status, created_at, updated_at")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: "تعذر تحميل طلبات مقدم الخدمة" };
    }

    const enriched = await enrichBookingsWithServices(supabase, bookings || []);
    return { success: true, bookings: enriched as unknown as ProviderBookingItem[] };
  } catch {
    return { success: false, error: "فشل جلب طلبات المزود" };
  }
}

export async function updateProviderBookingStatusAction(
  bookingId: string,
  newStatus: "IN_PROGRESS" | "COMPLETED"
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
    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح للمستخدم بتحديث طلبات المزودين" };
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

    const { data, error } = await supabase.rpc("transition_booking_status", {
      p_booking_id: bookingId,
      p_new_status: newStatus,
    });

    if (error || !data?.success) {
      return { success: false, error: "تعذر تنفيذ الانتقال المطلوب للحجز" };
    }

    revalidatePath("/provider");
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث حالة الطلب" };
  }
}
