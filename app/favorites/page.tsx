import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Store,
  UserRound,
} from "lucide-react";
import { getMarketplaceFavoritesAction } from "@/lib/actions/marketplace-favorites";

export const metadata = { title: "المفضلة" };

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

  if (
    !result.success &&
    result.error === "يجب تسجيل الدخول"
  ) {
    redirect("/login?redirectTo=/favorites");
  }

  const favorites = result.favorites || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#f8e0d6] p-6 text-[#743b35] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/30" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/45">
            <Heart size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold opacity-70">
            خزن اللي عجبك
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            ارجع لهم
            <span className="text-[#0b817a]"> بأي وقت.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 opacity-75">
            خدمات ومقدمو خدمة حفظتهم للمقارنة أو للحجز لاحقاً.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              اختياراتك
            </p>
            <h2 className="mt-1 text-2xl font-bold">المفضلة</h2>
            <p className="mt-1 text-xs text-muted">
              {favorites.length} محفوظ
            </p>
          </div>
        </div>

        {favorites.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {favorites.map((favorite) => {
              const listing = record(
                favorite.service_listings,
              );
              const provider = record(favorite.provider);
              const isListing = Boolean(
                favorite.listing_id && listing,
              );

              const href = isListing
                ? "/listings/" + text(listing?.slug)
                : "/providers/" +
                  text(favorite.provider_id);

              const title = isListing
                ? text(listing?.title, "عرض خدمة")
                : text(provider?.name, "مقدم خدمة");

              const summary = isListing
                ? text(listing?.short_description)
                : text(provider?.headline) ||
                  text(provider?.bio);

              const Icon = isListing ? Store : UserRound;

              return (
                <article
                  key={favorite.id}
                  className="group rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-brand">
                        {isListing
                          ? "خدمة محفوظة"
                          : "مقدم خدمة محفوظ"}
                      </span>

                      <h2 className="mt-1 truncate text-base font-bold">
                        <Link
                          href={href}
                          className="hover:text-brand"
                        >
                          {title}
                        </Link>
                      </h2>

                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
                        {summary}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={href}
                    className="mt-5 flex items-center justify-between border-t border-theme pt-4 text-xs font-bold text-brand"
                  >
                    {isListing
                      ? "شوف الخدمة"
                      : "عرض الملف"}
                    <ArrowLeft size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
            <Heart className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-3 font-bold">
              ما حفظت شيئاً بعد
            </p>
            <p className="mt-2 text-xs text-muted">
              استخدم زر القلب على الخدمات أو ملفات مقدمي الخدمة.
            </p>
            <Link href="/discover" className="brand-button mt-4">
              ابدأ الاستكشاف
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
