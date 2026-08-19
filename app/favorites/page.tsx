import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Store, UserRound } from "lucide-react";
import { getMarketplaceFavoritesAction } from "@/lib/actions/marketplace-favorites";

export const metadata = { title: "المفضلة" };

function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : null; }
function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }

export default async function FavoritesPage() {
  const result = await getMarketplaceFavoritesAction();
  if (!result.success && result.error === "يجب تسجيل الدخول") redirect("/login?redirectTo=/favorites");
  const favorites = result.favorites || [];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-black"><Heart className="h-6 w-6 text-brand" /> المفضلة</h1><p className="mt-1 text-sm text-muted">عروض ومقدمو خدمة حفظتهم للعودة إليهم.</p></header>
      {favorites.length ? <div className="grid gap-3 sm:grid-cols-2">{favorites.map((favorite) => {
        const listing = record(favorite.service_listings);
        const provider = record(favorite.provider);
        const isListing = Boolean(favorite.listing_id && listing);
        const href = isListing ? "/listings/" + text(listing?.slug) : "/providers/" + text(favorite.provider_id);
        const title = isListing ? text(listing?.title, "عرض خدمة") : text(provider?.name, "مقدم خدمة");
        const summary = isListing ? text(listing?.short_description) : text(provider?.headline) || text(provider?.bio);
        const Icon = isListing ? Store : UserRound;
        return <article key={favorite.id} className="surface-card flex gap-3 p-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand"><Icon className="h-5 w-5" /></span><div className="min-w-0"><span className="text-[10px] font-bold text-brand">{isListing ? "خدمة" : "مقدم خدمة"}</span><h2 className="truncate font-black"><Link href={href} className="hover:text-brand">{title}</Link></h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{summary}</p></div></article>;
      })}</div> : <div className="surface-card p-10 text-center"><Heart className="mx-auto h-9 w-9 text-muted" /><p className="mt-3 font-black">لم تحفظ شيئاً بعد</p><Link href="/discover" className="brand-button mt-4">ابدأ الاستكشاف</Link></div>}
    </div>
  );
}

