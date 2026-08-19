import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, MapPin, Monitor, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getListingBySlugAction } from "@/lib/actions/marketplace-discovery";
import { deliveryTypeLabels, formatListingPrice, pricingModelLabels } from "@/lib/marketplace";
import ListingActionsClient from "./_components/listing-actions-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getListingBySlugAction(slug);
  if (!result.success || !result.listing) return { title: "عرض غير موجود" };
  return { title: result.listing.title, description: result.listing.short_description };
}

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function number(value: unknown) { return typeof value === "number" ? value : Number(value || 0); }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <nav aria-label="مسار الصفحة" className="mb-4 text-xs text-muted">
        <Link href="/discover" className="hover:text-brand">استكشاف</Link> <span aria-hidden="true">/</span> {listing.service_categories?.name_ar || "الخدمات"}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <section className="surface-card overflow-hidden">
            <div className="relative aspect-[16/8] bg-[rgb(var(--primary-soft))]">
              {media[0]?.url ? <Image src={media[0].url} alt={listing.title} fill priority sizes="(max-width: 1024px) 100vw, 70vw" className="object-cover" /> : (
                <div className="flex h-full items-center justify-center text-5xl font-black text-brand/50">جسر</div>
              )}
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand">{listing.service_categories?.name_ar || "خدمة"}</span>
                <span className="status-pill bg-surface-muted">{deliveryTypeLabels[listing.delivery_type]}</span>
                <span className="status-pill bg-surface-muted">{pricingModelLabels[listing.pricing_model]}</span>
              </div>
              <h1 className="mt-4 text-2xl font-black leading-10 sm:text-3xl">{listing.title}</h1>
              <p className="mt-2 text-sm leading-7 text-muted">{listing.short_description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-theme py-4">
                <strong className="text-xl text-brand">{formatListingPrice(listing)}</strong>
                {listing.estimated_duration_minutes && <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock3 className="h-4 w-4" /> {listing.estimated_duration_minutes} دقيقة تقريباً</span>}
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  {listing.remote_available ? <Monitor className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  {listing.remote_available ? "متاح عن بُعد" : strings(listing.service_areas).join("، ") || "حسب منطقة الخدمة"}
                </span>
              </div>
              <section className="mt-6" aria-labelledby="description-title">
                <h2 id="description-title" className="text-lg font-black">تفاصيل الخدمة</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-8">{listing.description}</p>
              </section>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="surface-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--primary-soft))] text-lg font-black text-brand">{providerName.slice(0, 1)}</div>
              <div className="min-w-0">
                <Link href={"/providers/" + listing.provider_id} className="font-black hover:text-brand">{providerName}</Link>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[rgb(var(--success))]"><ShieldCheck className="h-3.5 w-3.5" /> مقدم خدمة معتمد</p>
              </div>
            </div>
            {text(provider.headline) && <p className="mt-3 text-xs leading-6 text-muted">{text(provider.headline)}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-surface-muted p-3"><strong className="block text-base">{completed}</strong><span className="text-muted">طلبات مكتملة</span></div>
              <div className="rounded-xl bg-surface-muted p-3"><strong className="flex items-center justify-center gap-1 text-base">{rating || "—"}<Star className="h-3.5 w-3.5 text-[rgb(var(--warning))]" /></strong><span className="text-muted">{reviewCount} تقييم</span></div>
            </div>
            <Link href={"/providers/" + listing.provider_id} className="secondary-button mt-4 w-full">عرض الملف المهني</Link>
          </section>
          <ListingActionsClient listingId={listing.id} deliveryType={listing.delivery_type} pricingModel={listing.pricing_model} />
          <div className="surface-card p-4 text-[11px] leading-6 text-muted">
            <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--success))]" /> لا ترسل بيانات اتصال أو تدفع خارج مسار الطلب. سجل المنصة يحمي الطرفين ويثبت المبلغ والعمولة والحالة.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
