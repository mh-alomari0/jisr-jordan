import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  Code2,
  GraduationCap,
  House,
  LayoutGrid,
  PaintRoller,
  Palette,
  Search,
  Shapes,
  Sparkles,
  Wrench,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
  searchMarketplaceAction,
} from "@/lib/actions/marketplace-discovery";

const categoryVisuals = {
  "home-services": { icon: House, tone: "bg-[#d8f0e9] text-[#087a72]" },
  "technology-programming": { icon: Code2, tone: "bg-[#dce9f8] text-[#326a96]" },
  "education-training": { icon: GraduationCap, tone: "bg-[#fbe8ba] text-[#8a641c]" },
  "beauty-care": { icon: Sparkles, tone: "bg-[#f9dce8] text-[#a14670]" },
  "design-creative": { icon: Palette, tone: "bg-[#e2e3f7] text-[#5d5799]" },
  "maintenance-repair": { icon: Wrench, tone: "bg-[#e6e4db] text-[#607064]" },
  "other-services": { icon: Shapes, tone: "bg-[#dcefe5] text-[#267a57]" },
} as const;

function SectionHeading({
  eyebrow,
  title,
  copy,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-black text-brand tracking-wide">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black tracking-[-.05em] sm:text-3xl">
          {title}
        </h2>
        {copy && (
          <p className="mt-1 text-xs leading-6 text-muted sm:text-sm">
            {copy}
          </p>
        )}
      </div>
      {href && action && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 rounded-full border border-theme bg-surface px-4 py-2 text-xs font-bold text-brand shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft active:scale-[.98] sm:flex"
        >
          <ChevronLeft size={15} />
          {action}
        </Link>
      )}
    </div>
  );
}

