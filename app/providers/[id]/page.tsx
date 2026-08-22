import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/marketplace/favorite-button";
import MessageProviderButton from "@/components/marketplace/message-provider-button";
import { getPublicProviderAction } from "@/lib/actions/marketplace-discovery";
import type { PricingModel } from "@/lib/marketplace";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function priceLabel(pricing: PricingModel, basePrice: number | null) {
  if (pricing === "QUOTE_REQUIRED") return "عرض سعر";
  if (basePrice == null) return "حسب التفاصيل";
  if (pricing === "STARTING_FROM") return `من ${basePrice} د.أ`;
  if (pricing === "HOURLY") return `${basePrice} د.أ / ساعة`;
  if (pricing === "PER_SESSION") return `${basePrice} د.أ / جلسة`;
  return `${basePrice} د.أ`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicProviderAction(id);

  if (!result.success || !result.provider) {
    return { title: "مقدم خدمة غير موجود" };
  }

  return {
    title: text(result.provider.name, "مقدم خدمة"),
    description: text(result.provider.headline) || text(result.provider.bio),
  };
}

export default async function PublicProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPublicProviderAction(id);

  if (!result.success || !result.provider) notFound();

  const provider = result.provider;
  const name = text(provider.name, "مقدم خدمة");
  const listings = records(provider.listings);
  const rating = number(provider.average_rating);
  const reviews = number(provider.review_count);
  const completed = number(provider.completed_bookings);
  const avatar = text(provider.avatar_path);
  const cover = text(provider.cover_path);
  const primaryListing = listings[0];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:px-6 sm:py-10">
      <section>
        {cover && (
          <div className="relative h-40 overflow-hidden rounded-[1.6rem] bg-surface-muted sm:h-56">
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        )}

        <div className={cover ? "-mt-8 px-1 sm:-mt-10 sm:px-4" : ""}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[rgb(var(--bg))] bg-[rgb(var(--primary-soft))] text-2xl font-black text-brand sm:h-24 sm:w-24">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  name.slice(0, 1)
                )}
              </div>

              <div className="pb-1">
                <h1 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">
                  {name}
                </h1>
                {text(provider.headline) && (
                  <p className="mt-1 text-xs text-muted sm:text-sm">
                    {text(provider.headline)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <MessageProviderButton
                providerId={id}
                listingId={primaryListing ? text(primaryListing.id) : null}
                className="secondary-button !min-h-[44px]"
              />
              {primaryListing && (
                <Link
                  href={`/listings/${text(primaryListing.slug)}`}
                  className="brand-button !min-h-[44px]"
                >
                  اطلب خدمة
                </Link>
              )}
              <FavoriteButton type="PROVIDER" id={id} />
            </div>
          </div>

          {text(provider.bio) && (
            <p className="mt-5 max-w-3xl text-xs leading-7 text-muted sm:text-sm sm:leading-8">
              {text(provider.bio)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-theme py-4 text-[11px] text-muted">
            <span><strong className="text-[rgb(var(--text-main))]">{completed}</strong> خدمة مكتملة</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-[rgb(var(--warning))]" />
              <strong className="text-[rgb(var(--text-main))]">{rating || "—"}</strong>
              ({reviews} تقييم)
            </span>
            <span><strong className="text-[rgb(var(--text-main))]">{listings.length}</strong> خدمات معروضة</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-brand">الخدمات</p>
            <h2 className="mt-1 text-xl font-black">شو بقدّم {name}؟</h2>
          </div>
        </div>

        {listings.length ? (
          <div className="divide-y divide-[rgb(var(--border))] border-y border-theme">
            {listings.map((listing) => (
              <article
                key={text(listing.id)}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-black">{text(listing.title)}</h3>
                  {text(listing.short_description) && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {text(listing.short_description)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <strong className="text-sm font-black text-brand">
                    {priceLabel(
                      text(listing.pricing_model) as PricingModel,
                      listing.base_price ? number(listing.base_price) : null,
                    )}
                  </strong>
                  <Link
                    href={`/listings/${text(listing.slug)}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    التفاصيل
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y border-theme py-10 text-center text-sm text-muted">
            ما في خدمات منشورة حالياً.
          </div>
        )}
      </section>
    </main>
  );
}
