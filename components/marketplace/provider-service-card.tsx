import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  formatListingPrice,
  type ServiceProviderResult,
} from "@/lib/marketplace";

export default function ProviderServiceCard({
  result,
}: {
  result: ServiceProviderResult;
}) {
  const years = result.provider_experience_start_year
    ? Math.max(
        0,
        new Date().getFullYear() - result.provider_experience_start_year,
      )
    : null;

  return (
    <article className="group overflow-hidden rounded-3xl border border-theme bg-surface shadow-soft transition hover:-translate-y-1">
      <div className="grid min-w-0 sm:grid-cols-[150px_minmax(0,1fr)_180px]">
        <Link
          href={`/listings/${result.listing_slug}`}
          className="relative aspect-[16/10] overflow-hidden bg-[rgb(var(--primary-soft))] sm:aspect-auto sm:min-h-[210px]"
        >
          {result.image_path ? (
            <Image
              src={result.image_path}
              alt=""
              fill
              sizes="150px"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(var(--primary)/0.12)] text-2xl font-bold text-brand">
                {result.provider_name.slice(0, 1)}
              </span>
            </div>
          )}
        </Link>

        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/providers/${result.provider_id}`}
              className="truncate text-base font-bold hover:text-brand"
            >
              {result.provider_name}
            </Link>
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-[rgb(var(--success))]"
              aria-label="مقدم خدمة معتمد"
            />
            {result.available_now && (
              <span className="rounded-full bg-[rgb(var(--success)/0.1)] px-2 py-1 text-[9px] font-bold text-[rgb(var(--success))]">
                متاح الآن
              </span>
            )}
          </div>

          {result.provider_headline && (
            <p className="mt-1 truncate text-xs text-muted">
              {result.provider_headline}
            </p>
          )}

          <h3 className="mt-4 line-clamp-2 text-base font-bold leading-7">
            <Link
              href={`/listings/${result.listing_slug}`}
              className="hover:text-brand"
            >
              {result.listing_title}
            </Link>
          </h3>

          <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
            {result.listing_summary}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted">
            {result.review_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[rgb(var(--warning))] text-[rgb(var(--warning))]" />
                {result.average_rating} ({result.review_count})
              </span>
            )}

            {years != null && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {years} سنوات خبرة
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {result.completed_booking_count} مكتملة
            </span>

            {result.service_areas.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {result.service_areas.slice(0, 2).join("، ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-theme bg-surface-muted/40 p-5 sm:border-s sm:border-t-0">
          <div>
            <p className="text-[10px] font-bold text-muted">السعر</p>
            <strong className="mt-1 block text-lg font-bold text-brand">
              {formatListingPrice(result)}
            </strong>
          </div>

          <div className="mt-5 space-y-2">
            <Link
              href={`/providers/${result.provider_id}`}
              className="secondary-button w-full"
            >
              عرض الملف
            </Link>

            <Link
              href={`/listings/${result.listing_slug}`}
              className="brand-button w-full"
            >
              شوف عرضه
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
