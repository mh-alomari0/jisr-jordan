import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  MapPin,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import type { MarketplaceSearchResult } from "@/lib/marketplace";

const labels = {
  LISTING: "خدمة",
  PROVIDER: "مقدم خدمة",
  POST: "عمل مهني",
} as const;

const icons = {
  LISTING: Store,
  PROVIDER: UserRound,
  POST: FileText,
} as const;

function stringValue(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(
  metadata: Record<string, unknown>,
  key: string,
): number | null {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function SearchResultCard({
  result,
}: {
  result: MarketplaceSearchResult;
}) {
  const Icon = icons[result.result_type];
  const category = stringValue(result.metadata, "category_name");
  const provider = stringValue(result.metadata, "provider_name");
  const city =
    stringValue(result.metadata, "city") ??
    stringValue(result.metadata, "service_area");

  const rating =
    numberValue(result.metadata, "average_rating") ??
    numberValue(result.metadata, "rating");

  const reviews =
    numberValue(result.metadata, "review_count") ??
    numberValue(result.metadata, "reviews_count");

  const completedJobs =
    numberValue(result.metadata, "completed_booking_count") ??
    numberValue(result.metadata, "completed_jobs");

  const verified =
    result.metadata.is_verified === true ||
    result.metadata.verified === true;

  return (
    <article className="group surface-card flex min-w-0 flex-col overflow-hidden active:scale-[0.98]">
      <Link
        href={result.href}
        className="relative block aspect-[16/10] overflow-hidden bg-[rgb(var(--primary-soft))]"
      >
        {result.image_path ? (
          <Image
            src={result.image_path}
            alt={result.title}
            fill
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[rgb(var(--primary-soft))] to-surface-muted">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(var(--primary)/0.12)] text-brand shadow-inner">
              <Icon className="h-8 w-8" aria-hidden="true" />
            </span>
          </div>
        )}

        <span className="status-pill absolute start-3 top-3 border border-white/20 bg-[rgb(var(--surface)/0.88)] text-[rgb(var(--text-main))] shadow-sm">
          {labels[result.result_type]}
        </span>

        {verified && (
          <span
            className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--surface)/0.92)] text-brand shadow-sm backdrop-blur-md"
            title="حساب موثق"
          >
            <BadgeCheck className="h-4 w-4 fill-brand text-white" aria-hidden="true" />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {(category || provider) && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand">
            {category && <span>{category}</span>}
            {category && provider && <span className="opacity-40">•</span>}
            {provider && <span className="truncate opacity-85">{provider}</span>}
          </div>
        )}

        <h2 className="mt-2 line-clamp-2 text-[15px] font-black leading-7 tracking-[-.03em]">
          <Link href={result.href} className="hover:text-brand transition-colors">
            {result.title}
          </Link>
        </h2>

        {result.summary && (
          <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
            {result.summary}
          </p>
        )}

        {(rating !== null || completedJobs !== null || city) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-muted">
            {rating !== null && (
              <span className="inline-flex items-center gap-1 text-[rgb(var(--warning))]">
                <Star
                  className="h-3.5 w-3.5 fill-current"
                  aria-hidden="true"
                />
                {rating}
                {reviews !== null && <span className="text-muted font-medium">({reviews})</span>}
              </span>
            )}

            {completedJobs !== null && completedJobs > 0 && (
              <span className="inline-flex items-center gap-1">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {completedJobs} مكتملة
              </span>
            )}

            {city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {city}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-theme pt-3.5">
          <span className="text-[11px] font-bold text-muted group-hover:text-brand transition-colors">
            {result.result_type === "POST"
              ? "تفاصيل العمل"
              : result.result_type === "PROVIDER"
                ? "عرض الملف المهني"
                : "طلب الخدمة"}
          </span>

          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.1)] text-brand transition-all duration-200 group-hover:bg-[rgb(var(--primary))] group-hover:text-white group-hover:scale-105">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}