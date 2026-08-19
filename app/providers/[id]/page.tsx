import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BriefcaseBusiness, MapPin, Monitor, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/marketplace/favorite-button";
import MessageProviderButton from "@/components/marketplace/message-provider-button";
import { getPublicProviderAction } from "@/lib/actions/marketplace-discovery";
import { deliveryTypeLabels, pricingModelLabels, type DeliveryType, type PricingModel } from "@/lib/marketplace";

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function number(value: unknown) { return typeof value === "number" ? value : Number(value || 0); }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function records(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : []; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicProviderAction(id);
  if (!result.success || !result.provider) return { title: "مقدم خدمة غير موجود" };
  return { title: text(result.provider.name, "مقدم خدمة"), description: text(result.provider.headline) || text(result.provider.bio) };
}

export default async function PublicProviderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reviews?: string }> }) {
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
  const experienceStartYear = provider.experience_start_year ? number(provider.experience_start_year) : null;
  const experienceYears = experienceStartYear ? Math.max(0, new Date().getFullYear() - experienceStartYear) : null;
  const experienceVerified = Boolean(provider.experience_verified);
  const reviewSort = (await searchParams).reviews;
  const providerReviews = records(provider.reviews).sort((left, right) => reviewSort === "highest"
    ? number(right.rating) - number(left.rating)
    : reviewSort === "lowest" ? number(left.rating) - number(right.rating)
      : new Date(text(right.created_at)).getTime() - new Date(text(left.created_at)).getTime());
  const avatar = text(provider.avatar_path);
  const cover = text(provider.cover_path);
  const primaryListing = listings[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <section id="provider-about" className="scroll-mt-24 overflow-hidden rounded-b-3xl border-b border-theme bg-surface sm:rounded-3xl sm:border">
        <div className="relative h-32 bg-[rgb(var(--primary-soft))] sm:h-52">{cover && <Image src={cover} alt={`غلاف ${name}`} fill sizes="(max-width: 1200px) 100vw, 1152px" className="object-cover" />}</div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[rgb(var(--surface))] bg-[rgb(var(--primary-soft))] text-3xl font-black text-brand sm:h-24 sm:w-24">
                {avatar ? <Image src={avatar} alt={`صورة ${name}`} fill sizes="96px" className="object-cover" /> : name.slice(0, 1)}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-black sm:text-3xl">{name}</h1>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--success))]"><ShieldCheck className="h-4 w-4" /> مقدم خدمة معتمد</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto"><MessageProviderButton providerId={id} listingId={primaryListing ? text(primaryListing.id) : null} />{primaryListing && <Link href={`/listings/${text(primaryListing.slug)}`} className="brand-button">{text(primaryListing.pricing_model) === "QUOTE_REQUIRED" ? "اطلب عرض سعر" : "اطلب خدمة"}</Link>}<FavoriteButton type="PROVIDER" id={id} label="حفظ مقدم الخدمة" /></div>
          </div>
          {text(provider.headline) && <p className="mt-5 max-w-3xl text-base font-bold leading-7">{text(provider.headline)}</p>}
          {text(provider.bio) && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-8 text-muted">{text(provider.bio)}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => <span key={skill} className="status-pill bg-surface-muted">{skill}</span>)}
          </div>
          <div className="mt-5 flex flex-wrap divide-x-reverse divide-x divide-[rgb(var(--border))] text-center">
            <div className="px-4 first:ps-0"><strong className="block text-lg">{completed}</strong><span className="text-[10px] text-muted">خدمة مكتملة</span></div>
            <div className="px-4"><strong className="flex items-center justify-center gap-1 text-lg">{rating || "—"}<Star className="h-4 w-4 text-[rgb(var(--warning))]" /></strong><span className="text-[10px] text-muted">{reviews} تقييم موثّق</span></div>
            <div className="px-4"><strong className="block text-lg">{listings.length}</strong><span className="text-[10px] text-muted">خدمة منشورة</span></div>
            {experienceYears !== null && <div className="px-4"><strong className="block text-lg">{experienceYears}</strong><span className="text-[10px] text-muted">سنوات خبرة {experienceVerified ? "موثقة" : "بإفادة المقدم"}</span></div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            {Boolean(provider.remote_available) && <span className="inline-flex items-center gap-1"><Monitor className="h-4 w-4" /> متاح عن بُعد</span>}
            {areas.length > 0 && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {areas.join("، ")}</span>}
          </div>
        </div>
      </section>

      <nav aria-label="أقسام ملف مقدم الخدمة" className="sticky top-16 z-20 -mx-4 mt-3 flex gap-1 overflow-x-auto border-y border-theme bg-[rgb(var(--surface)/0.96)] px-4 py-2 text-xs font-black backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <a href="#provider-listings" className="shrink-0 rounded-xl px-4 py-2 hover:bg-surface-muted focus-visible:bg-surface-muted">الخدمات</a>
        <a href="#provider-posts" className="shrink-0 rounded-xl px-4 py-2 hover:bg-surface-muted focus-visible:bg-surface-muted">الأعمال</a>
        <a href="#provider-reviews" className="shrink-0 rounded-xl px-4 py-2 hover:bg-surface-muted focus-visible:bg-surface-muted">التقييمات</a>
        <a href="#provider-about" className="shrink-0 rounded-xl px-4 py-2 hover:bg-surface-muted focus-visible:bg-surface-muted">نبذة</a>
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="scroll-mt-32" aria-labelledby="provider-listings">
            <h2 id="provider-listings" className="mb-4 text-xl font-black">الخدمات المتاحة</h2>
            {listings.length ? <div className="grid gap-3 sm:grid-cols-2">{listings.map((listing) => {
              const slug = text(listing.slug);
              const delivery = text(listing.delivery_type) as DeliveryType;
              const pricing = text(listing.pricing_model) as PricingModel;
              const basePrice = listing.base_price == null ? null : number(listing.base_price);
              return (
                <article key={text(listing.id)} className="flex flex-col overflow-hidden border-b border-theme bg-surface py-4 sm:border sm:p-0">
                  {text(listing.image_path) && <div className="relative aspect-[16/9]"><Image src={text(listing.image_path)} alt="" fill sizes="(max-width: 640px) 100vw, 360px" className="object-cover" /></div>}
                  <div className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] font-bold text-brand">{text(listing.category_name, "خدمة")}</span>
                  <h3 className="mt-1 text-base font-black"><Link href={"/listings/" + slug} className="hover:text-brand">{text(listing.title)}</Link></h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{text(listing.short_description)}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted">
                    <span>{deliveryTypeLabels[delivery] || delivery}</span><span>•</span><span>{pricingModelLabels[pricing] || pricing}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-theme pt-4 text-xs">
                    <strong className="text-brand">{basePrice ? basePrice + " د.أ" : "عرض سعر"}</strong>
                    <Link href={"/listings/" + slug} className="font-black">عرض الخدمة</Link>
                  </div>
                  </div>
                </article>
              );
            })}</div> : <div className="surface-card p-8 text-center text-sm text-muted">لا توجد عروض منشورة حالياً.</div>}
          </section>
        </div>

        <aside className="scroll-mt-32" aria-labelledby="provider-posts">
          <h2 id="provider-posts" className="mb-4 text-xl font-black">آخر المحتوى المهني</h2>
          <div className="space-y-3">
            {posts.length ? posts.map((post) => (
              <article id={"post-" + text(post.id)} key={text(post.id)} className="border-b border-theme bg-surface py-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-brand"><BriefcaseBusiness className="h-3.5 w-3.5" /> {text(post.post_type)}</div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-7">{text(post.content)}</p>
                {records(post.media).slice(0, 1).map((media) => text(media.path) && <div key={text(media.path)} className="relative mt-3 aspect-video overflow-hidden"><Image src={text(media.path)} alt="من أعمال مقدم الخدمة" fill sizes="340px" className="object-cover" /></div>)}
                {text(post.listing_id) && <Link href={"/discover?q=" + encodeURIComponent(text(post.content).slice(0, 30))} className="mt-3 inline-block text-[11px] font-bold text-brand">استكشف الخدمة المرتبطة</Link>}
              </article>
            )) : <div className="surface-card p-6 text-center text-xs text-muted">لا يوجد محتوى منشور بعد.</div>}
          </div>
        </aside>
      </div>
      <section className="mt-8 border-t border-theme pt-6" aria-labelledby="provider-reviews"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="provider-reviews" className="text-xl font-black">التقييمات</h2><p className="mt-1 text-xs text-muted">من حجوزات مكتملة فقط · {reviews} تقييم</p></div><form><label className="text-xs font-bold">ترتيب التقييمات <select name="reviews" defaultValue={reviewSort || "newest"} className="form-field mt-1 !w-auto" onChange={undefined}><option value="newest">الأحدث</option><option value="highest">الأعلى</option><option value="lowest">الأقل</option></select></label><button className="secondary-button ms-2 !min-h-9">تطبيق</button></form></div>{providerReviews.length ? <div className="mt-4 divide-y divide-[rgb(var(--border))]">{providerReviews.map((review) => <article key={text(review.id)} className="py-4"><p className="font-black text-[rgb(var(--warning))]">{number(review.rating)} / 5</p>{text(review.comment) && <p className="mt-2 text-sm leading-7">{text(review.comment)}</p>}<time className="mt-2 block text-[10px] text-muted">{new Date(text(review.created_at)).toLocaleDateString("ar-JO")}</time></article>)}</div> : <p className="py-8 text-sm text-muted">لا توجد تقييمات بعد.</p>}</section>
    </div>
  );
}
