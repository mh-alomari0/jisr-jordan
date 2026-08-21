"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MarketplaceCategory,
  MarketplaceSearchResult,
  ServiceListing,
  ServiceProviderResult,
} from "@/lib/marketplace";
import {
  buildServiceTaxonomy,
  excludeEventCategories,
  normalizeServiceCategories,
} from "@/lib/service-taxonomy";
import { resolveSmartSearchIntent } from "@/lib/ai/smart-search";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

const SearchSchema = z.object({
  query: z
    .string()
    .trim()
    .max(120)
    .default(""),
  scope: z
    .enum([
      "ALL",
      "LISTINGS",
      "PROVIDERS",
      "POSTS",
    ])
    .default("ALL"),
  categoryId: z
    .string()
    .uuid()
    .nullable()
    .optional(),
  deliveryType: z
    .enum([
      "ON_SITE",
      "REMOTE",
      "HYBRID",
      "SESSION",
      "PROJECT",
    ])
    .nullable()
    .optional(),
  pricingModel: z
    .enum([
      "FIXED",
      "STARTING_FROM",
      "HOURLY",
      "PER_SESSION",
      "QUOTE_REQUIRED",
    ])
    .nullable()
    .optional(),
  page: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(48)
    .default(24),
});

function mediaUrl(
  supabaseUrl: string,
  path: string | null,
) {
  if (!path) return null;

  const safePath = path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl.replace(
    /\/$/,
    "",
  )}/storage/v1/object/public/marketplace-public/${safePath}`;
}

async function anonymousSearchKey() {
  const requestHeaders = await headers();

  const network =
    requestHeaders.get(
      "x-vercel-forwarded-for",
    ) ||
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";

  return createHash("sha256")
    .update(network)
    .digest("hex");
}

export async function getMarketplaceCategoriesAction(
  options?: {
    normalizeDrift?: boolean;
  },
) {
  try {
    const supabase =
      await createServerSupabaseClient();

    const { data, error } =
      await supabase
        .from("service_categories")
        .select(
          "id, parent_id, slug, name_ar, description_ar, icon, display_order, is_active, requires_moderation",
        )
        .eq("is_active", true)
        .order("display_order", {
          ascending: true,
        })
        .order("name_ar", {
          ascending: true,
        });

    if (error) {
      return {
        success: false as const,
        error:
          "تعذر تحميل تصنيفات الخدمات",
        categories:
          [] as MarketplaceCategory[],
      };
    }

    const rawCategories =
      excludeEventCategories(
        (data ||
          []) as MarketplaceCategory[],
      );

    const categories =
      options?.normalizeDrift === false
        ? rawCategories
        : normalizeServiceCategories(
            rawCategories,
          );

    const parents = categories
      .filter(
        (category) =>
          !category.parent_id,
      )
      .map((category) => ({
        ...category,
        children: categories.filter(
          (child) =>
            child.parent_id ===
            category.id,
        ),
      }));

    return {
      success: true as const,
      categories: parents,
      flatCategories: categories,
    };
  } catch {
    return {
      success: false as const,
      error:
        "تعذر تحميل تصنيفات الخدمات",
      categories:
        [] as MarketplaceCategory[],
    };
  }
}

export async function getHomeServiceTaxonomyAction(
  options?: {
    normalizeDrift?: boolean;
  },
) {
  try {
    const supabase =
      await createServerSupabaseClient();

    const [
      {
        data: categories,
        error: categoryError,
      },
      {
        data: services,
        error: serviceError,
      },
    ] = await Promise.all([
      supabase
        .from("service_categories")
        .select(
          "id, parent_id, slug, name_ar, description_ar, icon, display_order, is_active, requires_moderation",
        )
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("services")
        .select(
          "id, title, description, category, category_id",
        )
        .eq("is_active", true)
        .order("title")
        .limit(200),
    ]);

    if (
      categoryError ||
      serviceError
    ) {
      return {
        success: false as const,
        categories: [],
      };
    }

    const categoryRows =
      excludeEventCategories(
        (categories ||
          []) as MarketplaceCategory[],
      );

    if (
      options?.normalizeDrift !==
      false
    ) {
      return {
        success: true as const,
        categories:
          buildServiceTaxonomy(
            categoryRows,
            services || [],
          ),
      };
    }

    const byId = new Map(
      categoryRows.map((item) => [
        item.id,
        item,
      ]),
    );

    const serviceRows = (
      services || []
    ).map((service) => {
      const child =
        service.category_id
          ? byId.get(
              service.category_id,
            )
          : null;

      const parent =
        child?.parent_id
          ? byId.get(child.parent_id)
          : child;

      return {
        id: service.id,
        title: service.title,
        description:
          service.description,
        category_id:
          child?.id || null,
        category_name:
          child?.name_ar || null,
        parent_category_id:
          parent?.id || null,
        parent_category_name:
          parent?.name_ar || null,
      };
    });

    return {
      success: true as const,
      categories: categoryRows
        .filter(
          (item) =>
            !item.parent_id,
        )
        .map((parent) => ({
          ...parent,
          serviceTypes:
            serviceRows.filter(
              (service) =>
                service.parent_category_id ===
                parent.id,
            ),
        })),
    };
  } catch {
    return {
      success: false as const,
      categories: [],
    };
  }
}

const ProviderSortSchema = z.enum([
  "RATING_DESC",
  "EXPERIENCE_DESC",
  "EXPERIENCE_ASC",
  "PRICE_ASC",
  "PRICE_DESC",
  "COMPLETED_DESC",
  "COMPLETED_ASC",
  "AVAILABLE_FIRST",
]);

export async function getServiceTypeAction(
  serviceId: string,
) {
  if (
    !z
      .string()
      .uuid()
      .safeParse(serviceId).success
  ) {
    return {
      success: false as const,
      error: "نوع الخدمة غير موجود",
    };
  }

  try {
    const supabase =
      await createServerSupabaseClient();

    const { data, error } =
      await supabase
        .from("services")
        .select(
          "id, title, description, category_id, service_categories(id, name_ar, parent_id)",
        )
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

    if (error || !data) {
      return {
        success: false as const,
        error: "نوع الخدمة غير موجود",
      };
    }

    return {
      success: true as const,
      service: data,
    };
  } catch {
    return {
      success: false as const,
      error:
        "تعذر تحميل نوع الخدمة",
    };
  }
}

export async function getServiceTypeProvidersAction(
  input: {
    serviceId: string;
    sort?: string;
    serviceArea?: string | null;
    pricingModel?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    minRating?: number | null;
    minExperience?: number | null;
    remoteOnly?: boolean;
    availableToday?: boolean;
    page?: number;
  },
) {
  const parsed = z
    .object({
      serviceId: z.string().uuid(),
      sort:
        ProviderSortSchema.default(
          "RATING_DESC",
        ),
      serviceArea: z
        .string()
        .trim()
        .min(2)
        .max(80)
        .nullable()
        .default(null),
      pricingModel: z
        .enum([
          "FIXED",
          "STARTING_FROM",
          "HOURLY",
          "PER_SESSION",
          "QUOTE_REQUIRED",
        ])
        .nullable()
        .default(null),
      minPrice: z
        .number()
        .nonnegative()
        .max(1_000_000)
        .nullable()
        .default(null),
      maxPrice: z
        .number()
        .positive()
        .max(1_000_000)
        .nullable()
        .default(null),
      minRating: z
        .number()
        .min(0)
        .max(5)
        .nullable()
        .default(null),
      minExperience: z
        .number()
        .int()
        .min(0)
        .max(80)
        .nullable()
        .default(null),
      remoteOnly: z
        .boolean()
        .default(false),
      availableToday: z
        .boolean()
        .default(false),
      page: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(1),
    })
    .safeParse(input);

  if (
    !parsed.success ||
    (parsed.data.minPrice != null &&
      parsed.data.maxPrice != null &&
      parsed.data.minPrice >
        parsed.data.maxPrice)
  ) {
    return {
      success: false as const,
      error:
        "مرشحات مقدمي الخدمة غير صالحة",
      providers:
        [] as ServiceProviderResult[],
    };
  }

  try {
    const supabase =
      await createServerSupabaseClient();

    const pageSize = 24;

    const { data, error } =
      await supabase.rpc(
        "get_service_provider_listings",
        {
          p_service_id:
            parsed.data.serviceId,
          p_sort: parsed.data.sort,
          p_service_area:
            parsed.data.serviceArea,
          p_pricing_model:
            parsed.data.pricingModel,
          p_min_price:
            parsed.data.minPrice,
          p_max_price:
            parsed.data.maxPrice,
          p_min_rating:
            parsed.data.minRating,
          p_min_experience:
            parsed.data.minExperience,
          p_remote_only:
            parsed.data.remoteOnly,
          p_available_today:
            parsed.data.availableToday,
          p_limit: pageSize,
          p_offset:
            (parsed.data.page - 1) *
            pageSize,
        },
      );

    if (error) {
      return {
        success: false as const,
        error:
          "تعذر تحميل مقدمي الخدمة",
        providers:
          [] as ServiceProviderResult[],
      };
    }

    const origin =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      "";

    const providers = (
      (data ||
        []) as ServiceProviderResult[]
    ).map((item) => ({
      ...item,
      image_path: mediaUrl(
        origin,
        item.image_path,
      ),
      provider_avatar_path:
        mediaUrl(
          origin,
          item.provider_avatar_path,
        ),
    }));

    return {
      success: true as const,
      providers,
      page: parsed.data.page,
      hasMore:
        providers.length ===
        pageSize,
    };
  } catch {
    return {
      success: false as const,
      error:
        "تعذر تحميل مقدمي الخدمة",
      providers:
        [] as ServiceProviderResult[],
    };
  }
}

async function runMarketplaceSearch(
  supabase: Awaited<
    ReturnType<
      typeof createServerSupabaseClient
    >
  >,
  input: z.infer<
    typeof SearchSchema
  >,
  overrides?: {
    query?: string;
    categoryId?: string | null;
  },
) {
  return supabase.rpc(
    "search_marketplace",
    {
      p_query:
        overrides?.query ??
        input.query,
      p_scope: input.scope,
      p_category_id:
        overrides?.categoryId ??
        input.categoryId ??
        null,
      p_delivery_type:
        input.deliveryType || null,
      p_pricing_model:
        input.pricingModel || null,
      p_limit: input.pageSize,
      p_offset:
        (input.page - 1) *
        input.pageSize,
    },
  );
}

export async function searchMarketplaceAction(input: Partial<z.input<typeof SearchSchema>> = {}) {
  const parsed = SearchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¨Ø­Ø« ØºÙŠØ± ØµØ§Ù„Ø­Ø©",
      results: [] as MarketplaceSearchResult[],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const runSearch = (query: string, categoryId?: string | null) =>
      supabase.rpc("search_marketplace", {
        p_query: query,
        p_scope: parsed.data.scope,
        p_category_id: categoryId ?? parsed.data.categoryId ?? null,
        p_delivery_type: parsed.data.deliveryType || null,
        p_pricing_model: parsed.data.pricingModel || null,
        p_limit: parsed.data.pageSize,
        p_offset: (parsed.data.page - 1) * parsed.data.pageSize,
      });

    const first = await runSearch(parsed.data.query);

    if (first.error) {
      return {
        success: false as const,
        error: "ØªØ¹Ø°Ø± ØªÙ†ÙÙŠØ° Ø§Ù„Ø¨Ø­Ø« Ø­Ø§Ù„ÙŠØ§Ù‹",
        results: [] as MarketplaceSearchResult[],
      };
    }

    let rows = (first.data || []) as MarketplaceSearchResult[];
    let smartSearchUsed = false;
    let normalizedQuery: string | null = null;

    if (
      rows.length === 0 &&
      parsed.data.query.trim().length >= 3 &&
      parsed.data.page === 1
    ) {
      const [{ data: categories }, { data: services }] = await Promise.all([
        supabase
          .from("service_categories")
          .select("id, name_ar")
          .eq("is_active", true)
          .limit(50),
        supabase
          .from("services")
          .select("id, title, description, category_id")
          .eq("is_active", true)
          .limit(200),
      ]);

      const intent = await resolveSmartSearchIntent(parsed.data.query, {
        categories: categories || [],
        services: services || [],
      }).catch((error) => {
        console.error("Smart search failed:", error);
        return null;
      });

      if (intent) {
        const second = await runSearch(
          intent.normalized_query,
          parsed.data.categoryId || intent.category_id,
        );

        if (!second.error) {
          rows = (second.data || []) as MarketplaceSearchResult[];
          smartSearchUsed = true;
          normalizedQuery = intent.normalized_query;
        }
      }
    }

    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    const results = rows.map((result) => ({
      ...result,
      image_path: mediaUrl(origin, result.image_path),
    }));

    return {
      success: true as const,
      results,
      page: parsed.data.page,
      hasMore: results.length === parsed.data.pageSize,
      smartSearch: {
        used: smartSearchUsed,
        normalizedQuery,
      },
    };
  } catch (error) {
    console.error("Marketplace search failed:", error);

    return {
      success: false as const,
      error: "ØªØ¹Ø°Ø± ØªÙ†ÙÙŠØ° Ø§Ù„Ø¨Ø­Ø« Ø­Ø§Ù„ÙŠØ§Ù‹",
      results: [] as MarketplaceSearchResult[],
    };
  }
}

export async function getListingBySlugAction(
  slug: string,
) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    return {
      success: false as const,
      error: "العرض غير موجود",
    };
  }

  try {
    const supabase =
      await createServerSupabaseClient();

    const {
      data: listing,
      error,
    } = await supabase
      .from("service_listings")
      .select(
        "id, provider_id, legacy_service_id, category_id, slug, title, short_description, description, delivery_type, pricing_model, base_price, currency, estimated_duration_minutes, service_areas, remote_available, status, moderation_notes, published_at, created_at, updated_at, service_categories(id, name_ar, slug, parent_id)",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !listing) {
      return {
        success: false as const,
        error:
          "العرض غير موجود أو غير متاح",
      };
    }

    const [
      { data: provider },
      { data: media },
    ] = await Promise.all([
      supabase.rpc(
        "get_public_provider_profile",
        {
          p_provider_id:
            listing.provider_id,
        },
      ),
      supabase
        .from("provider_media")
        .select(
          "storage_path, width, height, sort_order",
        )
        .eq(
          "listing_id",
          listing.id,
        )
        .eq("status", "ACTIVE")
        .eq(
          "storage_bucket",
          "marketplace-public",
        )
        .order("sort_order", {
          ascending: true,
        })
        .limit(8),
    ]);

    const origin =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      "";

    return {
      success: true as const,
      listing:
        listing as unknown as ServiceListing,
      provider:
        provider as Record<
          string,
          unknown
        > | null,
      media: (media || []).map(
        (item) => ({
          ...item,
          url: mediaUrl(
            origin,
            item.storage_path,
          ),
        }),
      ),
    };
  } catch {
    return {
      success: false as const,
      error:
        "تعذر تحميل عرض الخدمة",
    };
  }
}

export async function getPublicProviderAction(
  providerId: string,
) {
  if (
    !z
      .string()
      .uuid()
      .safeParse(providerId).success
  ) {
    return {
      success: false as const,
      error:
        "مقدم الخدمة غير موجود",
    };
  }

  try {
    const supabase =
      await createServerSupabaseClient();

    const { data, error } =
      await supabase.rpc(
        "get_public_provider_profile",
        {
          p_provider_id:
            providerId,
        },
      );

    if (error || !data) {
      return {
        success: false as const,
        error:
          "مقدم الخدمة غير موجود أو غير متاح",
      };
    }

    const provider =
      data as Record<
        string,
        unknown
      >;

    const origin =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      "";

    provider.avatar_path =
      mediaUrl(
        origin,
        typeof provider.avatar_path ===
          "string"
          ? provider.avatar_path
          : null,
      );

    provider.cover_path =
      mediaUrl(
        origin,
        typeof provider.cover_path ===
          "string"
          ? provider.cover_path
          : null,
      );

    if (
      Array.isArray(
        provider.listings,
      )
    ) {
      provider.listings =
        provider.listings.map(
          (listing) => ({
            ...listing,
            image_path: mediaUrl(
              origin,
              typeof listing.image_path ===
                "string"
                ? listing.image_path
                : null,
            ),
          }),
        );
    }

    if (
      Array.isArray(provider.posts)
    ) {
      provider.posts =
        provider.posts.map(
          (
            post: Record<
              string,
              unknown
            >,
          ) => ({
            ...post,
            media: Array.isArray(
              post.media,
            )
              ? post.media.map(
                  (
                    item: Record<
                      string,
                      unknown
                    >,
                  ) => ({
                    ...item,
                    path: mediaUrl(
                      origin,
                      typeof item.path ===
                        "string"
                        ? item.path
                        : null,
                    ),
                  }),
                )
              : [],
          }),
        );
    }

    return {
      success: true as const,
      provider,
    };
  } catch {
    return {
      success: false as const,
      error:
        "تعذر تحميل ملف مقدم الخدمة",
    };
  }
}

