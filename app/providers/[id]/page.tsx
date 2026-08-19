import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, Monitor, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/marketplace/favorite-button";
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

export default async function PublicProviderPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <section className="surface-card overflow-hidden">
        <div className="h-32 bg-[radial-gradient(circle_at_20%_20%,rgb(var(--primary)/0.7),transparent_45%),linear-gradient(135deg,rgb(var(--primary-strong)),rgb(var(--primary)))] sm:h-52" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-[rgb(var(--surface))] bg-[rgb(var(--primary-soft))] text-3xl font-black text-brand sm:h-24 sm:w-24">
                {name.slice(0, 1)}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-black sm:text-3xl">{name}</h1>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--success))]"><ShieldCheck className="h-4 w-4" /> مقدم خدمة معتمد</p>
              </div>
            </div>
            <div className="w-full sm:w-48"><FavoriteButton type="PROVIDER" id={id} label="حفظ مقدم الخدمة" /></div>
          </div>
          {text(provider.headline) && <p className="mt-5 max-w-3xl text-base font-bold leading-7">{text(provider.headline)}</p>}
          {text(provider.bio) && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-8 text-muted">{text(provider.bio)}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => <span key={skill} className="status-pill bg-surface-muted">{skill}</span>)}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg">
            <div className="rounded-xl bg-surface-muted p-3 text-center"><strong className="block text-lg">{completed}</strong><span className="text-[10px] text-muted">مكتمل</span></div>
            <div className="rounded-xl bg-surface-muted p-3 text-center"><strong className="flex items-center justify-center gap-1 text-lg">{rating || "—"}<Star className="h-4 w-4 text-[rgb(var(--warning))]" /></strong><span className="text-[10px] text-muted">{reviews} تقييم</span></div>
            <div className="rounded-xl bg-surface-muted p-3 text-center"><strong className="block text-lg">{listings.length}</strong><span className="text-[10px] text-muted">عرض منشور</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            {Boolean(provider.remote_available) && <span className="inline-flex items-center gap-1"><Monitor className="h-4 w-4" /> متاح عن بُعد</span>}
            {areas.length > 0 && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {areas.join("، ")}</span>}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="provider-listings">
            <h2 id="provider-listings" className="mb-4 text-xl font-black">الخدمات المتاحة</h2>
            {listings.length ? <div className="grid gap-3 sm:grid-cols-2">{listings.map((listing) => {
              const slug = text(listing.slug);
              const delivery = text(listing.delivery_type) as DeliveryType;
              const pricing = text(listing.pricing_model) as PricingModel;
              const basePrice = listing.base_price == null ? null : number(listing.base_price);
              return (
                <article key={text(listing.id)} className="surface-card flex flex-col p-5">
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
                </article>
              );
            })}</div> : <div className="surface-card p-8 text-center text-sm text-muted">لا توجد عروض منشورة حالياً.</div>}
          </section>
        </div>

        <aside aria-labelledby="provider-posts">
          <h2 id="provider-posts" className="mb-4 text-xl font-black">آخر المحتوى المهني</h2>
          <div className="space-y-3">
            {posts.length ? posts.map((post) => (
              <article id={"post-" + text(post.id)} key={text(post.id)} className="surface-card p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-brand"><BriefcaseBusiness className="h-3.5 w-3.5" /> {text(post.post_type)}</div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-7">{text(post.content)}</p>
                {text(post.listing_id) && <Link href={"/discover?q=" + encodeURIComponent(text(post.content).slice(0, 30))} className="mt-3 inline-block text-[11px] font-bold text-brand">استكشف الخدمة المرتبطة</Link>}
              </article>
            )) : <div className="surface-card p-6 text-center text-xs text-muted">لا يوجد محتوى منشور بعد.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
