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

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-11">
      <nav
        aria-label="مسار الصفحة"
        className="mb-5 text-[10px] text-muted"
      >
        <Link href="/discover" className="hover:text-brand">
          استكشاف
        </Link>
        <span className="mx-1">/</span>
        {listing.service_categories?.name_ar || "الخدمات"}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-[2.1rem] border border-theme bg-surface shadow-soft">
            <div className="relative aspect-[16/8] min-h-[280px] bg-[#dff3ef]">
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
                <div className="absolute inset-0 bg-[#0b817a]">
                  <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[26px] border-white/10" />
                  <div className="absolute -bottom-24 right-[12%] h-52 w-52 rounded-full bg-[#ffc985]/18" />
                  <div className="relative flex h-full items-end p-7 text-white">
                    <div>
                      <p className="text-[10px] font-bold text-[#c9eee8]">
                        عرض خدمة على جسر
                      </p>
                      <h2 className="mt-2 max-w-xl text-3xl font-bold leading-tight tracking-[-.05em]">
                        {listing.title}
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {media.length > 1 && (
                <span className="absolute bottom-4 end-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-[10px] font-bold text-white backdrop-blur">
                  <Images size={13} />
                  {media.length} صور
                </span>
              )}
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand">
                  {listing.service_categories?.name_ar || "خدمة"}
                </span>
                <span className="status-pill bg-surface-muted">
                  {deliveryTypeLabels[listing.delivery_type]}
                </span>
                <span className="status-pill bg-surface-muted">
                  {pricingModelLabels[listing.pricing_model]}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold leading-10 tracking-[-.04em] sm:text-4xl">
                {listing.title}
              </h1>

              <p className="mt-3 text-sm leading-7 text-muted">
                {listing.short_description}
              </p>

              <div className="mt-6 grid gap-3 border-y border-theme py-5 sm:grid-cols-3">
                <div>
                  <p className="text-[9px] font-bold text-muted">
                    السعر
                  </p>
                  <strong className="mt-1 block text-lg font-bold text-brand">
                    {formatListingPrice(listing)}
                  </strong>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-muted">
                    الوقت التقريبي
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold">
                    <Clock3 className="h-4 w-4 text-brand" />
                    {listing.estimated_duration_minutes
                      ? `${listing.estimated_duration_minutes} دقيقة`
                      : "حسب تفاصيل الطلب"}
                  </span>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-muted">
                    مكان الخدمة
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold">
                    {listing.remote_available ? (
                      <Monitor className="h-4 w-4 text-brand" />
                    ) : (
                      <MapPin className="h-4 w-4 text-brand" />
                    )}
                    {listing.remote_available
                      ? "متاح عن بُعد"
                      : strings(listing.service_areas).join("، ") ||
                        "حسب منطقة الخدمة"}
                  </span>
                </div>
              </div>

              <section
                className="mt-7"
                aria-labelledby="description-title"
              >
                <p className="text-[10px] font-bold text-brand">
                  شو بتشمل الخدمة؟
                </p>
                <h2
                  id="description-title"
                  className="mt-1 text-xl font-bold"
                >
                  تفاصيل العرض
                </h2>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-8">
                  {listing.description}
                </p>
              </section>

              {media.length > 1 && (
                <section className="mt-8 border-t border-theme pt-7">
                  <p className="text-[10px] font-bold text-brand">
                    صور من الشغل
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    شوف قبل ما تطلب
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {media
                      .slice(1, 7)
                      .filter(
                        (item): item is typeof item & { url: string } =>
                          typeof item.url === "string" && item.url.length > 0,
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

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-[1.9rem] border border-theme bg-surface shadow-soft">
            <div className="bg-[#0b817a] p-5 text-white">
              <p className="text-[9px] font-bold text-[#c9eee8]">
                مقدم الخدمة
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold">
                  {providerName.slice(0, 1)}
                </div>

                <div className="min-w-0">
                  <Link
                    href={"/providers/" + listing.provider_id}
                    className="truncate text-base font-bold hover:text-[#ffc985]"
                  >
                    {providerName}
                  </Link>

                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[#c9eee8]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    مقدم خدمة معتمد
                  </p>
                </div>
              </div>

              {text(provider.headline) && (
                <p className="mt-4 text-[11px] leading-6 text-white/75">
                  {text(provider.headline)}
                </p>
              )}
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-surface-muted p-3">
                  <strong className="block text-lg">
                    {completed}
                  </strong>
                  <span className="text-[9px] text-muted">
                    خدمات مكتملة
                  </span>
                </div>

                <div className="rounded-2xl bg-surface-muted p-3">
                  <strong className="flex items-center justify-center gap-1 text-lg">
                    {rating || "—"}
                    <Star className="h-3.5 w-3.5 text-[rgb(var(--warning))]" />
                  </strong>
                  <span className="text-[9px] text-muted">
                    {reviewCount} تقييم
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={"/providers/" + listing.provider_id}
                  className="secondary-button w-full !px-2 text-[10px]"
                >
                  الملف المهني
                </Link>

                <MessageProviderButton
                  providerId={listing.provider_id}
                  listingId={listing.id}
                  className="secondary-button w-full !px-2 text-[10px]"
                />
              </div>
            </div>
          </section>

          <ListingActionsClient
            listingId={listing.id}
            deliveryType={listing.delivery_type}
            pricingModel={listing.pricing_model}
          />

          <div className="rounded-[1.5rem] border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.045)] p-4 text-[10px] leading-6 text-muted">
            <p className="flex gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--success))]" />
              التواصل والطلب داخل جسر يحفظ تفاصيل الطلب والمبلغ
              والحالة للطرفين. لا ترسل بيانات اتصال شخصية داخل وصف
              الطلب قبل اكتمال المسار المسموح.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-[#f8e0d6] p-4 text-[#743b35]">
            <p className="flex items-center gap-1.5 text-[10px] font-bold">
              <Sparkles size={13} />
              نصيحة قبل الحجز
            </p>
            <p className="mt-2 text-[10px] leading-6 opacity-80">
              قارن السعر، التقييم، الأعمال السابقة وطريقة التقديم قبل
              تأكيد طلبك.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
