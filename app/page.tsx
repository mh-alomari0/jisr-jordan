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
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  href?: string;
  action?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${compact ? "mb-4" : "mb-5"}`}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-black tracking-[.08em] text-brand sm:text-[11px]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-black leading-tight tracking-[-.04em] sm:text-3xl">
          {title}
        </h2>
        {copy && (
          <p className="mt-1.5 text-xs leading-6 text-muted sm:text-sm">
            {copy}
          </p>
        )}
      </div>

      {href && action && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-xs font-black text-brand transition hover:opacity-75 sm:flex"
        >
          {action}
          <ChevronLeft size={15} />
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
      className={`flex flex-col items-center justify-center rounded-[1.45rem] border border-[#e7dfd3] bg-[#fbf8f1] px-4 py-5 shadow-[0_8px_26px_rgba(4,66,64,.07)] ${className}`}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-[1.15rem] bg-[#e1f3ef] text-[#087f79]">
        <Icon strokeWidth={1.7} size={30} />
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
    (c) => c.slug !== "business-consulting" && c.slug !== "events",
  );

  const serviceTypes = (taxonomyResult.categories || [])
    .flatMap((c) => c.serviceTypes || [])
    .slice(0, 8);

  const providers = providersResult.results || [];
  const listings = listingsResult.results || [];
  const posts = postsResult.results || [];

  return (
    <div className="page-reveal pb-16 sm:pb-24">
      <section className="mx-auto max-w-6xl px-4 pb-9 pt-4 sm:px-6 sm:pt-8 lg:pb-14">
        <div className="overflow-hidden rounded-[2rem] border border-[rgb(var(--primary)/.14)] bg-[#087f79] shadow-[0_18px_50px_rgba(4,66,64,.13)] sm:rounded-[2.3rem]">
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative flex min-h-[390px] items-center overflow-hidden bg-[#087f79] px-6 py-9 text-white sm:px-10 sm:py-11 lg:min-h-[430px] lg:px-12">
              <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full border-[28px] border-white/[.07]" />

              <div className="relative w-full">
                <p className="mb-4 text-[11px] font-black text-[#b9eee8]">
                  خدمات ومهارات من ناس قريبين منك
                </p>

                <h1 className="max-w-xl text-[2.45rem] font-black leading-[1.12] tracking-[-.065em] sm:text-5xl lg:text-[3.7rem]">
                  الشغل عليك،
                  <br />
                  <span className="text-[#63dfd6]">وعلينا نوصّلك.</span>
                </h1>

                <p className="mt-4 max-w-lg text-xs leading-7 text-[#def4f1] sm:text-sm">
                  احكيلنا شو بدك بكلماتك. بندوّر معك على الخدمة المناسبة، وبعدها قارن بين الناس اللي بقدموها واختار براحتك.
                </p>

                <form action="/discover" role="search" className="mt-6 max-w-xl">
                  <div className="flex min-h-[58px] items-center gap-2 rounded-[1.15rem] bg-white p-2 text-[rgb(var(--text-main))] shadow-[0_16px_38px_rgba(2,45,42,.18)]">
                    <Search size={19} className="ms-2 shrink-0 text-[#087f79]" />
                    <input
                      name="q"
                      type="search"
                      maxLength={120}
                      placeholder="مثلاً: المي بتنقط من تحت المجلى"
                      className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold text-gray-800 outline-none placeholder:font-medium placeholder:text-gray-400 sm:text-sm"
                    />
                    <button className="brand-button !min-h-[42px] !rounded-[.9rem] !px-5 text-xs font-black">
                      دورلي
                    </button>
                  </div>
                </form>

                <p className="mt-3 text-[10px] leading-5 text-white/65">
                  ما بتعرف اسم الخدمة؟ عادي. اكتب المشكلة زي ما بتحكيها.
                </p>
              </div>
            </div>

            <div className="relative hidden min-h-[430px] bg-[#f4efe5] p-6 lg:block">
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-3.5">
                <ObjectTile icon={Wrench} label="صيانة وإصلاح" />
                <ObjectTile icon={Code2} label="تقنية وبرمجة" className="translate-y-3" />
                <ObjectTile icon={GraduationCap} label="تعليم وتدريب" className="-translate-y-3" />
                <ObjectTile icon={PaintRoller} label="دهان وتشطيب" />
              </div>

              <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.35rem] border-[5px] border-[#f4efe5] bg-[#0a9189] text-xl font-black text-white shadow-lg">
                جسر
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 lg:hidden">
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
                className="flex min-w-0 flex-col items-center justify-center rounded-[1.1rem] border border-theme bg-surface px-2 py-3 text-center transition active:scale-[.97]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
                  <I size={19} />
                </span>
                <p className="mt-2 truncate text-[10px] font-black">{String(label)}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="المجالات"
          title="ابدأ من المجال الأقرب لشغلتك"
          copy="وإذا مش متأكد، استخدم البحث فوق واحكيلنا المشكلة مثل ما هي."
          href="/discover"
          action="شوف الكل"
        />

        <div className="mobile-snap-row -mx-4 px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-7">
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
                className="group min-w-[142px] border-b border-theme bg-transparent px-1 py-3 transition active:opacity-70 sm:min-w-0 sm:rounded-[1.2rem] sm:border sm:bg-surface sm:p-3.5"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${visual.tone}`}>
                  <Icon size={21} />
                </span>
                <h3 className="mt-3 line-clamp-1 text-sm font-black leading-5">{category.name_ar}</h3>
                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">
                  {category.description_ar || "استكشف الخدمات المتاحة"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {serviceTypes.length > 0 && (
        <section className="mx-auto mt-11 max-w-6xl px-4 sm:px-6 lg:mt-15">
          <SectionHeading
            eyebrow="طلبات شائعة"
            title="يمكن هاي هي الشغلة اللي بدك إياها"
            copy="ادخل على الخدمة نفسها وشوف مين بقدمها."
            href="/discover"
            action="كل الخدمات"
            compact
          />

          <div className="divide-y divide-[rgb(var(--border))] rounded-[1.35rem] border border-theme bg-surface sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {serviceTypes.map((service, index) => (
              <Link
                key={service.id}
                href={`/service-types/${service.id}`}
                className={`group flex min-h-[92px] items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-surface-muted active:opacity-75 ${
                  index > 0 ? "sm:border-s sm:border-theme" : ""
                }`}
              >
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-black leading-6">{service.title}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{service.category_name}</p>
                </div>
                <ChevronLeft size={17} className="shrink-0 text-brand" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="جاهزة للطلب"
            title="خدمات أصحابها محددين تفاصيلها من قبل"
            copy="شوف التفاصيل والسعر وطريقة التنفيذ قبل ما تطلب."
            href="/discover?scope=LISTINGS"
            action="كل العروض"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((r) => (
              <SearchResultCard key={r.result_id} result={r} />
            ))}
          </div>
        </section>
      )}

      {providers.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="ناس بتشتغل"
            title="شوف مقدمي الخدمة قبل ما تحكي معهم"
            copy="ملفهم، شغلهم وتقييماتهم بمكان واحد."
            href="/discover?scope=PROVIDERS"
            action="كل مقدمي الخدمة"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {providers.map((r) => (
              <SearchResultCard key={r.result_id} result={r} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
        <div className="overflow-hidden rounded-[1.7rem] border border-[#0b746e] bg-[#087f79] px-6 py-7 text-white sm:px-9 sm:py-8">
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[10px] font-black text-[#bcece6]">بتعرف تعمل شغلة منيح؟</p>
              <h2 className="mt-1.5 text-2xl font-black tracking-[-.04em] sm:text-3xl">
                خلي الناس تلاقيك على جسر.
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-white/80 sm:text-sm">
                اعمل ملفك، أضف الخدمات اللي بتقدمها، وخلي العميل يشوف شغلك قبل ما يتواصل معك.
              </p>
            </div>

            <Link
              href="/provider/apply"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-[#087f79] transition hover:bg-[#f7f7f5] active:scale-[.98]"
            >
              سجّل كمقدم خدمة <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:mt-16">
          <SectionHeading
            eyebrow="من شغلهم"
            title="شوف شو عم ينجزوا على أرض الواقع"
            copy="أعمال منشورة من مقدمي الخدمة على جسر."
            href="/discover?scope=POSTS"
            action="شوف أكثر"
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
