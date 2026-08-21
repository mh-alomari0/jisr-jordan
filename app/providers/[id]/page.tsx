import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Images,
  MapPin,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/marketplace/favorite-button";
import MessageProviderButton from "@/components/marketplace/message-provider-button";
import { getPublicProviderAction } from "@/lib/actions/marketplace-discovery";
import {
  deliveryTypeLabels,
  pricingModelLabels,
  type DeliveryType,
  type PricingModel,
} from "@/lib/marketplace";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function priceLabel(pricing: PricingModel, basePrice: number | null) {
  if (pricing === "QUOTE_REQUIRED") return "عرض سعر";
  if (basePrice == null) return "حسب التفاصيل";
  if (pricing === "STARTING_FROM") return `من ${basePrice} د.أ`;
  if (pricing === "HOURLY") return `${basePrice} د.أ / ساعة`;
  if (pricing === "PER_SESSION") return `${basePrice} د.أ / جلسة`;
  return `${basePrice} د.أ`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicProviderAction(id);

  if (!result.success || !result.provider) {
    return { title: "مقدم خدمة غير موجود" };
  }

  return {
    title: text(result.provider.name, "مقدم خدمة"),
    description:
      text(result.provider.headline) || text(result.provider.bio),
  };
}

export default async function PublicProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { id } = await params;
  const result = await getPublicProviderAction(id);

  if (!result.success || !result.provider) notFound();

  const provider = result.provider;
  const name = text(provider.name, "مقدم خدمة");
  const listings = records(provider.listings);
  const posts = records(provider.posts);
  const skills = strings(provider.skills);
  const areas = strings(provider.service_areas);
  const rating = number(provider.average_rating);
  const reviews = number(provider.review_count);
  const completed = number(provider.completed_bookings);

  const experienceStartYear = provider.experience_start_year
    ? number(provider.experience_start_year)
    : null;

  const experienceYears = experienceStartYear
    ? Math.max(0, new Date().getFullYear() - experienceStartYear)
    : null;

  const avatar = text(provider.avatar_path);
  const cover = text(provider.cover_path);
  const primaryListing = listings[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 space-y-7">
      {/* Hero Profile Card */}
      <section className="surface-card overflow-hidden !rounded-[2.4rem] shadow-soft">
        <div className="relative h-44 sm:h-64 bg-gradient-to-r from-[#065b60] to-[#0b817a]">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-surface bg-[rgb(var(--primary-soft))] text-3xl font-black text-brand shadow-lg">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  name.slice(0, 1)
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-black sm:text-3xl">{name}</h1>
                  <ShieldCheck className="h-5 w-5 text-[rgb(var(--success))]" />
                </div>
                {text(provider.headline) && (
                  <p className="mt-1 text-xs font-bold text-muted sm:text-sm">
                    {text(provider.headline)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <MessageProviderButton
                providerId={id}
                listingId={primaryListing ? text(primaryListing.id) : null}
                className="secondary-button !min-h-[44px]"
              />

              {primaryListing && (
                <Link
                  href={`/listings/${text(primaryListing.slug)}`}
                  className="brand-button !min-h-[44px]"
                >
                  طلب خدمة
                </Link>
              )}

              <FavoriteButton type="PROVIDER" id={id} />
            </div>
          </div>

          {text(provider.bio) && (
            <p className="mt-5 max-w-3xl text-xs leading-7 sm:text-sm sm:leading-8 text-muted">
              {text(provider.bio)}
            </p>
          )}

          {/* Quick Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-surface-muted p-3.5 text-center">
              <strong className="block text-lg font-black">{completed}</strong>
              <span className="text-[10px] font-bold text-muted">خدمة مكتملة</span>
            </div>

            <div className="rounded-2xl bg-surface-muted p-3.5 text-center">
              <strong className="flex items-center justify-center gap-1 text-lg font-black">
                {rating || "—"}
                <Star className="h-4 w-4 text-[rgb(var(--warning))] fill-current" />
              </strong>
              <span className="text-[10px] font-bold text-muted">{reviews} تقييم</span>
            </div>

            <div className="rounded-2xl bg-surface-muted p-3.5 text-center">
              <strong className="block text-lg font-black">{listings.length}</strong>
              <span className="text-[10px] font-bold text-muted">خدمات معروضة</span>
            </div>

            {experienceYears !== null && (
              <div className="rounded-2xl bg-surface-muted p-3.5 text-center">
                <strong className="block text-lg font-black">{experienceYears} سنوات</strong>
                <span className="text-[10px] font-bold text-muted">خبرة في المجال</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Tab Navigation */}
      <nav className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-theme bg-[rgb(var(--surface)/0.95)] px-4 py-2.5 backdrop-blur-2xl sm:mx-0 sm:rounded-2xl sm:border">
        {[
          ["#provider-listings", "عروض الخدمات"],
          ["#provider-posts", "سابقة الأعمال"],
          ["#provider-reviews", "آراء العملاء"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-black text-muted transition hover:bg-surface-muted hover:text-brand"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Services Listings */}
      <section id="provider-listings" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl font-black">خدمات {name}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <article
              key={text(listing.id)}
              className="surface-card overflow-hidden p-4 space-y-3"
            >
              <h3 className="font-black text-sm line-clamp-1">
                {text(listing.title)}
              </h3>
              <p className="text-xs text-muted line-clamp-2">
                {text(listing.short_description)}
              </p>
              <div className="flex items-center justify-between border-t border-theme pt-3">
                <strong className="text-sm font-black text-brand">
                  {priceLabel(
                    text(listing.pricing_model) as PricingModel,
                    listing.base_price ? number(listing.base_price) : null,
                  )}
                </strong>
                <Link
                  href={`/listings/${text(listing.slug)}`}
                  className="brand-button !min-h-[36px] !px-3 text-xs"
                >
                  التفاصيل
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}