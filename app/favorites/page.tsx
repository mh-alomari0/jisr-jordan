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
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
      <header className="border-b border-theme pb-5">
        <p className="text-[11px] font-bold text-brand">المفضلة</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">الأشياء اللي حفظتها</h1>
            <p className="mt-1 text-sm text-muted">
              ارجع للخدمات ومقدمي الخدمة اللي لفتوا انتباهك.
            </p>
          </div>
          <span className="text-xs text-muted">{favorites.length} محفوظ</span>
        </div>
      </header>

      {favorites.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                className="flex min-h-44 flex-col justify-between rounded-2xl border border-theme bg-surface p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-muted">
                      {isListing ? "خدمة" : "مقدم خدمة"}
                    </span>
                    <h2 className="mt-1 truncate text-sm font-bold">
                      <Link href={href} className="hover:text-brand">
                        {title}
                      </Link>
                    </h2>
                    {summary && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {summary}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={href}
                  className="mt-4 flex items-center justify-between border-t border-theme pt-3 text-xs font-bold text-brand"
                >
                  <span>{isListing ? "عرض الخدمة" : "عرض الملف"}</span>
                  <ArrowLeft size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-theme px-5 py-12 text-center">
          <Heart className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-sm font-bold">ما حفظت شيء لسا</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted">
            لما تلاقي خدمة أو مقدم خدمة مناسب، احفظه وبتلاقيه هون.
          </p>
          <Link href="/discover" className="brand-button mt-4">
            استكشف الخدمات
          </Link>
        </section>
      )}
    </main>
  );
}
