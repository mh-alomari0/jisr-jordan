"use server";

import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserRole,
  isAdminRole,
} from "@/lib/supabase/server";
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
  users: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
  } | null;
  provider_services: {
    service_id: string;
    services: {
      id: string;
      title: string;
    } | null;
  }[];
}

/**
 * List all provider applications/profiles for admin.
 */
export async function getAdminProvidersAction(page = 1) {
  try {
    const supabase = await createServerSupabaseClient();

    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, user.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const from = (safePage - 1) * pageSize;

    /*
     * Important:
     * provider_profiles and provider_services do NOT have a direct FK.
     *
     * provider_profiles.user_id -> users.id
     * provider_services.provider_id -> users.id
     *
     * Therefore they must NOT be embedded directly in one PostgREST query.
     */

    const { data: profiles, error: profilesError } = await supabase
      .from("provider_profiles")
      .select(`
        id,
        user_id,
        bio,
        experience,
        service_areas,
        is_verified,
        application_status,
        application_notes,
        applied_at,
        created_at,
        users (
          id,
          email,
          full_name,
          phone,
          role
        )
      `)
      .order("applied_at", {
        ascending: false,
        nullsFirst: false,
      })
      .range(from, from + pageSize);

    if (profilesError) {
      logger.error("Failed to fetch admin provider profiles", {
        context: "AdminProviders",
        error: profilesError,
      });

      return {
        success: false,
        error: "تعذر تحميل قائمة مقدمي الخدمة",
      };
    }

    const rawProfiles = profiles || [];
    const hasMore = rawProfiles.length > pageSize;
    const visibleProfiles = rawProfiles.slice(0, pageSize);

    const providerIds = visibleProfiles.map((profile) => profile.user_id);

    type ProviderServiceRow = {
      provider_id: string;
      service_id: string;
      services:
        | {
            id: string;
            title: string;
          }
        | {
            id: string;
            title: string;
          }[]
        | null;
    };

    let providerServices: ProviderServiceRow[] = [];

    if (providerIds.length > 0) {
      const { data, error: servicesError } = await supabase
        .from("provider_services")
        .select(`
          provider_id,
          service_id,
          services (
            id,
            title
          )
        `)
        .in("provider_id", providerIds);

      if (servicesError) {
        logger.error("Failed to fetch provider services", {
          context: "AdminProviders",
          error: servicesError,
        });

        return {
          success: false,
          error: "تعذر تحميل خدمات مقدمي الخدمة",
        };
      }

      providerServices = (data || []) as ProviderServiceRow[];
    }

    const servicesByProvider = new Map<
      string,
      {
        service_id: string;
        services: {
          id: string;
          title: string;
        } | null;
      }[]
    >();

    for (const row of providerServices) {
      const current = servicesByProvider.get(row.provider_id) || [];

      const service = Array.isArray(row.services)
        ? row.services[0] || null
        : row.services;

      current.push({
        service_id: row.service_id,
        services: service,
      });

      servicesByProvider.set(row.provider_id, current);
    }

    const normalized = visibleProfiles.map((profile) => ({
      ...profile,

      users: Array.isArray(profile.users)
        ? profile.users[0] || null
        : profile.users,

      provider_services:
        servicesByProvider.get(profile.user_id) || [],
    })) as AdminProvider[];

    return {
      success: true,
      providers: normalized,
      page: safePage,
      hasMore,
    };
  } catch (err) {
    unstable_rethrow(err);

    logger.error("Admin providers error", {
      context: "AdminProviders",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Approve a provider application.
 * Sets application_status = APPROVED,
 * is_verified = true,
 * user role = STAFF.
 */
export async function approveProviderAction(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const admin = await getAuthenticatedUser(supabase);

    if (!admin) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, admin.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const { data, error } = await supabase.rpc(
      "review_provider_application",
      {
        p_provider_id: userId,
        p_actor_id: admin.id,
        p_decision: "APPROVE",
        p_reason: null,
      }
    );

    if (error || !data?.success) {
      logger.error("Failed to approve provider", {
        context: "AdminProviders",
        error,
      });

      return {
        success: false,
        error:
          data?.error === "INVALID_STATUS"
            ? "الطلب لم يعد في حالة تسمح بالاعتماد"
            : "فشل اعتماد مزود الخدمة",
      };
    }

    logger.info("Provider approved", {
      context: "AdminProviders",
      metadata: {
        providerId: userId,
        approvedBy: admin.id,
      },
    });

    revalidatePath("/admin/providers");

    return {
      success: true,
    };
  } catch (err) {
    logger.error("Approve provider error", {
      context: "AdminProviders",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Reject a provider application.
 */
export async function rejectProviderAction(
  userId: string,
  reason: string
) {
  try {
    const supabase = await createServerSupabaseClient();

    const admin = await getAuthenticatedUser(supabase);

    if (!admin) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, admin.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const normalizedReason = reason.trim().slice(0, 500);

    const { data, error } = await supabase.rpc(
      "review_provider_application",
      {
        p_provider_id: userId,
        p_actor_id: admin.id,
        p_decision: "REJECT",
        p_reason: normalizedReason || null,
      }
    );

    if (error || !data?.success) {
      logger.error("Failed to reject provider", {
        context: "AdminProviders",
        error,
      });

      return {
        success: false,
        error:
          data?.error === "INVALID_STATUS"
            ? "الطلب لم يعد قيد المراجعة"
            : "فشل رفض الطلب",
      };
    }

    revalidatePath("/admin/providers");

    return {
      success: true,
    };
  } catch (err) {
    logger.error("Reject provider error", {
      context: "AdminProviders",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Suspend an approved provider.
 */
export async function suspendProviderAction(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const admin = await getAuthenticatedUser(supabase);

    if (!admin) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, admin.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const { data, error } = await supabase.rpc(
      "review_provider_application",
      {
        p_provider_id: userId,
        p_actor_id: admin.id,
        p_decision: "SUSPEND",
        p_reason: null,
      }
    );

    if (error || !data?.success) {
      logger.error("Failed to suspend provider", {
        context: "AdminProviders",
        error,
      });

      return {
        success: false,
        error:
          data?.error === "INVALID_STATUS"
            ? "مقدم الخدمة غير معتمد أو موقوف بالفعل"
            : "فشل إيقاف مزود الخدمة",
      };
    }

    revalidatePath("/admin/providers");

    return {
      success: true,
    };
  } catch (err) {
    logger.error("Suspend provider error", {
      context: "AdminProviders",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Assign a verified provider to a booking.
 */
export async function assignProviderToBookingAction(
  bookingId: string,
  providerId: string
) {
  try {
    const supabase = await createServerSupabaseClient();

    const admin = await getAuthenticatedUser(supabase);

    if (!admin) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, admin.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const { data, error } = await supabase.rpc(
      "assign_provider_to_booking",
      {
        p_booking_id: bookingId,
        p_provider_id: providerId,
        p_assigned_by: admin.id,
      }
    );

    if (error) {
      logger.error("Assignment RPC failed", {
        context: "ProviderAssignment",
        error,
      });

      return {
        success: false,
        error: "فشل تعيين مزود الخدمة",
      };
    }

    if (data && !data.success) {
      const errorMap: Record<string, string> = {
        BOOKING_NOT_FOUND: "الحجز غير موجود",
        INVALID_STATUS: "حالة الحجز لا تسمح بالتعيين",
        PROVIDER_NOT_FOUND: "مزود الخدمة غير موجود",
        PROVIDER_NOT_VERIFIED: "مزود الخدمة غير معتمد",
        PROVIDER_NOT_ELIGIBLE:
          "مزود الخدمة لا يقدم الخدمة المطلوبة",
        PROVIDER_UNAVAILABLE:
          "مزود الخدمة غير متاح في هذا الموعد",
        SCHEDULE_CONFLICT:
          "تعارض في المواعيد — مزود الخدمة لديه حجز متقاطع",
      };

      return {
        success: false,
        error: errorMap[data.error] || data.error,
      };
    }

    logger.info("Provider assigned to booking", {
      context: "ProviderAssignment",
      metadata: {
        bookingId,
        providerId,
        assignedBy: admin.id,
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/provider");

    return {
      success: true,
    };
  } catch (err) {
    logger.error("Assign provider error", {
      context: "ProviderAssignment",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Get eligible providers for a specific booking
 * for admin assignment UI.
 */
export async function getEligibleProvidersForBookingAction(
  bookingId: string
) {
  try {
    const supabase = await createServerSupabaseClient();

    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, user.id);

    if (!isAdminRole(role)) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, service_id, booking_date, start_time, end_time, status"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: "الحجز غير موجود",
      };
    }

    if (booking.status !== "CONFIRMED") {
      return {
        success: false,
        error: "الحجز ليس في حالة تسمح بالتعيين",
      };
    }

    /*
     * First fetch providers that offer the service.
     * provider_services links directly to users.
     */
    const { data: providerServiceRows, error: providerServicesError } =
      await supabase
        .from("provider_services")
        .select(`
          provider_id,
          users (
            id,
            full_name,
            phone
          )
        `)
        .eq("service_id", booking.service_id)
        .eq("is_active", true);

    if (providerServicesError) {
      logger.error("Failed to fetch provider service candidates", {
        context: "ProviderAssignment",
        error: providerServicesError,
      });

      return {
        success: false,
        error: "تعذر تحميل مقدمي الخدمة المؤهلين",
      };
    }

    const candidateRows = providerServiceRows || [];

    const providerIds = candidateRows.map(
      (row) => row.provider_id
    );

    if (providerIds.length === 0) {
      return {
        success: true,
        providers: [],
        booking,
      };
    }

    /*
     * provider_profiles is linked to users through user_id,
     * not directly to provider_services.
     */
    const { data: profiles, error: profilesError } =
      await supabase
        .from("provider_profiles")
        .select(`
          user_id,
          is_verified,
          application_status,
          bio
        `)
        .in("user_id", providerIds);

    if (profilesError) {
      logger.error("Failed to fetch provider candidate profiles", {
        context: "ProviderAssignment",
        error: profilesError,
      });

      return {
        success: false,
        error: "تعذر التحقق من حالة مقدمي الخدمة",
      };
    }

    const profileByUserId = new Map(
      (profiles || []).map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    const eligible = candidateRows
      .map((row) => {
        const profile = profileByUserId.get(row.provider_id);

        if (
          !profile ||
          !profile.is_verified ||
          profile.application_status !== "APPROVED"
        ) {
          return null;
        }

        const providerUser = Array.isArray(row.users)
          ? row.users[0] || null
          : row.users;

        return {
          providerId: row.provider_id,
          fullName:
            providerUser?.full_name || "مقدم خدمة",
          phone: providerUser?.phone || null,
          bio: profile.bio || null,
        };
      })
      .filter(
        (
          provider
        ): provider is {
          providerId: string;
          fullName: string;
          phone: string | null;
          bio: string | null;
        } => provider !== null
      );

    return {
      success: true,
      providers: eligible,
      booking,
    };
  } catch (err) {
    logger.error("Get eligible providers error", {
      context: "ProviderAssignment",
      error: err,
    });

    return {
      success: false,
      error: "حدث خطأ",
    };
  }
}