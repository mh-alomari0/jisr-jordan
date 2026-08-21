import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  ChevronLeft,
  Grid2X2,
  LayoutGrid,
  Lightbulb,
  Paintbrush,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
  searchMarketplaceAction,
} from "@/lib/actions/marketplace-discovery";
import {
  deliveryTypeLabels,
  pricingModelLabels,
  type DeliveryType,
  type PricingModel,
} from "@/lib/marketplace";

export const metadata: Metadata = {
  title: "استكشاف الخدمات | جسر الأردن",
  description:
    "تصفح جميع الخدمات ومقدميها في الأردن، وقارن العروض والأسعار بكل سهولة.",
};

const scopes = [
  { value: "ALL", label: "الكل" },
  { value: "LISTINGS", label: "عروض الخدمات" },
  { value: "PROVIDERS", label: "مقدمو الخدمة" },
  { value: "POSTS", label: "المنشورات والأعمال" },
] as const;

const jordanCities = [
  { name: "الكل", value: "", icon: "🇯🇴" },
  { name: "عَمّان", value: "عمان", icon: "🏛️" },
  { name: "إربد", value: "إربد", icon: "🌾" },
  { name: "الزرقاء", value: "الزرقاء", icon: "🏙️" },
  { name: "العقبة", value: "العقبة", icon: "🌊" },
  { name: "السلط", value: "السلط", icon: "🌿" },
  { name: "مادبا", value: "مادبا", icon: "🎨" },
  { name: "جرش", value: "جرش", icon: "🏛️" },
  { name: "عجلون", value: "عجلون", icon: "🏰" },
];

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

const serviceTones = [
  "bg-[#e9f6f3] text-[#0b8f87]",
  "bg-[#fff0df] text-[#a46a20]",
  "bg-[#edf0fb] text-[#625ba8]",
  "bg-[#fde7ee] text-[#a44d72]",
] as const;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanServiceDescription(value: string | null | undefined) {
  if (!value) return "تصفح مقدمي هذه الخدمة وقارن بينهم قبل الطلب.";
  return value.replace(/السعر\s+يشمل[\s\S]*$/u, "").trim();
}

