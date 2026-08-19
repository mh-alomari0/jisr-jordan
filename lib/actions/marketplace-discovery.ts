"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MarketplaceCategory, MarketplaceSearchResult, ServiceListing } from "@/lib/marketplace";

const SearchSchema = z.object({
  query: z.string().trim().max(120).default(""),
  scope: z.enum(["ALL", "LISTINGS", "PROVIDERS", "POSTS"]).default("ALL"),
  categoryId: z.string().uuid().nullable().optional(),
  deliveryType: z.enum(["ON_SITE", "REMOTE", "HYBRID", "SESSION", "PROJECT"]).nullable().optional(),
  pricingModel: z.enum(["FIXED", "STARTING_FROM", "HOURLY", "PER_SESSION", "QUOTE_REQUIRED"]).nullable().optional(),
  page: z.number().int().min(1).max(500).default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
});

function mediaUrl(supabaseUrl: string, path: string | null) {
  if (!path) return null;
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/marketplace-public/${safePath}`;
}

export async function getMarketplaceCategoriesAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("service_categories")
      .select("id, parent_id, slug, name_ar, description_ar, icon, display_order, is_active, requires_moderation")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name_ar", { ascending: true });
    if (error) return { success: false as const, error: "تعذر تحميل تصنيفات الخدمات", categories: [] as MarketplaceCategory[] };
    const categories = (data || []) as MarketplaceCategory[];
    const parents = categories.filter((category) => !category.parent_id).map((category) => ({
      ...category,
      children: categories.filter((child) => child.parent_id === category.id),
    }));
    return { success: true as const, categories: parents, flatCategories: categories };
  } catch {
    return { success: false as const, error: "تعذر تحميل تصنيفات الخدمات", categories: [] as MarketplaceCategory[] };
  }
}

export async function searchMarketplaceAction(input: Partial<z.input<typeof SearchSchema>> = {}) {
  const parsed = SearchSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "خيارات البحث غير صالحة", results: [] as MarketplaceSearchResult[] };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("search_marketplace", {
      p_query: parsed.data.query,
      p_scope: parsed.data.scope,
      p_category_id: parsed.data.categoryId || null,
      p_delivery_type: parsed.data.deliveryType || null,
      p_pricing_model: parsed.data.pricingModel || null,
      p_limit: parsed.data.pageSize,
      p_offset: (parsed.data.page - 1) * parsed.data.pageSize,
    });
    if (error) return { success: false as const, error: "تعذر تنفيذ البحث حالياً", results: [] as MarketplaceSearchResult[] };
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const results = ((data || []) as MarketplaceSearchResult[]).map((result) => ({
      ...result,
      image_path: mediaUrl(origin, result.image_path),
    }));
    return {
      success: true as const,
      results,
      page: parsed.data.page,
      hasMore: results.length === parsed.data.pageSize,
    };
  } catch {
    return { success: false as const, error: "تعذر تنفيذ البحث حالياً", results: [] as MarketplaceSearchResult[] };
  }
}

export async function getListingBySlugAction(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { success: false as const, error: "العرض غير موجود" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data: listing, error } = await supabase
      .from("service_listings")
      .select("id, provider_id, legacy_service_id, category_id, slug, title, short_description, description, delivery_type, pricing_model, base_price, currency, estimated_duration_minutes, service_areas, remote_available, status, moderation_notes, published_at, created_at, updated_at, service_categories(id, name_ar, slug, parent_id)")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !listing) return { success: false as const, error: "العرض غير موجود أو غير متاح" };
    const [{ data: provider }, { data: media }] = await Promise.all([
      supabase.rpc("get_public_provider_profile", { p_provider_id: listing.provider_id }),
      supabase.from("provider_media").select("storage_path, width, height, sort_order")
        .eq("listing_id", listing.id).eq("status", "ACTIVE").eq("storage_bucket", "marketplace-public")
        .order("sort_order", { ascending: true }).limit(8),
    ]);
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return {
      success: true as const,
      listing: listing as unknown as ServiceListing,
      provider: provider as Record<string, unknown> | null,
      media: (media || []).map((item) => ({ ...item, url: mediaUrl(origin, item.storage_path) })),
    };
  } catch {
    return { success: false as const, error: "تعذر تحميل عرض الخدمة" };
  }
}

export async function getPublicProviderAction(providerId: string) {
  if (!z.string().uuid().safeParse(providerId).success) return { success: false as const, error: "مقدم الخدمة غير موجود" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_public_provider_profile", { p_provider_id: providerId });
    if (error || !data) return { success: false as const, error: "مقدم الخدمة غير موجود أو غير متاح" };
    return { success: true as const, provider: data as Record<string, unknown> };
  } catch {
    return { success: false as const, error: "تعذر تحميل ملف مقدم الخدمة" };
  }
}

