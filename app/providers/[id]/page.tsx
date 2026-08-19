import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Images,
  MapPin,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/marketplace/favorite-button";
import MessageProviderButton from "@/components/marketplace/message-provider-button";
import { getPublicProviderAction } from "@/lib/actions/marketplace-discovery";
import {
  deliveryTypeLabels,
  pricingModelLabels,
  type DeliveryType,
  type PricingModel,
} from "@/lib/marketplace";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function priceLabel(
  pricing: PricingModel,
  basePrice: number | null,
) {
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
    description:
      text(result.provider.headline) ||
      text(result.provider.bio),
  };
}

export default async function PublicProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { id } = await params;
  const result = await getPublicProviderAction(id);

  if (!result.success || !result.provider) notFound();

  const provider = result.provider;
  const name = text(provider.name, "مقدم خدمة");
  const listings = records(provider.listings);
  const posts = records(provider.posts);
  const skills = strings(provider.skills);
  const areas = strings(provider.service_areas);
  const rating = number(provider.average_rating);
  const reviews = number(provider.review_count);
  const completed = number(provider.completed_bookings);

  const experienceStartYear = provider.experience_start_year
    ? number(provider.experience_start_year)
    : null;

  const experienceYears = experienceStartYear
    ? Math.max(
        0,
        new Date().getFullYear() - experienceStartYear,
      )
    : null;

  const experienceVerified = Boolean(provider.experience_verified);
  const reviewSort = (await searchParams).reviews;

  const providerReviews = records(provider.reviews).sort(
    (left, right) =>
      reviewSort === "highest"
        ? number(right.rating) - number(left.rating)
        : reviewSort === "lowest"
          ? number(left.rating) - number(right.rating)
          : new Date(text(right.created_at)).getTime() -
            new Date(text(left.created_at)).getTime(),
  );

  const avatar = text(provider.avatar_path);
  const cover = text(provider.cover_path);
  const primaryListing = listings[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-11">
      <section
        id="provider-about"
        className="overflow-hidden rounded-[2.2rem] border border-theme bg-surface shadow-soft"
      >
        <div className="relative h-44 overflow-hidden bg-[#0b817a] sm:h-64">
          {cover ? (
            <Image
              src={cover}
              alt={`غلاف ${name}`}
              fill
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />
          ) : (
            <>
              <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full border-[26px] border-white/10" />
              <div className="absolute -bottom-24 right-[14%] h-56 w-56 rounded-full bg-[#ffc985]/18" />
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.8rem] border-4 border-[rgb(var(--surface))] bg-[rgb(var(--primary-soft))] text-3xl font-bold text-brand shadow-lg sm:h-28 sm:w-28">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={`صورة ${name}`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  name.slice(0, 1)
                )}
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-[-.04em] sm:text-4xl">
                    {name}
                  </h1>
                  <ShieldCheck
                    className="h-5 w-5 text-[rgb(var(--success))]"
                    aria-label="مقدم خدمة معتمد"
                  />
                </div>

                {text(provider.headline) && (
                  <p className="mt-1 max-w-2xl text-sm font-bold text-muted">
                    {text(provider.headline)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <MessageProviderButton
                providerId={id}
                listingId={
                  primaryListing
                    ? text(primaryListing.id)
                    : null
                }
                className="secondary-button"
              />

              {primaryListing && (
                <Link
                  href={`/listings/${text(primaryListing.slug)}`}
                  className="brand-button"
                >
                  {text(primaryListing.pricing_model) ===
                  "QUOTE_REQUIRED"
                    ? "اطلب عرض سعر"
                    : "اطلب خدمة"}
                </Link>
              )}

              <FavoriteButton
                type="PROVIDER"
                id={id}
                label="حفظ مقدم الخدمة"
              />
            </div>
          </div>

          {text(provider.bio) && (
            <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-8 text-muted">
              {text(provider.bio)}
            </p>
          )}

          {skills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={completed}
              label="خدمة مكتملة"
              icon={<BriefcaseBusiness size={16} />}
            />
            <StatCard
              value={rating || "—"}
              label={`${reviews} تقييم موثق`}
              icon={<Star size={16} />}
            />
            <StatCard
              value={listings.length}
              label="خدمة منشورة"
              icon={<CheckCircle2 size={16} />}
            />

            {experienceYears !== null && (
              <StatCard
                value={experienceYears}
                label={`سنوات خبرة ${
                  experienceVerified ? "موثقة" : ""
                }`}
                icon={<Clock3 size={16} />}
              />
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-muted">
            {Boolean(provider.remote_available) && (
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-brand" />
                متاح عن بُعد
              </span>
            )}

            {areas.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand" />
                {areas.join("، ")}
              </span>
            )}
          </div>
        </div>
      </section>

      <nav
        aria-label="أقسام ملف مقدم الخدمة"
        className="hide-scrollbar sticky top-16 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto border-y border-theme bg-[rgb(var(--surface)/0.94)] px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border"
      >
        {[
          ["#provider-listings", "الخدمات"],
          ["#provider-posts", "الأعمال"],
          ["#provider-reviews", "التقييمات"],
          ["#provider-about", "نبذة"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-full px-4 py-2 text-[10px] font-bold text-muted transition hover:bg-surface-muted hover:text-brand"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        <section
          id="provider-listings"
          className="scroll-mt-32"
          aria-labelledby="provider-listings-heading"
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold text-brand">
              شو بقدم؟
            </p>
            <h2
              id="provider-listings-heading"
              className="mt-1 text-2xl font-bold tracking-[-.04em]"
            >
              خدمات {name}
            </h2>
          </div>

          {listings.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => {
                const slug = text(listing.slug);
                const delivery = text(
                  listing.delivery_type,
                ) as DeliveryType;
                const pricing = text(
                  listing.pricing_model,
                ) as PricingModel;

                const basePrice =
                  listing.base_price == null
                    ? null
                    : number(listing.base_price);

                return (
                  <article
                    key={text(listing.id)}
                    className="group overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft transition hover:-translate-y-0.5"
                  >
                    <Link
                      href={`/listings/${slug}`}
                      className="relative block aspect-[16/9] overflow-hidden bg-[rgb(var(--primary-soft))]"
                    >
                      {text(listing.image_path) ? (
                        <Image
                          src={text(listing.image_path)}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          className="object-cover transition duration-500 group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Sparkles className="h-9 w-9 text-brand" />
                        </div>
                      )}
                    </Link>

                    <div className="p-5">
                      <p className="text-[9px] font-bold text-brand">
                        {text(
                          listing.category_name,
                          "خدمة",
                        )}
                      </p>

                      <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7">
                        <Link
                          href={`/listings/${slug}`}
                          className="hover:text-brand"
                        >
                          {text(listing.title)}
                        </Link>
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">
                        {text(listing.short_description)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-muted">
                        <span className="rounded-full bg-surface-muted px-2.5 py-1">
                          {deliveryTypeLabels[delivery] ||
                            delivery}
                        </span>

                        <span className="rounded-full bg-surface-muted px-2.5 py-1">
                          {pricingModelLabels[pricing] ||
                            pricing}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-theme pt-4">
                        <strong className="text-sm text-brand">
                          {priceLabel(
                            pricing,
                            basePrice,
                          )}
                        </strong>

                        <Link
                          href={`/listings/${slug}`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold"
                        >
                          عرض الخدمة
                          <ArrowLeft size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<BriefcaseBusiness size={23} />}
              title="ما في خدمات منشورة حالياً"
              copy="أول ما ينشر مقدم الخدمة عرض جديد رح يظهر هون."
            />
          )}
        </section>

        <section
          id="provider-posts"
          className="scroll-mt-32"
          aria-labelledby="provider-posts-heading"
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold text-brand">
              شغله بحكي عنه
            </p>
            <h2
              id="provider-posts-heading"
              className="mt-1 text-2xl font-bold tracking-[-.04em]"
            >
              الأعمال والمحتوى
            </h2>
          </div>

          {posts.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => {
                const media = records(post.media);
                const firstMedia = media[0];

                return (
                  <article
                    id={`post-${text(post.id)}`}
                    key={text(post.id)}
                    className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft"
                  >
                    {firstMedia &&
                      text(firstMedia.path) && (
                        <div className="relative aspect-video bg-surface-muted">
                          <Image
                            src={text(firstMedia.path)}
                            alt="من أعمال مقدم الخدمة"
                            fill
                            sizes="(max-width: 768px) 100vw, 520px"
                            className="object-cover"
                          />
                        </div>
                      )}

                    <div className="p-5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--primary-soft))] px-2.5 py-1 text-[9px] font-bold text-brand">
                        <Images size={12} />
                        {text(
                          post.post_type,
                          "عمل مهني",
                        )}
                      </span>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                        {text(post.content)}
                      </p>

                      {text(post.listing_id) && (
                        <Link
                          href={`/discover?q=${encodeURIComponent(
                            text(post.content).slice(0, 30),
                          )}`}
                          className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-brand"
                        >
                          استكشف الخدمة المرتبطة
                          <ArrowLeft size={13} />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Images size={23} />}
              title="لسه ما نشر أعماله"
              copy="لما يضيف صور أو محتوى مهني رح تقدر تشوفه هون."
            />
          )}
        </section>

        <section
          id="provider-reviews"
          className="scroll-mt-32"
          aria-labelledby="provider-reviews-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-brand">
                تجارب حقيقية
              </p>
              <h2
                id="provider-reviews-heading"
                className="mt-1 text-2xl font-bold tracking-[-.04em]"
              >
                تقييمات العملاء
              </h2>
              <p className="mt-1 text-[10px] text-muted">
                من حجوزات مكتملة فقط · {reviews} تقييم
              </p>
            </div>

            <form className="flex items-end gap-2">
              <label className="text-[10px] font-bold">
                ترتيب
                <select
                  name="reviews"
                  defaultValue={reviewSort || "newest"}
                  className="form-field mt-1 !w-auto"
                >
                  <option value="newest">الأحدث</option>
                  <option value="highest">الأعلى</option>
                  <option value="lowest">الأقل</option>
                </select>
              </label>

              <button className="secondary-button !min-h-10 !px-3">
                تطبيق
              </button>
            </form>
          </div>

          {providerReviews.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {providerReviews.map((review) => (
                <article
                  key={text(review.id)}
                  className="rounded-[1.6rem] border border-theme bg-surface p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-[rgb(var(--warning))]">
                      <Star className="h-4 w-4 fill-current" />
                      {number(review.rating)} / 5
                    </span>

                    <time className="text-[9px] text-muted">
                      {new Date(
                        text(review.created_at),
                      ).toLocaleDateString("ar-JO")}
                    </time>
                  </div>

                  {text(review.comment) && (
                    <p className="mt-3 text-sm leading-7">
                      {text(review.comment)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Star size={23} />}
              title="لسه ما في تقييمات"
              copy="التقييمات تظهر بعد اكتمال حجوزات حقيقية داخل جسر."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <span className="text-brand">{icon}</span>
      <strong className="mt-3 block text-xl">
        {value}
      </strong>
      <span className="mt-0.5 block text-[9px] text-muted">
        {label}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-9 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-bold">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-6 text-muted">
        {copy}
      </p>
    </div>
  );
}
