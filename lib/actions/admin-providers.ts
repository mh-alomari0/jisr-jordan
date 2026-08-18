"use server";

import { createAdminSupabaseClient, getAuthenticatedUser, isAdminRole } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { notificationService } from "@/lib/notifications";

/**
 * List all provider applications/profiles for admin.
 */
export async function getAdminProvidersAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const adminClient = createAdminSupabaseClient();

    const { data: profiles, error } = await adminClient
      .from("provider_profiles")
      .select("*, users(id, email, full_name, phone, role), provider_services(service_id, services(id, title))")
      .order("applied_at", { ascending: false, nullsFirst: false });

    if (error) {
      logger.error("Failed to fetch admin providers", { context: "AdminProviders", error });
      return { success: false, error: "تعذر تحميل قائمة مقدمي الخدمة" };
    }

    return { success: true, providers: profiles || [] };
  } catch (err) {
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
    const admin = await getAuthenticatedUser();
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const adminClient = createAdminSupabaseClient();

    // Verify the provider exists and is pending
    const { data: profile } = await adminClient
      .from("provider_profiles")
      .select("id, application_status, user_id")
      .eq("user_id", userId)
      .single();

    if (!profile) return { success: false, error: "مزود الخدمة غير موجود" };
    if (profile.application_status === "APPROVED") return { success: false, error: "تم اعتماده بالفعل" };

    // Approve the provider
    const { error: updateError } = await adminClient
      .from("provider_profiles")
      .update({
        application_status: "APPROVED",
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      logger.error("Failed to approve provider", { context: "AdminProviders", error: updateError });
      return { success: false, error: "فشل اعتماد مزود الخدمة" };
    }

    // Update user role to STAFF
    await adminClient
      .from("users")
      .update({ role: "STAFF" })
      .eq("id", userId);

    // Audit log
    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "PROVIDER_APPROVED",
      entity_type: "provider_profile",
      entity_id: profile.id,
      metadata: { provider_user_id: userId, approved_by: admin.id },
    });

    // Notify the provider
    notificationService.dispatch({
      recipient: { userId },
      event: "PROVIDER_APPROVED",
      details: {},
      channels: ["IN_APP"],
    }).catch(() => {});

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
    const admin = await getAuthenticatedUser();
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const adminClient = createAdminSupabaseClient();

    const { error } = await adminClient
      .from("provider_profiles")
      .update({
        application_status: "REJECTED",
        application_notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) return { success: false, error: "فشل رفض الطلب" };

    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "PROVIDER_REJECTED",
      entity_type: "provider_profile",
      entity_id: userId,
      metadata: { provider_user_id: userId, rejected_by: admin.id, reason },
    });

    notificationService.dispatch({
      recipient: { userId },
      event: "PROVIDER_REJECTED",
      details: { reason },
      channels: ["IN_APP"],
    }).catch(() => {});

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
    const admin = await getAuthenticatedUser();
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const adminClient = createAdminSupabaseClient();

    await adminClient
      .from("provider_profiles")
      .update({
        application_status: "SUSPENDED",
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await adminClient.from("audit_logs").insert({
      actor_id: admin.id,
      action: "PROVIDER_SUSPENDED",
      entity_type: "provider_profile",
      entity_id: userId,
      metadata: { provider_user_id: userId, suspended_by: admin.id },
    });

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
    const admin = await getAuthenticatedUser();
    if (!admin) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const adminClient = createAdminSupabaseClient();

    const { data, error } = await adminClient.rpc("assign_provider_to_booking", {
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
        SCHEDULE_CONFLICT: "تعارض في المواعيد — مزود الخدمة لديه حجز متقاطع",
      };
      return { success: false, error: errorMap[data.error] || data.error };
    }

    // Notify provider of new assignment
    const { data: booking } = await adminClient
      .from("bookings")
      .select("id, booking_date, start_time, services(title)")
      .eq("id", bookingId)
      .single();

    notificationService.dispatch({
      recipient: { userId: providerId },
      event: "BOOKING_ASSIGNED",
      details: {
        bookingId,
        bookingDate: booking?.booking_date,
        startTime: booking?.start_time,
        serviceTitle: (booking?.services as { title: string } | null)?.title || "",
      },
      channels: ["IN_APP"],
    }).catch(() => {});

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
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح" };

    const adminClient = createAdminSupabaseClient();

    // Get the booking's service and date
    const { data: booking } = await adminClient
      .from("bookings")
      .select("id, service_id, booking_date, start_time, end_time, status")
      .eq("id", bookingId)
      .single();

    if (!booking) return { success: false, error: "الحجز غير موجود" };
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return { success: false, error: "الحجز ليس في حالة تسمح بالتعيين" };
    }

    // Find verified providers who offer this service
    const { data: providers } = await adminClient
      .from("provider_services")
      .select("provider_id, provider_profiles(user_id, is_verified, application_status, bio), users(full_name, phone)")
      .eq("service_id", booking.service_id)
      .eq("is_active", true);

    const eligible = (providers || []).filter((p: {
      provider_profiles: { is_verified: boolean; application_status: string } | null;
    }) => {
      const prof = p.provider_profiles;
      return prof && prof.is_verified && prof.application_status === "APPROVED";
    });

    return { success: true, providers: eligible, booking };
  } catch (err) {
    logger.error("Get eligible providers error", { context: "ProviderAssignment", error: err });
    return { success: false, error: "حدث خطأ" };
  }
}
