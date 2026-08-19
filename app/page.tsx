import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Code2, GraduationCap, Hammer, House, Palette, PartyPopper, Search, Shapes, ShieldCheck } from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import { getMarketplaceCategoriesAction, searchMarketplaceAction } from "@/lib/actions/marketplace-discovery";
import { searchServicesAction } from "@/lib/actions/services-search";
import { getPublicMetricsAction } from "@/lib/actions/public-metrics";

const categoryIcons = {
  "home-services": House,
  "technology-programming": Code2,
  "education-training": GraduationCap,
  "design-creative": Palette,
  "business-consulting": BriefcaseBusiness,
  events: PartyPopper,
  "maintenance-repair": Hammer,
  "other-services": Shapes,
};

export default async function HomePage() {
  const [categoriesResult, listingsResult, postsResult, providersResult, legacyResult, metricsResult] = await Promise.all([
    getMarketplaceCategoriesAction(),
    searchMarketplaceAction({ scope: "LISTINGS", pageSize: 8 }),
    searchMarketplaceAction({ scope: "POSTS", pageSize: 5 }),
    searchMarketplaceAction({ scope: "PROVIDERS", pageSize: 5 }),
    searchServicesAction(),
    getPublicMetricsAction(),
  ]);
  const categories = categoriesResult.categories || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];
  const providers = providersResult.results || [];
  const legacyServices = (legacyResult.services || []).slice(0, 4);
  const metrics = metricsResult.metrics;

  return (
    <div className="pb-8 sm:pb-16">
      <section className="border-b border-theme bg-[radial-gradient(circle_at_20%_0%,rgb(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,rgb(var(--surface)),rgb(var(--canvas)))] px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand">سوق خدمات ومهارات موثوق للأردن</span>
          <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-black leading-[1.4] sm:text-5xl">
            أي خدمة تحتاجها، تجد لها <span className="text-brand">جسرًا</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            اكتشف خدمات منزلية ورقمية وتعليمية وإبداعية. احجز بسعر واضح أو اطلب عرضاً مخصصاً من مقدم خدمة معتمد.
          </p>
          <form action="/discover" role="search" className="mx-auto mt-7 max-w-2xl">
            <label htmlFor="hero-search" className="sr-only">ابحث عن خدمة أو مهارة</label>
            <div className="surface-card flex items-center gap-2 rounded-full p-1.5 ps-4">
              <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              <input id="hero-search" name="q" type="search" maxLength={120}
                placeholder="مثال: بدي مبرمج يعمل متجر أو سباك في عمّان"
                className="min-w-0 flex-1 border-0 bg-transparent px-1 py-3 text-sm outline-none" />
              <button className="brand-button !min-h-11 !rounded-full !px-6" type="submit">ابحث</button>
            </div>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-[rgb(var(--success))]" /> مزودون معتمدون فقط</span>
            <span>{metrics.activeServicesCount} خدمة منزلية جاهزة</span>
            <span>{metrics.completedBookingsCount} معاملة مكتملة</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 py-7">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="categories-title" className="text-xl font-black sm:text-2xl">استكشف حسب المجال</h2>
            <p className="mt-1 text-xs text-muted">مجالات رئيسية واضحة، وفي داخلها تخصصات أدق</p>
          </div>
          <Link href="/discover" className="inline-flex items-center gap-1 text-xs font-bold text-brand">الكل <ArrowLeft className="h-3.5 w-3.5" /></Link>
        </div>
        {categories.length ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((category) => {
              const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Shapes;
              return (
                <Link key={category.id} href={"/discover?category=" + category.id}
                  className="surface-card flex min-w-32 snap-start flex-col items-center gap-3 p-4 text-center transition hover:-translate-y-1 hover:border-[rgb(var(--primary)/0.55)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-black leading-5">{category.name_ar}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="surface-card p-6 text-center text-sm text-muted">سيظهر دليل المجالات بعد تطبيق ترحيل السوق الجديد.</div>
        )}
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="listings-title">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 id="listings-title" className="text-xl font-black">عروض خدمات جديدة</h2>
                <p className="mt-1 text-xs text-muted">عروض منشورة من مقدمي خدمات معتمدين</p>
              </div>
              <Link href="/discover?tab=LISTINGS" className="text-xs font-bold text-brand">عرض المزيد</Link>
            </div>
            {listings.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {listings.map((result) => <SearchResultCard key={result.result_id} result={result} />)}
              </div>
            ) : (
              <div className="surface-card p-8 text-center">
                <p className="font-bold">لا توجد عروض مزودين منشورة بعد</p>
                <p className="mt-2 text-xs text-muted">يمكن لمقدمي الخدمات المعتمدين إنشاء أول عروضهم من بوابة المزود.</p>
                <Link href="/provider/listings" className="secondary-button mt-4">أنشئ عرض خدمة</Link>
              </div>
            )}
          </section>

          {posts.length > 0 && (
            <section aria-labelledby="posts-title">
              <h2 id="posts-title" className="mb-4 text-xl font-black">من خبرات مقدمي الخدمة</h2>
              <div className="space-y-3">{posts.map((result) => <SearchResultCard key={result.result_id} result={result} />)}</div>
            </section>
          )}

          <section aria-labelledby="legacy-title">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 id="legacy-title" className="text-xl font-black">خدمات منزلية جاهزة للحجز</h2>
                <p className="mt-1 text-xs text-muted">المسار الحالي محفوظ بالكامل ويعمل إلى جانب السوق الجديد</p>
              </div>
              <Link href="/services" className="text-xs font-bold text-brand">دليل الخدمات</Link>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {legacyServices.map((service) => (
                <article key={service.id} className="surface-card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-brand">{service.category || "خدمة منزلية"}</span>
                    <h3 className="truncate text-sm font-black">{service.title}</h3>
                    <p className="mt-1 text-xs text-muted">{service.price} د.أ</p>
                  </div>
                  <Link href={"/services/" + service.id} className="secondary-button !min-h-9 shrink-0 !px-3 !py-1 text-xs">التفاصيل</Link>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="مقدمو خدمة مقترحون">
          <div className="surface-card p-4">
            <h2 className="font-black">مقدمو خدمة جدد</h2>
            <p className="mt-1 text-[11px] text-muted">لا تظهر هنا إلا الحسابات المعتمدة فعلياً</p>
            <div className="mt-4 space-y-3">
              {providers.length ? providers.map((provider) => (
                <Link key={provider.result_id} href={provider.href} className="block rounded-xl bg-[rgb(var(--surface-muted))] p-3 transition hover:text-brand">
                  <p className="text-sm font-black">{provider.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">{provider.summary || "مقدم خدمة معتمد"}</p>
                </Link>
              )) : <p className="py-4 text-center text-xs text-muted">لا توجد ملفات عامة منشورة بعد.</p>}
            </div>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--primary))] p-5 text-white">
            <p className="text-lg font-black">حوّل مهارتك إلى عمل</p>
            <p className="mt-2 text-xs leading-6 text-white/85">قدّم طلب الانضمام، وبعد الاعتماد أنشئ عروضك ومحتواك المهني.</p>
            <Link href="/provider/apply" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-black text-[#9d3422]">ابدأ الآن</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
