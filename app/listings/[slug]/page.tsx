import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
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
import { getListingBySlugAction } from "@/lib/actions/marketplace-discovery";
import {
  deliveryTypeLabels,
  formatListingPrice,
  pricingModelLabels,
} from "@/lib/marketplace";
import ListingActionsClient from "./_components/listing-actions-client";
import MessageProviderButton from "@/components/marketplace/message-provider-button";
import MobileStickyActionBar from "@/components/marketplace/mobile-sticky-action-bar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getListingBySlugAction(slug);

  if (!result.success || !result.listing) {
    return { title: "عرض غير موجود" };
  }

  return {
    title: result.listing.title,
    description: result.listing.short_description,
  };
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getListingBySlugAction(slug);

  if (!result.success || !result.listing) notFound();

  const listing = result.listing;
  const provider = result.provider || {};
  const media = result.media || [];
  const providerName = text(provider.name, "مقدم خدمة");
  const rating = number(provider.average_rating);
  const reviewCount = number(provider.review_count);
  const completed = number(provider.completed_bookings);
  const priceFormatted = formatListingPrice(listing);
  const isDirect = listing.pricing_model === "FIXED";

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10">
      <nav
        aria-label="مسار الصفحة"
        className="mb-4 text-[11px] font-bold text-muted"
      >
        <Link href="/discover" className="hover:text-brand">
          استكشاف
        </Link>
        <span className="mx-2">/</span>
        <span>{listing.service_categories?.name_ar || "الخدمات"}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[2.2rem] border border-theme bg-surface shadow-soft">
            <div className="relative aspect-[16/9] min-h-[260px] bg-[#dff3ef] sm:min-h-[320px]">
              {media[0]?.url ? (
                <Image
                  src={media[0].url}
                  alt={listing.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 70vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#065b60] to-[#0b817a]">
                  <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[26px] border-white/10" />
                  <div className="absolute -bottom-24 right-[12%] h-52 w-52 rounded-full bg-[#ffc985]/18" />
                  <div className="relative flex h-full items-end p-6 text-white sm:p-8">
                    <div>
                      <p className="text-[11px] font-black text-[#c9eee8]">
                        عرض خدمة على جسر
                      </p>
                      <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight tracking-[-.05em] sm:text-4xl">
                        {listing.title}
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {media.length > 1 && (
                <span className="absolute bottom-4 end-4 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
                  <Images size={13} />
                  {media.length} صور
                </span>
              )}
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand font-black">
                  {listing.service_categories?.name_ar || "خدمة"}
                </span>
                <span className="status-pill bg-surface-muted">
                  {deliveryTypeLabels[listing.delivery_type]}
                </span>
                <span className="status-pill bg-surface-muted">
                  {pricingModelLabels[listing.pricing_model]}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black leading-9 tracking-[-.04em] sm:text-3xl sm:leading-10">
                {listing.title}
              </h1>

              <p className="mt-3 text-xs leading-6 text-muted sm:text-sm sm:leading-7">
                {listing.short_description}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-2 border-y border-theme py-4 text-center sm:text-start">
                <div>
                  <p className="text-[10px] font-bold text-muted">السعر التقديري</p>
                  <strong className="mt-1 block text-base font-black text-brand sm:text-lg">
                    {priceFormatted}
                  </strong>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted">الوقت التقريبي</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold">
                    <Clock3 className="h-3.5 w-3.5 text-brand" />
                    {listing.estimated_duration_minutes
                      ? `${listing.estimated_duration_minutes} دقيقة`
                      : "حسب الطلب"}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted">طريقة التنفيذ</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold">
                    {listing.remote_available ? (
                      <Monitor className="h-3.5 w-3.5 text-brand" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-brand" />
                    )}
                    {listing.remote_available
                      ? "عن بُعد"
                      : strings(listing.service_areas)[0] || "ميداني"}
                  </span>
                </div>
              </div>

              <section className="mt-7" aria-labelledby="description-title">
                <p className="text-[10px] font-black text-brand">ماذا تشمل الخدمة؟</p>
                <h2 id="description-title" className="mt-1 text-lg font-black">
                  تفاصيل العرض
                </h2>

                <p className="mt-3 whitespace-pre-wrap text-xs leading-7 sm:text-sm sm:leading-8 text-[rgb(var(--text-main))]">
                  {listing.description}
                </p>
              </section>

              {media.length > 1 && (
                <section className="mt-8 border-t border-theme pt-6">
                  <p className="text-[10px] font-black text-brand">معرض الصور</p>
                  <h2 className="mt-1 text-lg font-black">نماذج من التنفيذ</h2>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {media
                      .slice(1, 7)
                      .filter((item): item is typeof item & { url: string } =>
                        typeof item.url === "string" && item.url.length > 0
                      )
                      .map((item, index) => (
                        <div
                          key={item.storage_path || `${item.url}-${index}`}
                          className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted"
                        >
                          <Image
                            src={item.url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 45vw, 220px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar / Actions */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft">
            <div className="bg-[#0b817a] p-5 text-white">
              <p className="text-[10px] font-black text-[#c9eee8]">مقدم الخدمة</p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">
                  {providerName.slice(0, 1)}
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/providers/${listing.provider_id}`}
                    className="truncate text-base font-black hover:text-[#ffc985] transition-colors"
                  >
                    {providerName}
                  </Link>

                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#c9eee8]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    مقدم خدمة موثق
                  </p>
                </div>
              </div>

              {text(provider.headline) && (
                <p className="mt-3 text-xs leading-6 text-white/85">
                  {text(provider.headline)}
                </p>
              )}
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-surface-muted p-3">
                  <strong className="block text-base font-black">{completed}</strong>
                  <span className="text-[10px] font-bold text-muted">خدمة منجزة</span>
                </div>

                <div className="rounded-2xl bg-surface-muted p-3">
                  <strong className="flex items-center justify-center gap-1 text-base font-black">
                    {rating || "—"}
                    <Star className="h-3.5 w-3.5 text-[rgb(var(--warning))] fill-current" />
                  </strong>
                  <span className="text-[10px] font-bold text-muted">
                    {reviewCount} تقييم
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/providers/${listing.provider_id}`}
                  className="secondary-button !min-h-[42px] !rounded-xl !px-2 text-xs font-bold"
                >
                  الملف المهني
                </Link>

                <MessageProviderButton
                  providerId={listing.provider_id}
                  listingId={listing.id}
                  className="secondary-button !min-h-[42px] !rounded-xl !px-2 text-xs font-bold"
                />
              </div>
            </div>
          </section>

          <div id="booking-action-card">
            <ListingActionsClient
              listingId={listing.id}
              deliveryType={listing.delivery_type}
              pricingModel={listing.pricing_model}
            />
          </div>

          <div className="rounded-2xl border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.04)] p-4 text-[11px] leading-6 text-muted">
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--success))]" />
              الطلب والتواصل داخل منصة جسر يحفظ تفاصيل الاتفاق والمبالغ بشكل آمن لكلا الطرفين.
            </p>
          </div>
        </aside>
      </div>

      {/* Floating Mobile Sticky Action Bar */}
      <MobileStickyActionBar
        providerId={listing.provider_id}
        listingId={listing.id}
        priceFormatted={priceFormatted}
        isDirectBooking={isDirect}
      />
    </main>
  );
}