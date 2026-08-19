export const DELIVERY_TYPES = ["ON_SITE", "REMOTE", "HYBRID", "SESSION", "PROJECT"] as const;
export const PRICING_MODELS = ["FIXED", "STARTING_FROM", "HOURLY", "PER_SESSION", "QUOTE_REQUIRED"] as const;
export const LISTING_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED"] as const;
export const POST_TYPES = ["TEXT", "IMAGE", "BEFORE_AFTER", "PORTFOLIO", "TIP", "PROMOTION"] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number];
export type PricingModel = (typeof PRICING_MODELS)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type PostType = (typeof POST_TYPES)[number];

export const deliveryTypeLabels: Record<DeliveryType, string> = {
  ON_SITE: "في الموقع",
  REMOTE: "عن بُعد",
  HYBRID: "حضوري وعن بُعد",
  SESSION: "جلسة",
  PROJECT: "مشروع",
};

export const pricingModelLabels: Record<PricingModel, string> = {
  FIXED: "سعر ثابت",
  STARTING_FROM: "يبدأ من",
  HOURLY: "بالساعة",
  PER_SESSION: "لكل جلسة",
  QUOTE_REQUIRED: "حسب عرض السعر",
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  DRAFT: "مسودة",
  PENDING_REVIEW: "قيد المراجعة",
  PUBLISHED: "منشور",
  PAUSED: "متوقف",
  REJECTED: "مرفوض",
};

export interface MarketplaceCategory {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  requires_moderation: boolean;
  children?: MarketplaceCategory[];
}

export interface ServiceListing {
  id: string;
  provider_id: string;
  legacy_service_id?: string | null;
  category_id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  delivery_type: DeliveryType;
  pricing_model: PricingModel;
  base_price: number | null;
  currency: "JOD";
  estimated_duration_minutes: number | null;
  service_areas: string[];
  remote_available: boolean;
  status: ListingStatus;
  moderation_notes?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  service_categories?: Pick<MarketplaceCategory, "id" | "name_ar" | "slug" | "parent_id"> | null;
}

export interface MarketplaceSearchResult {
  result_type: "LISTING" | "PROVIDER" | "POST";
  result_id: string;
  title: string;
  summary: string;
  href: string;
  image_path: string | null;
  metadata: Record<string, unknown>;
  relevance: number;
}

export interface ServiceTypeDefinition {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name?: string | null;
  parent_category_id?: string | null;
  parent_category_name?: string | null;
}

export interface ServiceProviderResult {
  listing_id: string;
  listing_slug: string;
  listing_title: string;
  listing_summary: string;
  pricing_model: PricingModel;
  base_price: number | null;
  currency: "JOD";
  delivery_type: DeliveryType;
  service_areas: string[];
  remote_available: boolean;
  image_path: string | null;
  provider_id: string;
  provider_name: string;
  provider_avatar_path: string | null;
  provider_headline: string | null;
  provider_experience_start_year: number | null;
  experience_verified: boolean;
  average_rating: number;
  review_count: number;
  completed_booking_count: number;
  active_service_count: number;
  available_now: boolean;
}

export function formatListingPrice(listing: Pick<ServiceListing, "pricing_model" | "base_price" | "currency">) {
  if (listing.pricing_model === "QUOTE_REQUIRED" || listing.base_price == null) return "اطلب عرض سعر";
  const value = new Intl.NumberFormat("ar-JO", { maximumFractionDigits: 2 }).format(listing.base_price);
  const prefix = listing.pricing_model === "STARTING_FROM" ? "يبدأ من " : "";
  const suffix = listing.pricing_model === "HOURLY" ? " / ساعة" : listing.pricing_model === "PER_SESSION" ? " / جلسة" : "";
  return `${prefix}${value} د.أ${suffix}`;
}
