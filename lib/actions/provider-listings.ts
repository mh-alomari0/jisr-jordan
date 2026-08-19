"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { detectContactSignals, PREBOOKING_CONTACT_WARNING } from "@/lib/anti-circumvention";
import { recordBlockedContactAttempt } from "@/lib/contact-protection-server";
import type { ServiceListing } from "@/lib/marketplace";

const ListingInputSchema = z.object({
  serviceTypeId: z.string().uuid("نوع الخدمة غير صالح"),
  title: z.string().trim().min(3, "عنوان العرض قصير جداً").max(120),
  shortDescription: z.string().trim().min(10, "أضف وصفاً مختصراً أوضح").max(240),
  description: z.string().trim().min(20, "أضف تفاصيل كافية عن الخدمة").max(4000),
  categoryId: z.string().uuid("التصنيف غير صالح"),
  deliveryType: z.enum(["ON_SITE", "REMOTE", "HYBRID", "SESSION", "PROJECT"]),
  pricingModel: z.enum(["FIXED", "STARTING_FROM", "HOURLY", "PER_SESSION", "QUOTE_REQUIRED"]),
  basePrice: z.number().finite().positive().max(1_000_000).nullable(),
  estimatedDurationMinutes: z.number().int().min(15).max(525_600).nullable(),
  serviceAreas: z.array(z.string().trim().min(2).max(80)).max(20),
}).superRefine((value, context) => {
  if (value.pricingModel !== "QUOTE_REQUIRED" && value.basePrice == null) {
    context.addIssue({ code: "custom", path: ["basePrice"], message: "أدخل السعر أو اختر نظام عرض السعر" });
  }
  if (["ON_SITE", "HYBRID"].includes(value.deliveryType) && value.serviceAreas.length === 0) {
    context.addIssue({ code: "custom", path: ["serviceAreas"], message: "حدد منطقة خدمة واحدة على الأقل" });
  }
});

const IdSchema = z.string().uuid();

async function approvedProvider(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data } = await supabase.from("provider_profiles")
    .select("application_status, is_verified")
    .eq("user_id", userId).maybeSingle();
  return data?.application_status === "APPROVED" && data.is_verified === true;
}

export async function getProviderListingsAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", listings: [] as ServiceListing[] };
    if (!(await approvedProvider(supabase, user.id))) {
      return { success: false as const, error: "يتطلب الوصول حساب مقدم خدمة معتمداً", listings: [] as ServiceListing[] };
    }
    const { data, error } = await supabase.from("service_listings")
      .select("id, provider_id, legacy_service_id, category_id, slug, title, short_description, description, delivery_type, pricing_model, base_price, currency, estimated_duration_minutes, service_areas, remote_available, status, moderation_notes, published_at, created_at, updated_at, service_categories(id, name_ar, slug, parent_id)")
      .eq("provider_id", user.id).order("updated_at", { ascending: false }).limit(100);
    if (error) return { success: false as const, error: "تعذر تحميل عروضك", listings: [] as ServiceListing[] };
    return { success: true as const, listings: (data || []) as unknown as ServiceListing[] };
  } catch {
    return { success: false as const, error: "تعذر تحميل عروضك", listings: [] as ServiceListing[] };
  }
}

export async function createProviderListingAction(input: z.input<typeof ListingInputSchema>) {
  const parsed = ListingInputSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات العرض غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const contactSignals = detectContactSignals(`${parsed.data.title} ${parsed.data.shortDescription} ${parsed.data.description}`);
    if (contactSignals.length) { await recordBlockedContactAttempt(supabase, "LISTING", null, contactSignals); return { success: false as const, error: PREBOOKING_CONTACT_WARNING }; }
    const rate = await checkRateLimit(`listing:create:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    if (!(await approvedProvider(supabase, user.id))) return { success: false as const, error: "لا يمكن إنشاء عرض قبل اعتماد حساب مقدم الخدمة" };
    const { data: category } = await supabase.from("service_categories")
      .select("id, parent_id, is_active").eq("id", parsed.data.categoryId).eq("is_active", true).maybeSingle();
    if (!category?.parent_id) return { success: false as const, error: "اختر تصنيفاً فرعياً صالحاً" };
    const { data: serviceType } = await supabase.from("services").select("id")
      .eq("id", parsed.data.serviceTypeId).eq("category_id", parsed.data.categoryId).eq("is_active", true).maybeSingle();
    if (!serviceType) return { success: false as const, error: "اختر نوع خدمة تابعاً للتصنيف المحدد" };

    const slug = `service-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const remoteAvailable = ["REMOTE", "HYBRID"].includes(parsed.data.deliveryType);
    const { data, error } = await supabase.from("service_listings").insert({
      provider_id: user.id,
      legacy_service_id: parsed.data.serviceTypeId,
      category_id: parsed.data.categoryId,
      slug,
      title: parsed.data.title,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      delivery_type: parsed.data.deliveryType,
      pricing_model: parsed.data.pricingModel,
      base_price: parsed.data.pricingModel === "QUOTE_REQUIRED" ? null : parsed.data.basePrice,
      estimated_duration_minutes: parsed.data.estimatedDurationMinutes,
      service_areas: remoteAvailable && parsed.data.deliveryType === "REMOTE" ? [] : parsed.data.serviceAreas,
      remote_available: remoteAvailable,
      status: "DRAFT",
    }).select("id, slug").single();
    if (error || !data) {
      logger.error("Provider listing creation failed", { context: "ProviderListings", userId: user.id, metadata: { code: error?.code } });
      return { success: false as const, error: "تعذر إنشاء عرض الخدمة" };
    }
    revalidatePath("/provider/listings");
    return { success: true as const, listingId: data.id as string, slug: data.slug as string };
  } catch (error) {
    logger.error("Provider listing action failed", { context: "ProviderListings", error });
    return { success: false as const, error: "تعذر إنشاء عرض الخدمة" };
  }
}