function ObjectTile({
  icon: Icon,
  label,
  className = "",
}: {
  icon: typeof Wrench;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[1.8rem] border border-white/80 bg-[#fbf8f1] shadow-[0_16px_45px_rgba(4,66,64,.10)] transition-all hover:scale-[1.02] ${className}`}
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#e1f3ef] text-[#087f79]">
        <Icon strokeWidth={1.7} size={38} />
      </span>
      <span className="mt-3 text-xs font-black text-[#164348]">{label}</span>
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

  const categories = (categoriesResult.categories || []).filter(
    (c) => c.slug !== "business-consulting" && c.slug !== "events"
  );
  const serviceTypes = (taxonomyResult.categories || [])
    .flatMap((c) => c.serviceTypes || [])
    .slice(0, 8);
  const providers = providersResult.results || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];

  return (
    <div className="page-reveal pb-16 sm:pb-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:pb-14">
        <div className="overflow-hidden rounded-[2.4rem] border border-[rgb(var(--primary)/.15)] bg-[#087f79] shadow-lift">
          <div className="grid lg:grid-cols-2">
            <div className="relative flex min-h-[420px] items-center overflow-hidden bg-gradient-to-br from-[#065053] via-[#087f79] to-[#0ba59d] px-6 py-10 text-white sm:px-10 lg:px-12">
              <div className="absolute -bottom-28 -right-20 h-72 w-72 rounded-full border-[30px] border-white/10" />
              <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#ffc985]/15 blur-2xl" />

              <div className="relative w-full">
                <h1 className="text-[2.6rem] font-black leading-[1.1] tracking-[-.075em] sm:text-5xl lg:text-[3.8rem]">
                  الشغل عليك،
                  <br />
                  <span className="text-[#26d7cf]">وعلينا نكبّر اسمك.</span>
                </h1>

                <p className="mt-4 max-w-lg text-xs leading-6 text-[#d9f3ee] sm:text-sm sm:leading-7">
                  بدك خدمة؟ دور عليها، قارن بين أفضل الكفاءات، وتواصل مباشرة بأمان. عندك شغلة بتتقنها؟ انضم وخلي الكل يلاقيك.
                </p>

                <form action="/discover" role="search" className="mt-6">
                  <div className="flex min-h-[58px] items-center gap-2 rounded-2xl bg-white p-2 text-[rgb(var(--text-main))] shadow-[0_20px_50px_rgba(2,45,42,.24)]">
                    <Search size={20} className="ms-2 shrink-0 text-[#087f79]" />
                    <input
                      name="q"
                      type="search"
                      maxLength={120}
                      placeholder="شو حابب تنجز اليوم؟ (صيانة، تعليم، برمجة...)"
                      className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold outline-none sm:text-sm text-gray-800 placeholder:text-gray-400"
                    />
                    <button className="brand-button !min-h-[44px] !rounded-xl !px-6 text-xs font-black">
                      بحث
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Desktop Visual */}
            <div className="relative hidden min-h-[420px] bg-[#f4efe5] p-6 lg:block">
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
                <ObjectTile icon={Wrench} label="صيانة وإصلاح" />
                <ObjectTile icon={Code2} label="تقنية وبرمجة" />
                <ObjectTile icon={GraduationCap} label="تعليم وتدريب" />
                <ObjectTile icon={PaintRoller} label="دهان وتشطيب" />
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.8rem] border-[5px] border-[#f4efe5] bg-[#0a9b92] text-2xl font-black text-white shadow-2xl">
                جسر
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Category Shortcuts */}
        <div className="mt-4 grid grid-cols-4 gap-2.5 lg:hidden">
          {[
            [House, "خدمات بيت", "/discover?category=home-services"],
            [Wrench, "صيانة", "/discover?category=maintenance-repair"],
            [Code2, "تقنية", "/discover?category=technology-programming"],
            [GraduationCap, "تعليم", "/discover?category=education-training"],
          ].map(([Icon, label, href]) => {
            const I = Icon as typeof House;
            return (
              <Link
                key={String(label)}
                href={String(href)}
                className="flex flex-col items-center justify-center rounded-2xl border border-theme bg-surface p-3 text-center shadow-sm active:scale-95 transition-transform"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                  <I size={20} />
                </span>
                <p className="mt-2 text-[10px] font-black">{String(label)}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Categories Carousel */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="تصفح المجالات"
          title="اختار المجال وخلي الباقي علينا"
          copy="كل ما تحتاجه من خدمات منزلية ورقمية ومهنية."
          href="/discover"
          action="عرض الكل"
        />
        <div className="mobile-snap-row -mx-4 px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
          {categories.slice(0, 7).map((category) => {
            const visual =
              categoryVisuals[category.slug as keyof typeof categoryVisuals] || {
                icon: LayoutGrid,
                tone: "bg-[#e6e4db] text-[#607064]",
              };
            const Icon = visual.icon;
            return (
              <Link
                key={category.id}
                href={`/discover?category=${category.id}`}
                className="group min-w-[145px] rounded-[1.6rem] border border-theme bg-surface p-4 transition duration-300 hover:-translate-y-1 hover:shadow-soft active:scale-95 sm:min-w-0"
              >
                <span
                  className={`flex h-13 w-13 items-center justify-center rounded-2xl ${visual.tone}`}
                >
                  <Icon size={24} />
                </span>
                <h3 className="mt-4 line-clamp-1 text-sm font-black leading-5">
                  {category.name_ar}
                </h3>
                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">
                  {category.description_ar || "استكشف الخدمات المتاحة"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Listings */}
      {listings.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="خدمات جاهزة"
            title="عروض مميزة وجاهزة للطلب"
            copy="قارن بين الأسعار وتفاصيل الخدمة واطلب فوراً."
            href="/discover?scope=LISTINGS"
            action="كل الخدمات"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((r) => (
              <SearchResultCard key={r.result_id} result={r} />
            ))}
          </div>
        </section>
      )}

      {/* Providers */}
      {providers.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="كفاءات موثوقة"
            title="مقدمو خدمة معتمدون"
            copy="تصفح ملفات المحترفين وتواصل معهم مباشرة."
            href="/discover?scope=PROVIDERS"
            action="كل المحترفين"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {providers.map((r) => (
              <SearchResultCard key={r.result_id} result={r} />
            ))}
          </div>
        </section>
      )}

      {/* Provider CTA Banner */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-l from-[#087f79] to-[#044c52] p-7 text-white shadow-lift sm:p-10">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full border-[20px] border-white/10" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[11px] font-black text-[#bcece6]">
                عندك مهارة أو شغف؟
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.05em] sm:text-3xl">
                انضم لمجتمع جسر ووسّع قاعدة عملائك.
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-white/80 sm:text-sm">
                اعمل ملفك المهني، أضف خدماتك، وخلي الزبائن يوصلولك بكل سهولة وأمان.
              </p>
            </div>
            <Link
              href="/provider/apply"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-xs font-black text-[#087f79] shadow-lg transition hover:-translate-y-0.5 active:scale-[.98]"
            >
              سجّل كمقدم خدمة <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      {posts.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="أعمال حقيقية"
            title="من أرض الميدان"
            copy="نماذج من أحدث أعمال وخدمات المحترفين على جسر."
            href="/discover?scope=POSTS"
            action="عرض الكل"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((r) => (
              <SearchResultCard key={r.result_id} result={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}