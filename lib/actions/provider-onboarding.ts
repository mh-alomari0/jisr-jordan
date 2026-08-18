"use server";

import { createServerSupabaseClient, createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ApplySchema = z.object({
  bio: z.string().min(10, "نبذة تعريفية لا تقل عن 10 حروف").max(1000),
  serviceAreas: z.array(z.string()).min(1, "حدد منطقة خدمة واحدة على الأقل"),
  experience: z.string().max(500).optional(),
  serviceIds: z.array(z.string().uuid()).min(1, "اختر خدمة واحدة على الأقل"),
});

/**
 * Customer applies to become a provider.
 * Creates/updates provider_profiles with PENDING_VERIFICATION status.
 */
export async function applyAsProviderAction(input: z.infer<typeof ApplySchema>) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    const validated = ApplySchema.parse(input);
    const adminClient = createAdminSupabaseClient();

    const { data, error } = await adminClient.rpc("apply_as_provider", {
      p_user_id: user.id,
      p_bio: validated.bio,
      p_service_areas: validated.serviceAreas,
      p_experience: validated.experience || null,
      p_service_ids: validated.serviceIds,
    });

    if (error) {
      logger.error("Provider application RPC failed", {
        context: "ProviderOnboarding",
        metadata: { userId: user.id, error: error.message },
      });
      return { success: false, error: "فشل تقديم الطلب، يرجى المحاولة لاحقاً" };
    }

    if (data && !data.success) {
      const errorMap: Record<string, string> = {
        ALREADY_APPROVED: "أنت مزود خدمة معتمد بالفعل",
        ALREADY_PENDING: "لديك طلب قيد المراجعة بالفعل",
      };
      return { success: false, error: errorMap[data.error] || data.error };
    }

    logger.info("Provider application submitted", {
      context: "ProviderOnboarding",
      metadata: { userId: user.id },
    });

    revalidatePath("/provider");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message || "بيانات غير صالحة" };
    }
    logger.error("Provider application error", { context: "ProviderOnboarding", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * Get the current user's provider application status.
 */
export async function getProviderApplicationStatusAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "غير مصرح" };

    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("application_status, is_verified, bio, service_areas, experience, applied_at, application_notes")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: services } = await supabase
      .from("provider_services")
      .select("service_id, services(id, title)")
      .eq("provider_id", user.id);

    return {
      success: true,
      profile: profile || null,
      services: services || [],
    };
  } catch (err) {
    return { success: false, error: "حدث خطأ" };
  }
}

/**
 * Update provider profile (bio, areas, services) — only for approved providers.
 */
export async function updateProviderProfileAction(input: {
  bio?: string;
  serviceAreas?: string[];
  experience?: string;
  serviceIds?: string[];
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };

    const supabase = await createServerSupabaseClient();

    // Verify user is an approved provider
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("application_status")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.application_status !== "APPROVED") {
      return { success: false, error: "غير مصرح: يجب أن تكون مزود خدمة معتمد" };
    }

    const adminClient = createAdminSupabaseClient();

    if (input.bio !== undefined || input.serviceAreas !== undefined || input.experience !== undefined) {
      const update: Record<string, unknown> = {};
      if (input.bio !== undefined) update.bio = input.bio;
      if (input.serviceAreas !== undefined) update.service_areas = input.serviceAreas;
      if (input.experience !== undefined) update.experience = input.experience;
      update.updated_at = new Date().toISOString();

      await adminClient.from("provider_profiles").update(update).eq("user_id", user.id);
    }

    if (input.serviceIds) {
      await adminClient.from("provider_services").delete().eq("provider_id", user.id);
      if (input.serviceIds.length > 0) {
        await adminClient.from("provider_services").insert(
          input.serviceIds.map((sid) => ({ provider_id: user.id, service_id: sid }))
        );
      }
    }

    revalidatePath("/provider");
    return { success: true };
  } catch (err) {
    logger.error("Update provider profile error", { context: "ProviderProfile", error: err });
    return { success: false, error: "حدث خطأ أثناء التحديث" };
  }
}
