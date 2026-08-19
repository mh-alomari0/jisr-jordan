import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Monitor, ShieldCheck } from "lucide-react";
import { deliveryTypeLabels, formatListingPrice, pricingModelLabels, type ServiceListing } from "@/lib/marketplace";

export default function ListingCard({
  listing,
  imageUrl,
  providerName,
}: {
  listing: ServiceListing;
  imageUrl?: string | null;
  providerName?: string | null;
}) {
  return (
    <article className="surface-card group flex h-full min-w-0 flex-col overflow-hidden">
      <Link href={`/listings/${listing.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-[rgb(var(--primary-soft))]">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="(max-width: 768px) 90vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-black text-brand/60" aria-hidden="true">جسر</div>
        )}
        <span className="status-pill absolute end-3 top-3 bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--text-main))] backdrop-blur">
          {pricingModelLabels[listing.pricing_model]}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span>{listing.service_categories?.name_ar || "خدمة"}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1">
            {listing.remote_available ? <Monitor className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {deliveryTypeLabels[listing.delivery_type]}
          </span>
        </div>
        <div>
          <h3 className="line-clamp-2 text-base font-black leading-7 text-[rgb(var(--text-main))]">
            <Link href={`/listings/${listing.slug}`}>{listing.title}</Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{listing.short_description}</p>
        </div>
        {providerName && (
          <p className="inline-flex items-center gap-1.5 text-xs font-bold">
            <ShieldCheck className="h-4 w-4 text-[rgb(var(--success))]" aria-hidden="true" />
            {providerName}
          </p>
        )}
        {listing.estimated_duration_minutes && (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            مدة تقديرية: {listing.estimated_duration_minutes} دقيقة
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-theme pt-3">
          <strong className="text-sm text-brand">{formatListingPrice(listing)}</strong>
          <Link href={`/listings/${listing.slug}`} aria-label={`عرض تفاصيل ${listing.title}`}
            className="inline-flex items-center gap-1 text-xs font-black text-[rgb(var(--text-main))] hover:text-brand">
            التفاصيل <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