function buildQueryString(
  current: {
    q: string;
    scope: (typeof scopes)[number]["value"];
    category: string | null;
    delivery: string | null;
    pricing: string | null;
    area: string | null;
  },
  changes: Record<string, string | null>,
) {
  const next = new URLSearchParams();

  if (current.q) next.set("q", current.q);
  if (current.scope !== "ALL") next.set("tab", current.scope);
  if (current.category) next.set("category", current.category);
  if (current.delivery) next.set("delivery", current.delivery);
  if (current.pricing) next.set("pricing", current.pricing);
  if (current.area) next.set("area", current.area);

  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }

  const query = next.toString();
  return query ? `/discover?${query}` : "/discover";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const q = (one(params.q) || "").slice(0, 120);
  const requestedScope = one(params.tab) || "ALL";
  const scope = scopes.some((item) => item.value === requestedScope)
    ? (requestedScope as (typeof scopes)[number]["value"])
    : "ALL";

  const category = one(params.category) || null;
  const delivery = one(params.delivery) || null;
  const pricing = one(params.pricing) || null;
  const area = one(params.area) || null;
  const page = Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1);

  const [categoriesResult, taxonomyResult] = await Promise.all([
    getMarketplaceCategoriesAction(),
    getHomeServiceTaxonomyAction(),
  ]);

  const categories = categoriesResult.categories || [];
  const taxonomy = taxonomyResult.categories || [];

  const selectedCategory = category
    ? categories.find((item) => item.id === category) || null
    : null;

  const visibleGroups = category
    ? taxonomy.filter((group) => group.id === category)
    : taxonomy;

  const totalServiceTypes = visibleGroups.reduce(
    (sum, group) => sum + (group.serviceTypes?.length || 0),
    0,
  );

  const browsingServices = !q && !area;

  const searchResult = browsingServices
    ? { success: true as const, results: [], hasMore: false, page: 1 }
    : await searchMarketplaceAction({
        query: q,
        scope,
        categoryId: category,
        deliveryType: delivery as DeliveryType | null,
        pricingModel: pricing as PricingModel | null,
        page,
        pageSize: 24,
      });

  const results = searchResult.results || [];

  const hrefFor = (changes: Record<string, string | null>) =>
    buildQueryString(
      { q, scope, category, delivery, pricing, area },
      changes,
    );

  const hasFilters = Boolean(delivery || pricing || area);

  return (
    <div className="page-reveal pb-16 sm:pb-24">
      {/* Header & Search */}
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black tracking-wide text-brand">
            دليل الخدمات
          </p>

          <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-.05em] sm:text-4xl">
            {selectedCategory ? (
              <>
                خدمات {selectedCategory.name_ar}
                <br />
                <span className="text-brand">قارن واطلب الأنسب لك.</span>
              </>
            ) : (
              <>
                استكشف كل خدمات جسر
                <br />
                <span className="text-brand">في جميع مدن الأردن.</span>
              </>
            )}
          </h1>
        </div>

        <form action="/discover" role="search" className="mt-5 max-w-2xl">
          <label htmlFor="discover-search" className="sr-only">
            ابحث عن خدمة أو مقدم خدمة
          </label>

          <div className="flex h-[54px] items-center gap-2 rounded-2xl border border-theme bg-surface px-3 shadow-soft focus-within:border-[rgb(var(--primary))]">
            <Search size={19} className="ms-1 shrink-0 text-brand" aria-hidden="true" />

            <input
              id="discover-search"
              name="q"
              defaultValue={q}
              maxLength={120}
              placeholder="مثلاً: كشف تسريب مياه، مدرس رياضيات، كهربائي..."
              className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold outline-none sm:text-sm"
            />

            <button
              type="submit"
              className="brand-button !min-h-[40px] !rounded-xl !px-5 text-xs font-black"
            >
              بحث
            </button>
          </div>
        </form>

        {/* 🇯🇴 Jordan Cities Quick Slider */}
        <div className="mt-4">
          <div className="mobile-snap-row -mx-4 px-4 py-1 sm:mx-0 sm:px-0">
            {jordanCities.map((city) => {
              const active = (area || "") === city.value;
              return (
                <Link
                  key={city.name}
                  href={hrefFor({
                    area: active ? null : city.value || null,
                    page: null,
                  })}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
                    active
                      ? "bg-[rgb(var(--primary))] text-white shadow-md"
                      : "border border-theme bg-surface text-muted hover:border-[rgb(var(--primary)/0.3)] hover:text-brand"
                  }`}
                >
                  <span>{city.icon}</span>
                  <span>{city.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Category Carousel */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-brand">المجالات الرئيسية</p>
            <h2 className="text-lg font-black sm:text-xl">
              اختر المجال المطلوب
            </h2>
          </div>

          {selectedCategory && (
            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand"
            >
              <ChevronLeft size={15} />
              عرض كل المجالات
            </Link>
          )}
        </div>

        <div className="mobile-snap-row -mx-4 px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {categories.map((parent, index) => {
            const visual = categoryVisuals[index % categoryVisuals.length];
            const Icon = visual.icon;
            const selected = category === parent.id;

            return (
              <Link
                key={parent.id}
                href={hrefFor({
                  category: selected ? null : parent.id,
                  page: null,
                })}
                className={`group flex min-w-[135px] flex-col rounded-[1.6rem] border p-3.5 transition hover:-translate-y-1 hover:shadow-soft active:scale-95 sm:min-w-0 ${
                  selected
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)] shadow-sm"
                    : "border-theme bg-surface"
                }`}
              >
                <span
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${visual.tone}`}
                >
                  <Icon size={20} />
                </span>

                <h3 className="line-clamp-1 text-xs font-black">
                  {parent.name_ar}
                </h3>

                <p className="mt-1 line-clamp-2 text-[10px] text-muted">
                  {parent.description_ar || "استكشف الخدمات"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Services List / Search Results */}
      {browsingServices ? (
        <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:mt-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black text-brand">قائمة الخدمات</p>
              <h2 className="text-xl font-black sm:text-2xl">
                {selectedCategory
                  ? `خدمات ${selectedCategory.name_ar}`
                  : "جميع الخدمات المتاحة"}
              </h2>
            </div>
            <span className="status-pill bg-surface-muted text-muted font-black">
              {totalServiceTypes} خدمة
            </span>
          </div>

          <div className="space-y-8">
            {visibleGroups.map((group, groupIndex) => {
              const services = group.serviceTypes || [];
              const visual = categoryVisuals[groupIndex % categoryVisuals.length];
              const Icon = visual.icon;

              return (
                <section key={group.id} className="scroll-mt-24">
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${visual.tone}`}
                    >
                      <Icon size={18} />
                    </span>
                    <h3 className="text-base font-black sm:text-lg">
                      {group.name_ar}
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service, index) => (
                      <Link
                        key={service.id}
                        href={`/service-types/${service.id}`}
                        className="group surface-card flex min-h-[140px] flex-col justify-between p-4 active:scale-[0.98]"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                serviceTones[index % serviceTones.length]
                              }`}
                            >
                              <Grid2X2 size={18} />
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-muted transition group-hover:bg-brand group-hover:text-white">
                              <ArrowLeft size={14} />
                            </span>
                          </div>

                          <h4 className="mt-3 text-sm font-black tracking-tight">
                            {service.title}
                          </h4>

                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                            {cleanServiceDescription(service.description)}
                          </p>
                        </div>

                        <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-brand">
                          عرض مقدمي الخدمة <ArrowLeft size={12} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          {/* Scope Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {scopes.map((item) => {
              const active = scope === item.value;
              return (
                <Link
                  key={item.value}
                  href={hrefFor({
                    tab: item.value === "ALL" ? null : item.value,
                    page: null,
                  })}
                  className={`rounded-full px-4 py-2 text-[11px] font-black transition-all ${
                    active
                      ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                      : "border border-theme bg-surface text-muted hover:text-brand"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-black">
              نتائج البحث {q ? `عن: "${q}"` : area ? `في ${area}` : ""}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {results.length} نتيجة متوفرة
            </p>
          </div>

          {searchResult.success && results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <SearchResultCard
                  key={result.result_type + result.result_id}
                  result={result}
                />
              ))}
            </div>
          ) : (
            <div className="surface-card p-10 text-center space-y-3">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                <Search size={24} />
              </span>
              <h3 className="text-base font-black">لا توجد نتائج مطابقة</h3>
              <p className="text-xs text-muted">
                جرّب البحث بكلمة أخرى أو اختر محافظة مختلفة.
              </p>
              <Link href="/discover" className="brand-button mt-2">
                عرض كل الخدمات
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}