export async function updateProviderListingAction(listingId: string, input: z.input<typeof ListingInputSchema>) {
  const id = IdSchema.safeParse(listingId);
  const parsed = ListingInputSchema.safeParse(input);
  if (!id.success || !parsed.success) return { success: false as const, error: parsed.success ? "معرف العرض غير صالح" : parsed.error.issues[0]?.message };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const contactSignals = detectContactSignals(`${parsed.data.title} ${parsed.data.shortDescription} ${parsed.data.description}`);
    if (contactSignals.length) { await recordBlockedContactAttempt(supabase, "LISTING", listingId, contactSignals); return { success: false as const, error: PREBOOKING_CONTACT_WARNING }; }
    const { data: current } = await supabase.from("service_listings").select("id, status")
      .eq("id", listingId).eq("provider_id", user.id).maybeSingle();
    if (!current) return { success: false as const, error: "العرض غير موجود" };
    if (current.status === "PUBLISHED") return { success: false as const, error: "أوقف نشر العرض قبل تعديل محتواه" };
    const { data: category } = await supabase.from("service_categories")
      .select("id, parent_id").eq("id", parsed.data.categoryId).eq("is_active", true).maybeSingle();
    if (!category?.parent_id) return { success: false as const, error: "اختر تصنيفاً فرعياً صالحاً" };
    const { data: serviceType } = await supabase.from("services").select("id")
      .eq("id", parsed.data.serviceTypeId).eq("category_id", parsed.data.categoryId).eq("is_active", true).maybeSingle();
    if (!serviceType) return { success: false as const, error: "اختر نوع خدمة تابعاً للتصنيف المحدد" };
    const remoteAvailable = ["REMOTE", "HYBRID"].includes(parsed.data.deliveryType);
    const { error } = await supabase.from("service_listings").update({
      legacy_service_id: parsed.data.serviceTypeId,
      category_id: parsed.data.categoryId,
      title: parsed.data.title,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      delivery_type: parsed.data.deliveryType,
      pricing_model: parsed.data.pricingModel,
      base_price: parsed.data.pricingModel === "QUOTE_REQUIRED" ? null : parsed.data.basePrice,
      estimated_duration_minutes: parsed.data.estimatedDurationMinutes,
      service_areas: remoteAvailable && parsed.data.deliveryType === "REMOTE" ? [] : parsed.data.serviceAreas,
      remote_available: remoteAvailable,
      status: "DRAFT",
      moderation_notes: null,
    }).eq("id", listingId).eq("provider_id", user.id);
    if (error) return { success: false as const, error: "تعذر تحديث العرض" };
    revalidatePath("/provider/listings");
    revalidatePath(`/listings/${listingId}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر تحديث العرض" };
  }
}

export async function setProviderListingPublicationAction(listingId: string, publish: boolean) {
  if (!IdSchema.safeParse(listingId).success) return { success: false as const, error: "معرف العرض غير صالح" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`listing:publish:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("set_listing_publication", { p_listing_id: listingId, p_publish: publish });
    if (error || !data?.success) {
      if (error?.message?.includes("LISTING_SERVICE_TYPE_REQUIRED")) return { success: false as const, error: "اختر نوع خدمة صالحاً قبل النشر" };
      const messages: Record<string, string> = {
        LISTING_NOT_FOUND: "العرض غير موجود أو لا يخص حسابك",
        PROVIDER_NOT_APPROVED: "حساب مقدم الخدمة غير معتمد",
        INVALID_STATUS: "لا يمكن تغيير حالة العرض من حالته الحالية",
      };
      return { success: false as const, error: messages[data?.error] || "تعذر تغيير حالة النشر" };
    }
    revalidatePath("/provider/listings");
    revalidatePath("/");
    revalidatePath("/discover");
    return { success: true as const, status: data.status as string };
  } catch {
    return { success: false as const, error: "تعذر تغيير حالة النشر" };
  }
}

export async function deleteProviderListingAction(listingId: string) {
  if (!IdSchema.safeParse(listingId).success) return { success: false as const, error: "معرف العرض غير صالح" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const { error } = await supabase.from("service_listings").delete().eq("id", listingId).eq("provider_id", user.id);
    if (error) return { success: false as const, error: "لا يمكن حذف العرض المنشور أو المرتبط بمعاملات" };
    revalidatePath("/provider/listings");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر حذف العرض" };
  }
}
