import Link from "next/link";
import {
  ArrowLeft, BriefcaseBusiness, Code2, GraduationCap, Hammer, House,
  MessageCircle, Palette, PartyPopper, Search, Shapes, ShieldCheck, Sparkles,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import { getHomeServiceTaxonomyAction, getMarketplaceCategoriesAction, searchMarketplaceAction } from "@/lib/actions/marketplace-discovery";

const categoryVisuals = {
  "home-services": { icon: House, className: "category-home" },
  "technology-programming": { icon: Code2, className: "category-tech" },
  "education-training": { icon: GraduationCap, className: "category-education" },
  "design-creative": { icon: Palette, className: "category-design" },
  "business-consulting": { icon: BriefcaseBusiness, className: "category-business" },
  events: { icon: PartyPopper, className: "category-events" },
  "maintenance-repair": { icon: Hammer, className: "category-maintenance" },
  "other-services": { icon: Shapes, className: "category-other" },
};

export default async function HomePage() {
  const [categoriesResult, taxonomyResult, providersResult, listingsResult, postsResult] = await Promise.all([
    getMarketplaceCategoriesAction(),
    getHomeServiceTaxonomyAction(),
    searchMarketplaceAction({ scope: "PROVIDERS", pageSize: 6 }),
    searchMarketplaceAction({ scope: "LISTINGS", pageSize: 6 }),
    searchMarketplaceAction({ scope: "POSTS", pageSize: 4 }),
  ]);
  const categories = categoriesResult.categories || [];
  const taxonomy = taxonomyResult.categories || [];
  const serviceTypes = taxonomy.flatMap((category) => category.serviceTypes || []).slice(0, 12);
  const providers = providersResult.results || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];

  return <div className="pb-10 sm:pb-16">
    <section className="relative isolate overflow-hidden border-b border-theme bg-surface px-4 py-8 sm:py-14">
      <div className="pointer-events-none absolute -start-20 -top-24 -z-10 h-80 w-80 rounded-full bg-[rgb(var(--primary)/0.14)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 end-0 -z-10 h-72 w-72 rounded-full bg-[rgb(var(--category-home)/0.1)] blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--primary-soft))] px-3 py-1.5 text-[11px] font-black text-brand"><Sparkles className="h-3.5 w-3.5" /> مهارات وخدمات من ناس حقيقيين</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.25] tracking-tight sm:text-6xl">على إيش اليوم<br /><span className="text-brand">بتدور؟</span> 👀</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-muted sm:text-base">احكيلنا شو محتاج… وجسر بوصلك بالشخص المناسب. شوف شغله، قارن سعره، واحكي معه داخل المنصة قبل ما تحجز.</p>
          <form action="/discover" role="search" className="mt-6 max-w-3xl">
            <label htmlFor="hero-search" className="sr-only">ابحث عن خدمة أو مقدم خدمة</label>
            <div className="flex items-center gap-2 rounded-3xl border border-theme bg-surface p-2 ps-4 shadow-[0_18px_50px_rgb(var(--shadow)/0.12)] focus-within:border-[rgb(var(--primary))]">
              <Search className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <input id="hero-search" name="q" type="search" maxLength={120} placeholder="ابحث عن خدمة أو مقدم خدمة…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
              <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary))] text-white" type="submit" aria-label="بحث"><ArrowLeft className="h-5 w-5" /></button>
            </div>
          </form>
          <div className="mt-5 flex flex-wrap gap-4 text-[11px] font-bold text-muted"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[rgb(var(--success))]" /> مقدمو خدمة معتمدون</span><span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-brand" /> تواصل آمن داخل جسر</span></div>
        </div>
        <div className="hidden grid-cols-2 gap-3 lg:grid" aria-hidden="true">
          {categories.slice(0, 6).map((category, index) => {
            const visual = categoryVisuals[category.slug as keyof typeof categoryVisuals] || categoryVisuals["other-services"];
            const Icon = visual.icon;
            return <div key={category.id} className={`surface-card ${visual.className} ${index % 3 === 1 ? "translate-y-5" : ""} p-5`}><span className="category-icon flex h-12 w-12 items-center justify-center rounded-2xl"><Icon className="h-6 w-6" /></span><p className="mt-3 text-sm font-black">{category.name_ar}</p><p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">{category.description_ar}</p></div>;
          })}
        </div>
      </div>
    </section>

    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 py-7">
      <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[11px] font-black text-brand">ابدأ من هون</p><h2 id="categories-title" className="mt-1 text-2xl font-black">اكتشف حسب المجال</h2></div><Link href="/discover" className="inline-flex items-center gap-1 text-xs font-bold text-brand">عرض الكل <ArrowLeft className="h-3.5 w-3.5" /></Link></div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-4 lg:grid-cols-8">
        {categories.map((category) => { const visual = categoryVisuals[category.slug as keyof typeof categoryVisuals] || categoryVisuals["other-services"]; const Icon = visual.icon; return <Link key={category.id} href={`/discover?category=${category.id}`} className={`group ${visual.className} flex min-w-28 snap-start flex-col items-center rounded-3xl border border-theme bg-surface px-2 py-4 text-center transition hover:-translate-y-1 hover:shadow-lg`}><span className="category-icon flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105"><Icon className="h-6 w-6" /></span><span className="mt-2 text-xs font-black leading-5">{category.name_ar}</span></Link>; })}
      </div>
    </section>

    <main className="mx-auto max-w-7xl space-y-12 px-4">
      {serviceTypes.length > 0 && <section aria-labelledby="service-types-title"><div className="mb-4"><p className="text-[11px] font-black text-brand">خلينا نلاقي لك الشخص الصح</p><h2 id="service-types-title" className="mt-1 text-2xl font-black">خدمات ممكن تحتاجها</h2></div><div className="grid overflow-hidden rounded-3xl border border-theme bg-surface sm:grid-cols-2 lg:grid-cols-3">{serviceTypes.map((service, index) => <Link key={service.id} href={`/service-types/${service.id}`} className="group flex min-h-24 items-center gap-3 border-b border-theme p-4 transition hover:bg-surface-muted sm:border-l"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-sm font-black text-brand">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><strong className="block text-sm group-hover:text-brand">{service.title}</strong><span className="mt-1 block truncate text-[10px] text-muted">{service.category_name}</span></span><ArrowLeft className="h-4 w-4 shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-brand" /></Link>)}</div></section>}

      {providers.length > 0 && <section aria-labelledby="providers-title"><div className="mb-4"><p className="text-[11px] font-black text-brand">مين بناسب طلبك؟</p><h2 id="providers-title" className="mt-1 text-2xl font-black">أهل الخبرة بهالمجال</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{providers.map((result) => <SearchResultCard key={result.result_id} result={result} />)}</div></section>}
      {listings.length > 0 && <section aria-labelledby="listings-title"><div className="mb-4"><p className="text-[11px] font-black text-brand">أسعار يحددها أصحاب الخدمة</p><h2 id="listings-title" className="mt-1 text-2xl font-black">شوف الخدمات وقارن</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{listings.map((result) => <SearchResultCard key={result.result_id} result={result} />)}</div></section>}
      {posts.length > 0 && <section aria-labelledby="posts-title"><div className="mb-4"><p className="text-[11px] font-black text-brand">شغلهم بحكي عنهم</p><h2 id="posts-title" className="mt-1 text-2xl font-black">أعمال تستاهل تشوفها</h2></div><div className="grid gap-4 md:grid-cols-2">{posts.map((result) => <SearchResultCard key={result.result_id} result={result} />)}</div></section>}
    </main>
  </div>;
}
