import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Store, UserRound } from "lucide-react";
import { getMarketplaceFavoritesAction } from "@/lib/actions/marketplace-favorites";

export const metadata = { title: "المفضلة | جسر الأردن" };

function record(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export default async function FavoritesPage() {
  const result = await getMarketplaceFavoritesAction();

  if (!result.success && result.error === "يجب تسجيل الدخول") {
    redirect("/login?redirectTo=/favorites");
  }

  const favorites = result.favorites || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#fbe3db] to-[#f4d1c6] p-6 text-[#743b35] shadow-soft sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/40" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/60 text-[#743b35] shadow-sm">
            <Heart size={24} className="fill-current" />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">محفوظاتك المفضلة ❤️</h1>
            <p className="mt-1 text-xs text-[#743b35]/80 font-bold sm:text-sm">
              الخدمات والمحترفون الذين حفظتهم للرجوع إليهم لاحقاً.
            </p>
          </div>
        </div>
      </section>

      {/* Grid of Saved Items */}
      {favorites.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite) => {
            const listing = record(favorite.service_listings);
            const provider = record(favorite.provider);
            const isListing = Boolean(favorite.listing_id && listing);

            const href = isListing
              ? "/listings/" + text(listing?.slug)
              : "/providers/" + text(favorite.provider_id);

            const title = isListing
              ? text(listing?.title, "عرض خدمة")
              : text(provider?.name, "مقدم خدمة");

            const summary = isListing
              ? text(listing?.short_description)
              : text(provider?.headline) || text(provider?.bio);

            const Icon = isListing ? Store : UserRound;

            return (
              <article
                key={favorite.id}
                className="surface-card flex flex-col justify-between p-5 space-y-4 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
                    <Icon className="h-6 w-6" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-brand">
                      {isListing ? "خدمة محفوظة" : "مقدم خدمة محفوظ"}
                    </span>
                    <h2 className="mt-1 truncate text-sm font-black">
                      <Link href={href} className="hover:text-brand">
                        {title}
                      </Link>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {summary}
                    </p>
                  </div>
                </div>

                <Link
                  href={href}
                  className="flex items-center justify-between border-t border-theme pt-3 text-xs font-black text-brand"
                >
                  <span>{isListing ? "طلب الخدمة الآن" : "عرض الملف المهني"}</span>
                  <ArrowLeft size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface-card p-12 text-center space-y-3">
          <Heart className="mx-auto h-12 w-12 text-muted/50" />
          <h2 className="text-base font-black">قائمة المفضلة فارغة حالياً</h2>
          <p className="text-xs text-muted max-w-xs mx-auto">
            تصفح الخدمات واضغط على زر القلب لحفظ ما يناسبك للمستقبل.
          </p>
          <Link href="/discover" className="brand-button mt-3">
            استكشف الخدمات المتاحة
          </Link>
        </div>
      )}
    </main>
  );
}