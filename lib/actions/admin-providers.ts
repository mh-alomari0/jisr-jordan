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

type ProviderProfileRow = {
  id: string;
  user_id: string;
  bio: string | null;
  service_areas: string[] | null;
  experience: string | null;
  application_status: string | null;
  is_verified: boolean | null;
  applied_at: string | null;
  application_notes: string | null;
  created_at: string;
};

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
};

type ProviderServiceRow = {
  provider_id: string;
  service_id: string;
  is_active: boolean | null;
};

type ServiceRow = {
  id: string;
  title: string;
};

/**
 * List provider profiles for admin.
 *
 * Important:
 * We intentionally DO NOT use nested PostgREST embeds here.
 * The live schema has provider_profiles.user_id -> users.id and
 * provider_services.provider_id -> users.id, but provider_profiles and
 * provider_services do not have a direct FK between them.
 *
 * Fetching each table independently is more resilient to schema-cache drift
 * and avoids an admin page failure when PostgREST cannot resolve an embed.
 */
export async function getAdminProvidersAction(page = 1) {
  try {
    const supabase = await createServerSupabaseClient();

    const admin = await getAuthenticatedUser(supabase);

    if (!admin) {
      return {
        success: false as const,
        error: "غير مصرح",
      };
    }

    const role = await getUserRole(supabase, admin.id);

    if (!isAdminRole(role)) {
      return {
        success: false as const,
        error: "غير مصرح: للمسؤولين فقط",
      };
    }

    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const from = (safePage - 1) * pageSize;

    const { data: profileRows, error: profilesError } = await supabase
      .from("provider_profiles")
      .select(
        [
          "id",
          "user_id",
          "bio",
          "service_areas",
          "experience",
          "application_status",
          "is_verified",
          "applied_at",
          "application_notes",
          "created_at",
        ].join(","),
      )
      .order("applied_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .range(from, from + pageSize);

    if (profilesError) {
      logger.error("Failed to fetch admin provider profiles", {
        context: "AdminProviders",
        error: profilesError,
      });

      return {
        success: false as const,
        error:
          "تعذر تحميل قائمة مقدمي الخدمة. تأكد من تنفيذ migration إصلاح صلاحيات provider_profiles.",
      };
    }

    const rawProfiles = (profileRows || []) as unknown as ProviderProfileRow[];
    const hasMore = rawProfiles.length > pageSize;
    const visibleProfiles = rawProfiles.slice(0, pageSize);

    if (visibleProfiles.length === 0) {
      return {
        success: true as const,
        providers: [] as AdminProvider[],
        page: safePage,
        hasMore: false,
      };
    }

    const providerIds = visibleProfiles.map((profile) => profile.user_id);

    const [
      { data: userRows, error: usersError },
      { data: providerServiceRows, error: providerServicesError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id,email,full_name,phone,role")
        .in("id", providerIds),
      supabase
        .from("provider_services")
        .select("provider_id,service_id,is_active")
        .in("provider_id", providerIds),
    ]);

    if (usersError) {
      logger.error("Failed to fetch provider users for admin", {
        context: "AdminProviders",
        error: usersError,
      });

      return {
        success: false as const,
        error: "تعذر تحميل بيانات حسابات مقدمي الخدمة",
      };
    }

    if (providerServicesError) {
      logger.error("Failed to fetch provider services for admin", {
        context: "AdminProviders",
        error: providerServicesError,
      });

      return {
        success: false as const,
        error: "تعذر تحميل خدمات مقدمي الخدمة",
      };
    }

    const users = (userRows || []) as unknown as AdminUserRow[];
    const providerServices =
      (providerServiceRows || []) as unknown as ProviderServiceRow[];

    const serviceIds = [
      ...new Set(
        providerServices
          .filter((row) => row.is_active !== false)
          .map((row) => row.service_id),
      ),
    ];

    let services: ServiceRow[] = [];

    if (serviceIds.length > 0) {
      const { data: serviceRows, error: servicesError } = await supabase
        .from("services")
        .select("id,title")
        .in("id", serviceIds);

      if (servicesError) {
        logger.error("Failed to fetch service titles for admin providers", {
          context: "AdminProviders",
          error: servicesError,
        });

        return {
          success: false as const,
          error: "تعذر تحميل أسماء خدمات مقدمي الخدمة",
        };
      }

      services = (serviceRows || []) as unknown as ServiceRow[];
    }

    const userById = new Map(users.map((user) => [user.id, user]));
    const serviceById = new Map(
      services.map((service) => [service.id, service]),
    );

    const servicesByProvider = new Map<
      string,
      AdminProvider["provider_services"]
    >();

    for (const row of providerServices) {
      if (row.is_active === false) continue;

      const current = servicesByProvider.get(row.provider_id) || [];
      const service = serviceById.get(row.service_id) || null;

      current.push({
        service_id: row.service_id,
        services: service
          ? {
              id: service.id,
              title: service.title,
            }
          : null,
      });

      servicesByProvider.set(row.provider_id, current);
    }

    const normalized: AdminProvider[] = visibleProfiles.map((profile) => {
      const providerUser = userById.get(profile.user_id);

      return {
        id: profile.id,
        user_id: profile.user_id,
        bio: profile.bio,
        service_areas: profile.service_areas,
        experience: profile.experience,
        application_status:
          profile.application_status || "NOT_APPLIED",
        is_verified: Boolean(profile.is_verified),
        applied_at: profile.applied_at,
        application_notes: profile.application_notes,
        created_at: profile.created_at,
        users: providerUser
          ? {
              id: providerUser.id,
              email: providerUser.email || "",
              full_name:
                providerUser.full_name?.trim() ||
                providerUser.email?.split("@")[0] ||
                "بدون اسم",
              phone: providerUser.phone,
              role: providerUser.role,
            }
          : null,
        provider_services:
          servicesByProvider.get(profile.user_id) || [],
      };
    });

    return {
      success: true as const,
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
      success: false as const,
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
      },
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
  reason: string,
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
      },
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
      },
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
  providerId: string,
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
      },
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
  bookingId: string,
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
        "id, service_id, booking_date, start_time, end_time, status",
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

    const { data: providerServiceRows, error: providerServicesError } =
      await supabase
        .from("provider_services")
        .select("provider_id,service_id,is_active")
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
    const providerIds = candidateRows.map((row) => row.provider_id);

    if (providerIds.length === 0) {
      return {
        success: true,
        providers: [],
        booking,
      };
    }

    const [
      { data: profiles, error: profilesError },
      { data: providerUsers, error: providerUsersError },
    ] = await Promise.all([
      supabase
        .from("provider_profiles")
        .select("user_id,is_verified,application_status,bio")
        .in("user_id", providerIds),
      supabase
        .from("users")
        .select("id,full_name,phone")
        .in("id", providerIds),
    ]);

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

    if (providerUsersError) {
      logger.error("Failed to fetch provider candidate users", {
        context: "ProviderAssignment",
        error: providerUsersError,
      });

      return {
        success: false,
        error: "تعذر تحميل بيانات مقدمي الخدمة",
      };
    }

    const profileByUserId = new Map(
      (profiles || []).map((profile) => [
        profile.user_id,
        profile,
      ]),
    );

    const userById = new Map(
      (providerUsers || []).map((providerUser) => [
        providerUser.id,
        providerUser,
      ]),
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

        const providerUser = userById.get(row.provider_id);

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
          provider,
        ): provider is {
          providerId: string;
          fullName: string;
          phone: string | null;
          bio: string | null;
        } => provider !== null,
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
