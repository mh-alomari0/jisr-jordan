import Image from "next/image";
import Link from "next/link";
import { Briefcase, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
import { formatListingPrice, type ServiceProviderResult } from "@/lib/marketplace";

export default function ProviderServiceCard({ result }: { result: ServiceProviderResult }) {
  const years = result.provider_experience_start_year
    ? Math.max(0, new Date().getFullYear() - result.provider_experience_start_year)
    : null;
  return (
    <article className="group grid min-w-0 gap-4 border-b border-theme py-5 sm:grid-cols-[144px_minmax(0,1fr)_auto] sm:items-center">
      <Link href={`/listings/${result.listing_slug}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted sm:aspect-square">
        {result.image_path ? <Image src={result.image_path} alt="" fill sizes="144px" className="object-cover transition group-hover:scale-[1.02]" /> : (
          <div className="flex h-full items-center justify-center text-2xl font-black text-brand/60">جسر</div>
        )}
      </Link>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/providers/${result.provider_id}`} className="truncate font-black hover:text-brand">{result.provider_name}</Link>
          <ShieldCheck className="h-4 w-4 shrink-0 text-[rgb(var(--success))]" aria-label="مقدم خدمة معتمد" />
          {result.available_now && <span className="text-[10px] font-bold text-[rgb(var(--success))]">متاح الآن</span>}
        </div>
        {result.provider_headline && <p className="mt-1 truncate text-xs text-muted">{result.provider_headline}</p>}
        <h2 className="mt-3 line-clamp-2 text-base font-black leading-7">
          <Link href={`/listings/${result.listing_slug}`} className="hover:text-brand">{result.listing_title}</Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{result.listing_summary}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted">
          {result.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[rgb(var(--warning))] text-[rgb(var(--warning))]" /> {result.average_rating} ({result.review_count})</span>}
          {years != null && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {years} سنوات خبرة {result.experience_verified ? "موثقة" : "مصرّح بها"}</span>}
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {result.completed_booking_count} خدمة مكتملة</span>
          {result.service_areas.length > 0 && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {result.service_areas.slice(0, 2).join("، ")}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:block sm:min-w-32 sm:text-left">
        <strong className="block text-sm text-brand">{formatListingPrice(result)}</strong>
        <div className="mt-0 flex gap-2 sm:mt-4 sm:block">
          <Link href={`/providers/${result.provider_id}`} className="secondary-button !min-h-9 !px-3 text-xs">عرض الملف</Link>
          <Link href={`/listings/${result.listing_slug}`} className="brand-button ms-0 mt-0 !min-h-9 !px-3 text-xs sm:ms-2">طلب الخدمة</Link>
        </div>
      </div>
    </article>
  );
}
