import Image from "next/image";
import Link from "next/link";
import { FileText, Store, UserRound } from "lucide-react";
import type { MarketplaceSearchResult } from "@/lib/marketplace";

const labels = { LISTING: "خدمة", PROVIDER: "مقدم خدمة", POST: "منشور" } as const;
const icons = { LISTING: Store, PROVIDER: UserRound, POST: FileText } as const;

export default function SearchResultCard({ result }: { result: MarketplaceSearchResult }) {
  const Icon = icons[result.result_type];
  return (
    <article className="surface-card flex min-w-0 gap-3 p-3 sm:p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[rgb(var(--primary-soft))] sm:h-24 sm:w-28">
        {result.image_path ? (
          <Image src={result.image_path} alt="" fill sizes="112px" className="object-cover" />
        ) : (
          <Icon className="absolute inset-0 m-auto h-8 w-8 text-brand" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold text-brand">{labels[result.result_type]}</span>
        <h2 className="truncate text-sm font-black sm:text-base">
          <Link href={result.href} className="hover:text-brand">{result.title}</Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{result.summary}</p>
        {result.result_type === "LISTING" && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
            {typeof result.metadata.category_name === "string" && <span>{result.metadata.category_name}</span>}
            {typeof result.metadata.provider_name === "string" && <span>بواسطة {result.metadata.provider_name}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

