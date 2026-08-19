"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { moderateMarketplaceListingAction } from "@/lib/actions/marketplace-admin";

interface AdminListingRow {
  id: string; slug: string; title: string; short_description: string; provider_name: string;
  delivery_type: string; pricing_model: string; base_price: number | null; status: string;
  moderation_notes: string | null; updated_at: string;
  service_categories?: { id: string; name_ar: string } | null;
}

export default function AdminListingsClient({ listings }: { listings: AdminListingRow[] }) {
  const router = useRouter();
  const moderate = async (listing: AdminListingRow, decision: "APPROVE" | "REJECT" | "DEACTIVATE") => {
    const notes = decision === "APPROVE" ? "" : window.prompt("سبب القرار الذي سيظهر لمقدم الخدمة:", listing.moderation_notes || "") ?? "";
    if (decision !== "APPROVE" && !notes.trim()) return;
    const result = await moderateMarketplaceListingAction(listing.id, decision, notes);
    if (!result.success) window.alert(result.error || "تعذر تنفيذ القرار"); else router.refresh();
  };
  return listings.length ? <div className="grid gap-4 xl:grid-cols-2">{listings.map((listing) => (
    <article key={listing.id} className="surface-card p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="status-pill bg-surface-muted">{listing.status}</span><h2 className="mt-2 truncate font-black"><Link href={"/listings/" + listing.slug} className="hover:text-brand">{listing.title}</Link></h2><p className="mt-1 text-xs text-muted">{listing.provider_name} · {listing.service_categories?.name_ar || "تصنيف"}</p></div><strong className="text-sm text-brand">{listing.base_price ? listing.base_price + " د.أ" : "عرض سعر"}</strong></div>
      <p className="mt-3 line-clamp-3 text-xs leading-6">{listing.short_description}</p>
      {listing.moderation_notes && <p className="mt-3 rounded-xl bg-surface-muted p-3 text-xs">آخر ملاحظة: {listing.moderation_notes}</p>}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-theme pt-4">
        {listing.status !== "PUBLISHED" && <button type="button" onClick={() => moderate(listing, "APPROVE")} className="brand-button !min-h-9 !px-3 !py-1">اعتماد ونشر</button>}
        <button type="button" onClick={() => moderate(listing, "REJECT")} className="secondary-button !min-h-9 !px-3 text-[rgb(var(--danger))]">رفض</button>
        {listing.status === "PUBLISHED" && <button type="button" onClick={() => moderate(listing, "DEACTIVATE")} className="secondary-button !min-h-9 !px-3">إيقاف</button>}
      </div>
    </article>
  ))}</div> : <div className="surface-card p-10 text-center text-sm text-muted">لا توجد عروض ضمن هذا المرشح.</div>;
}

