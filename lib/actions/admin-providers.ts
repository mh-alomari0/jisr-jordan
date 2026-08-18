"use server";

import { createServerSupabaseClient, getAuthenticatedUser, getUserRole, isAdminRole } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

export interface AdminProvider {
  id: string;
  user_id: string;
  bio: string | null;
  service_areas: string[] | null;
  experience: string | null;
  application_status: string;
  is_verified: boolean;
  applied_at: string | null;
  application_notes: string | null;
  created_at: string;
  users: { id: string; email: string; full_name: string; phone: string | null; role: string } | null;
  provider_services: { service_id: string; services: { id: string; title: string } | null }[] | null;
}

/**
 * List all provider applications/profiles for admin.
 */
export async function getAdminProvidersAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, user.id))) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const { data: profiles, error } = await supabase
      .from("provider_profiles")
      .select("id, user_id, bio, experience, service_areas, is_verified, application_status, application_notes, applied_at, created_at, users(id, email, full_name, phone, role), provider_services(service_id, services(id, title))")
      .order("applied_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      logger.error("Failed to fetch admin providers", { context: "AdminProviders", error });
      return { success: false, error: "تعذر تحميل قائمة مقدمي الخدمة" };
    }

    const normalized = (profiles || []).map((profile) => ({
      ...profile,
      users: Array.isArray(profile.users) ? profile.users[0] || null : profile.users,
      provider_services: (profile.provider_services || []).map((providerService) => ({
        ...providerService,
        services: Array.isArray(providerService.services)
          ? providerService.services[0] || null
          : providerService.services,
      })),
    })) as unknown as AdminProvider[];
    return { success: true, providers: normalized };
  } catch (err) {
    unstable_rethrow(err);
    logger.error("Admin providers error", { context: "AdminProviders", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Approve a provider application.
 * Sets application_status = APPROVED, is_verified = true, user role = STAFF.
 */
export async function approveProviderAction(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await getAuthenticatedUser(supabase);
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, admin.id))) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const { data, error } = await supabase.rpc("review_provider_application", {
      p_provider_id: userId,
      p_actor_id: admin.id,
      p_decision: "APPROVE",
      p_reason: null,
    });

    if (error || !data?.success) {
      logger.error("Failed to approve provider", { context: "AdminProviders", error });
      return { success: false, error: "فشل اعتماد مزود الخدمة" };
    }

    // Notify the provider
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "تم اعتمادك كمقدم خدمة",
      message: "تهانينا، تم اعتماد طلبك. يمكنك الآن استخدام بوابة مقدمي الخدمة وإدارة مواعيدك.",
      type: "SUCCESS",
    });

    logger.info("Provider approved", {
      context: "AdminProviders",
      metadata: { providerId: userId, approvedBy: admin.id },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (err) {
    logger.error("Approve provider error", { context: "AdminProviders", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Reject a provider application.
 */
export async function rejectProviderAction(userId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await getAuthenticatedUser(supabase);
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, admin.id))) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const normalizedReason = reason.trim().slice(0, 500);
    const { data, error } = await supabase.rpc("review_provider_application", {
      p_provider_id: userId,
      p_actor_id: admin.id,
      p_decision: "REJECT",
      p_reason: normalizedReason || null,
    });

    if (error || !data?.success) return { success: false, error: "فشل رفض الطلب" };

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "تحديث طلب الانضمام كمقدم خدمة",
      message: normalizedReason
        ? `تعذر اعتماد طلبك حاليًا. السبب: ${normalizedReason}`
        : "تعذر اعتماد طلبك حاليًا. يمكنك تحديث بياناتك وإعادة التقديم.",
      type: "WARNING",
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (err) {
    logger.error("Reject provider error", { context: "AdminProviders", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Suspend an approved provider.
 */
export async function suspendProviderAction(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await getAuthenticatedUser(supabase);
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, admin.id))) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const { data, error } = await supabase.rpc("review_provider_application", {
      p_provider_id: userId,
      p_actor_id: admin.id,
      p_decision: "SUSPEND",
      p_reason: null,
    });

    if (error || !data?.success) return { success: false, error: "فشل إيقاف مزود الخدمة" };

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (err) {
    logger.error("Suspend provider error", { context: "AdminProviders", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Assign a verified provider to a booking.
 */
export async function assignProviderToBookingAction(bookingId: string, providerId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await getAuthenticatedUser(supabase);
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, admin.id))) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const { data, error } = await supabase.rpc("assign_provider_to_booking", {
      p_booking_id: bookingId,
      p_provider_id: providerId,
      p_assigned_by: admin.id,
    });

    if (error) {
      logger.error("Assignment RPC failed", { context: "ProviderAssignment", error });
      return { success: false, error: "فشل تعيين مزود الخدمة" };
    }

    if (data && !data.success) {
      const errorMap: Record<string, string> = {
        BOOKING_NOT_FOUND: "الحجز غير موجود",
        INVALID_STATUS: "حالة الحجز لا تسمح بالتعيين",
        PROVIDER_NOT_FOUND: "مزود الخدمة غير موجود",
        PROVIDER_NOT_VERIFIED: "مزود الخدمة غير معتمد",
        PROVIDER_NOT_ELIGIBLE: "مزود الخدمة لا يقدم الخدمة المطلوبة",
        PROVIDER_UNAVAILABLE: "مزود الخدمة غير متاح في هذا الموعد",
        SCHEDULE_CONFLICT: "تعارض في المواعيد — مزود الخدمة لديه حجز متقاطع",
      };
      return { success: false, error: errorMap[data.error] || data.error };
    }

    // Notify provider of new assignment
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_date, start_time, address, service_title")
      .eq("id", bookingId)
      .single();

    await supabase.from("notifications").insert({
      user_id: providerId,
      title: `تم تعيين حجز جديد لك #${bookingId.slice(0, 8)}`,
      message: `خدمة ${booking?.service_title || "منزلية"} بتاريخ ${booking?.booking_date || "غير محدد"} في ${booking?.start_time || "وقت غير محدد"}.`,
      type: "BOOKING",
    });

    logger.info("Provider assigned to booking", {
      context: "ProviderAssignment",
      metadata: { bookingId, providerId, assignedBy: admin.id },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/provider");
    return { success: true };
  } catch (err) {
    logger.error("Assign provider error", { context: "ProviderAssignment", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Get eligible providers for a specific booking (for admin assignment UI).
 */
export async function getEligibleProvidersForBookingAction(bookingId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "غير مصرح" };
    if (!isAdminRole(await getUserRole(supabase, user.id))) return { success: false, error: "غير مصرح" };

    // Get the booking's service and date
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, service_id, booking_date, start_time, end_time, status")
      .eq("id", bookingId)
      .single();

    if (!booking) return { success: false, error: "الحجز غير موجود" };
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return { success: false, error: "الحجز ليس في حالة تسمح بالتعيين" };
    }

    // Find verified providers who offer this service
    const { data: providers } = await supabase
      .from("provider_services")
      .select("provider_id, provider_profiles(user_id, is_verified, application_status, bio), users(full_name, phone)")
      .eq("service_id", booking.service_id)
      .eq("is_active", true);

    const eligible = (providers || []).filter((p) => {
      const prof = Array.isArray(p.provider_profiles)
        ? p.provider_profiles[0]
        : p.provider_profiles;
      return prof && prof.is_verified && prof.application_status === "APPROVED";
    }).map((provider) => {
      const profile = Array.isArray(provider.provider_profiles)
        ? provider.provider_profiles[0] || null
        : provider.provider_profiles;
      const providerUser = Array.isArray(provider.users)
        ? provider.users[0] || null
        : provider.users;
      return {
        providerId: provider.provider_id,
        fullName: providerUser?.full_name || "مقدم خدمة",
        phone: providerUser?.phone || null,
        bio: profile?.bio || null,
      };
    });

    return { success: true, providers: eligible, booking };
  } catch (err) {
    logger.error("Get eligible providers error", { context: "ProviderAssignment", error: err });
    return { success: false, error: "حدث خطأ" };
  }
}
