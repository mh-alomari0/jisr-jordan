"use server";

import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    const rateLimit = await checkRateLimit(`provider:apply:${user.id}`, { limit: 3, windowMs: 60 * 60_000 });
    if (!rateLimit.success) return { success: false, error: rateLimit.error };

    const validated = ApplySchema.parse(input);
    const { data, error } = await supabase.rpc("apply_as_provider", {
      p_user_id: user.id,
      p_bio: validated.bio,
      p_service_areas: validated.serviceAreas,
      p_experience: validated.experience || null,
      p_service_ids: validated.serviceIds,
    });

    if (error) {
      logger.error("Provider application RPC failed", {
        context: "ProviderOnboarding",
        userId: user.id,
        metadata: { code: error.code },
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
      return { success: false, error: err.issues[0]?.message || "بيانات غير صالحة" };
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
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "غير مصرح" };

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
  } catch {
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
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };

    // Verify user is an approved provider
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("application_status")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.application_status !== "APPROVED") {
      return { success: false, error: "غير مصرح: يجب أن تكون مزود خدمة معتمد" };
    }

    if (!input.bio || !input.serviceAreas || !input.serviceIds) {
      return { success: false, error: "يجب إرسال النبذة والمناطق والخدمات كاملة" };
    }

    const parsed = ApplySchema.safeParse({
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      experience: input.experience,
      serviceIds: input.serviceIds,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "بيانات غير صالحة" };
    }

    const { data, error } = await supabase.rpc("update_provider_profile", {
      p_bio: parsed.data.bio,
      p_service_areas: parsed.data.serviceAreas,
      p_experience: parsed.data.experience || null,
      p_service_ids: parsed.data.serviceIds,
    });
    if (error || !data?.success) {
      return { success: false, error: "تعذر تحديث ملف مقدم الخدمة" };
    }

    revalidatePath("/provider");
    return { success: true };
  } catch (err) {
    logger.error("Update provider profile error", { context: "ProviderProfile", error: err });
    return { success: false, error: "حدث خطأ أثناء التحديث" };
  }
}

const PublicProviderProfileSchema = z.object({
  headline: z.string().trim().max(160),
  skills: z.array(z.string().trim().min(2).max(60)).max(20),
  remoteAvailable: z.boolean(),
  publicSlug: z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الرابط المختصر يجب أن يكون إنجليزياً وبشرطات").or(z.literal("")),
});

export async function updateProviderPublicProfileAction(input: z.input<typeof PublicProviderProfileSchema>) {
  const parsed = PublicProviderProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات الملف العام غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const { data, error } = await supabase.rpc("update_provider_public_profile", {
      p_headline: parsed.data.headline,
      p_skills: parsed.data.skills,
      p_remote_available: parsed.data.remoteAvailable,
      p_public_slug: parsed.data.publicSlug || null,
    });
    if (error || !data?.success) {
      return { success: false as const, error: data?.error === "SLUG_TAKEN" ? "الرابط المختصر مستخدم" : "تعذر تحديث الملف المهني" };
    }
    revalidatePath("/provider/profile");
    revalidatePath(`/providers/${user.id}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر تحديث الملف المهني" };
  }
}
