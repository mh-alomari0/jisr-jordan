import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  ChevronLeft,
  Heart,
  LayoutGrid,
  Lightbulb,
  Paintbrush,
  Plus,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
  searchMarketplaceAction,
} from "@/lib/actions/marketplace-discovery";

const categoryVisuals = [
  { icon: Wrench, tone: "bg-[#d8f0e9] text-[#087a72]" },
  { icon: Sparkles, tone: "bg-[#fde4df] text-[#c7584d]" },
  { icon: BriefcaseBusiness, tone: "bg-[#fbe8ba] text-[#8a641c]" },
  { icon: Lightbulb, tone: "bg-[#e2e3f7] text-[#5d5799]" },
  { icon: Paintbrush, tone: "bg-[#f9dce8] text-[#a14670]" },
  { icon: Camera, tone: "bg-[#d9e9f4] text-[#38759a]" },
  { icon: LayoutGrid, tone: "bg-[#e6e4db] text-[#607064]" },
  { icon: Plus, tone: "bg-[#dcefe5] text-[#267a57]" },
] as const;

function SectionHeading({
  eyebrow,
  title,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-bold tracking-[.08em] text-brand">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-bold tracking-[-.04em] sm:text-2xl">
          {title}
        </h2>
      </div>

      {href && action && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-bold text-brand"
        >
          <ChevronLeft size={15} />
          {action}
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [
    categoriesResult,
    taxonomyResult,
    providersResult,
    listingsResult,
    postsResult,
  ] = await Promise.all([
    getMarketplaceCategoriesAction(),
    getHomeServiceTaxonomyAction(),
    searchMarketplaceAction({ scope: "PROVIDERS", pageSize: 4 }),
    searchMarketplaceAction({ scope: "LISTINGS", pageSize: 4 }),
    searchMarketplaceAction({ scope: "POSTS", pageSize: 4 }),
  ]);

  const categories = categoriesResult.categories || [];
  const taxonomy = taxonomyResult.categories || [];
  const serviceTypes = taxonomy
    .flatMap((category) => category.serviceTypes || [])
    .slice(0, 8);

  const providers = providersResult.results || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];

  return (
    <div className="page-reveal pb-10 sm:pb-16">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:pb-16 lg:pt-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] px-5 py-8 text-white shadow-lift sm:px-10 sm:py-12 lg:min-h-[520px] lg:px-16 lg:py-16">
          <div className="absolute -left-10 -top-16 h-48 w-48 rounded-full border-[22px] border-[#5bc2ad]/30 sm:h-72 sm:w-72" />
          <div className="absolute -bottom-20 right-[18%] h-56 w-56 rounded-full bg-[#f9a48c]/20" />

          <div className="relative max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold text-[#c3eee2]">
              <span>عمّان، الأردن</span>
              <span className="h-1 w-1 rounded-full bg-[#f9a48c]" />
              <span>خدمات قريبة منك</span>
            </div>

            <h1 className="max-w-xl text-[2.35rem] font-bold leading-[1.2] tracking-[-.07em] sm:text-5xl lg:text-[4rem]">
              خلّيها علينا،
              <br />
              <span className="text-[#ffd39a]">والجسر علينا.</span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#d7f2eb] sm:text-base">
              كل خدمة تحتاجها، من ناس مستقلين بتعرف تعتمد عليهم. ابدأ باللي في بالك.
            </p>

            <form action="/discover" role="search" className="mt-7 max-w-xl">
              <label htmlFor="home-search" className="sr-only">
                ابحث عن خدمة
              </label>

              <div className="hero-search-shell flex h-14 items-center gap-3 rounded-2xl border border-white/20 px-4">
                <Search size={20} className="shrink-0 text-[#1ea59d]" />

                <input
                  id="home-search"
                  name="q"
                  type="search"
                  maxLength={120}
                  placeholder="شو بدك تصلّح أو تنجز اليوم؟"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />

                <button
                  type="submit"
                  className="hidden rounded-xl bg-[#1ea59d] px-4 py-2 text-xs font-bold text-white sm:block"
                >
                  ابحث
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-[#d7f2eb]">
              <span>جرّب:</span>
              {["تصليح غسالة", "تنظيف البيت", "تصميم شعار"].map((term) => (
                <Link
                  key={term}
                  href={`/discover?q=${encodeURIComponent(term)}`}
                  className="rounded-full border border-white/20 px-3 py-1.5 transition hover:bg-white/10"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>

          <div className="absolute bottom-7 left-8 hidden h-40 w-40 rotate-[-12deg] items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 lg:flex">
            <div className="h-24 w-24 rounded-full border border-[#ffd39a]/50 bg-[#ffd39a]/30" />
            <span className="absolute bottom-5 text-[10px] font-bold tracking-widest text-[#d7f2eb]">
              خدمة بتفرق
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="دور على اللي بناسبك"
          title="شو بدك تنجز؟"
          href="/discover"
          action="كل التصنيفات"
        />

        <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {categories.slice(0, 8).map((category, index) => {
            const visual = categoryVisuals[index % categoryVisuals.length];
            const Icon = visual.icon;

            return (
              <Link
                key={category.id}
                href={`/discover?category=${category.id}`}
                className="home-category-card group flex min-w-[142px] flex-col rounded-2xl border border-theme bg-surface p-3.5 transition hover:-translate-y-1 hover:shadow-soft sm:min-w-0"
              >
                <span
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${visual.tone}`}
                >
                  <Icon size={21} />
                </span>

                <h3 className="home-category-title line-clamp-2 text-sm font-bold leading-5 tracking-[-.03em]">
                  {category.name_ar}
                </h3>

                <p className="home-category-copy mt-1 line-clamp-2 text-[10px] leading-5 text-muted">
                  {category.description_ar || "خدمات تناسب احتياجك"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
        <SectionHeading
          eyebrow="اكتشف الخدمات"
          title="خلي طلبك يوصل للشخص المناسب"
          href="/discover"
          action="اكتشف أكثر"
        />

        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <Link
            href="/discover"
            className="relative min-h-[230px] overflow-hidden rounded-3xl bg-[#f6d7ca] p-6 sm:p-8"
          >
            <div className="absolute -bottom-12 -left-5 h-48 w-48 rounded-full border-[26px] border-[#fff0df]/70" />

            <div className="relative max-w-xs">
              <span className="inline-flex rounded-full bg-[#fff0df] px-3 py-1.5 text-[10px] font-bold text-[#9d5749]">
                قريباً في جسر
              </span>

              <h3 className="mt-5 text-2xl font-bold leading-tight tracking-[-.05em] text-[#713f3c]">
                سوق الخدمات
                <br />
                عم يكبر معك.
              </h3>

              <p className="mt-4 text-xs leading-6 text-[#875651]">
                لما تلاقي الخدمة اللي بدك إياها، رح تلاقي التفاصيل كلها بمكان واحد.
              </p>
            </div>

            <span className="absolute bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#bf8177]/35 text-[#92534a]">
              <ArrowLeft size={22} />
            </span>
          </Link>

          <Link
            href="/provider/apply"
            className="min-h-[230px] rounded-3xl border border-theme bg-surface p-6 sm:p-8"
          >
            <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3d9] text-[#8a641c]">
              <BriefcaseBusiness size={20} />
            </span>

            <h3 className="text-xl font-bold tracking-[-.04em]">
              بدك تبدأ كمزوّد؟
            </h3>

            <p className="mt-3 text-xs leading-6 text-muted">
              اعرض مهاراتك للناس اللي بتدور عليها. التسجيل بسيط وملفك تحت سيطرتك.
            </p>

            <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary))] px-4 py-2.5 text-xs font-bold text-brand">
              اعرف أكثر
              <ArrowLeft size={14} />
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
        <SectionHeading eyebrow="المفضلة عندك" title="لسه ما حفظت أي خدمة" />

        <div className="empty-state">
          <span className="empty-state-icon">
            <Heart size={24} />
          </span>

          <h3 className="text-base font-bold">مكتبتك الصغيرة فاضية</h3>

          <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
            احفظ الخدمات اللي بتعجبك عشان تلاقيها بسرعة وقت ما تحتاجها.
          </p>

          <Link href="/discover" className="brand-button mt-5">
            اكتشف الخدمات
            <ArrowLeft size={14} />
          </Link>
        </div>
      </section>

      {providers.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading
            eyebrow="أهل الخبرة"
            title="ناس بتعرف شغلها"
            href="/discover?scope=PROVIDERS"
            action="شوف الكل"
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {providers.map((result) => (
              <SearchResultCard key={result.result_id} result={result} />
            ))}
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading
            eyebrow="خدمات من أصحابها"
            title="شوف وقارن"
            href="/discover?scope=LISTINGS"
            action="كل الخدمات"
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {listings.map((result) => (
              <SearchResultCard key={result.result_id} result={result} />
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading
            eyebrow="شغلهم بحكي عنهم"
            title="أعمال من المجتمع"
            href="/discover?scope=POSTS"
            action="شوف الكل"
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {posts.map((result) => (
              <SearchResultCard key={result.result_id} result={result} />
            ))}
          </div>
        </section>
      )}

      {serviceTypes.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-20">
          <SectionHeading
            eyebrow="خدمات قريبة من طلبك"
            title="خدمات ممكن تحتاجها"
            href="/discover"
            action="شوف الكل"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceTypes.slice(0, 8).map((service) => (
              <Link
                key={service.id}
                href={`/service-types/${service.id}`}
                className="rounded-2xl border border-theme bg-surface p-4 transition hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary)/0.1)] text-brand">
                  <Search size={18} />
                </span>

                <h3 className="line-clamp-2 text-sm font-bold leading-6">
                  {service.title}
                </h3>

                <p className="mt-1 line-clamp-1 text-[10px] text-muted">
                  {service.category_name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
