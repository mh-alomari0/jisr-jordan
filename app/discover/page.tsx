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
  Sparkles,
  Wrench,
} from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
  searchMarketplaceAction,
} from "@/lib/actions/marketplace-discovery";
import type { DeliveryType, PricingModel } from "@/lib/marketplace";

export const metadata: Metadata = {
  title: "استكشاف الخدمات | جسر الأردن",
  description:
    "دور على الخدمة اللي تحتاجها في الأردن وشوف مقدميها وأعمالهم قبل ما تختار.",
};

const scopes = [
  { value: "ALL", label: "الكل" },
  { value: "LISTINGS", label: "خدمات جاهزة" },
  { value: "PROVIDERS", label: "مقدمو الخدمة" },
  { value: "POSTS", label: "أعمال منشورة" },
] as const;

const jordanCities = [
  { name: "كل الأردن", value: "" },
  { name: "عَمّان", value: "عمان" },
  { name: "إربد", value: "إربد" },
  { name: "الزرقاء", value: "الزرقاء" },
  { name: "العقبة", value: "العقبة" },
  { name: "السلط", value: "السلط" },
  { name: "مادبا", value: "مادبا" },
  { name: "جرش", value: "جرش" },
  { name: "عجلون", value: "عجلون" },
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
  if (!value) return "شوف مين بقدم هاي الخدمة وقارن بينهم قبل ما تختار.";
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

  const requestedCategory = one(params.category) || null;
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
  const category =
    requestedCategory && categories.some((item) => item.id === requestedCategory)
      ? requestedCategory
      : null;

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

  return (
    <div className="page-reveal pb-16 sm:pb-24">
      <section className="mx-auto max-w-6xl px-4 pb-7 pt-5 sm:px-6 sm:pb-9 sm:pt-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black tracking-[.08em] text-brand">
              دور على شغلتك
            </p>

            <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-.045em] sm:text-4xl">
              {selectedCategory ? (
                <>
                  {selectedCategory.name_ar}
                  <span className="mt-1 block text-base font-bold tracking-normal text-muted sm:text-lg">
                    شوف الخدمات الموجودة واختار اللي أقرب لطلبك.
                  </span>
                </>
              ) : (
                <>
                  شو بدك تنجز اليوم؟
                  <span className="mt-1 block text-base font-bold tracking-normal text-muted sm:text-lg">
                    اكتبها زي ما بتحكيها، حتى لو ما بتعرف اسم الخدمة.
                  </span>
                </>
              )}
            </h1>
          </div>

          <p className="hidden max-w-sm justify-self-end text-xs leading-6 text-muted lg:block">
            جسر بجمع الخدمات ومقدميها بمكان واحد. دور، شوف التفاصيل، وبعدها قرر مين بناسبك.
          </p>
        </div>

        <form action="/discover" role="search" className="mt-5 max-w-3xl">
          <label htmlFor="discover-search" className="sr-only">
            ابحث عن خدمة أو مقدم خدمة
          </label>

          <div className="flex min-h-[56px] items-center gap-2 rounded-[1.15rem] border border-theme bg-surface p-2 ps-3 shadow-[0_8px_24px_rgb(var(--shadow)/0.05)] focus-within:border-[rgb(var(--primary))]">
            <Search size={19} className="shrink-0 text-brand" aria-hidden="true" />

            <input
              id="discover-search"
              name="q"
              defaultValue={q}
              maxLength={120}
              placeholder="مثلاً: بدي حدا يصلح مواسير المي"
              className="min-w-0 flex-1 bg-transparent px-1 text-xs font-bold outline-none placeholder:font-medium sm:px-2 sm:text-sm"
            />

            <button
              type="submit"
              className="brand-button !min-h-[40px] !rounded-[.85rem] !px-4 text-xs font-black sm:!px-5"
            >
              دور
            </button>
          </div>
        </form>

        <div className="mt-4 border-b border-theme pb-4">
          <div className="mobile-snap-row -mx-4 px-4 sm:mx-0 sm:px-0">
            {jordanCities.map((city) => {
              const active = (area || "") === city.value;

              return (
                <Link
                  key={city.name}
                  href={hrefFor({
                    area: active ? null : city.value || null,
                    page: null,
                  })}
                  className={`inline-flex items-center border-b-2 px-1 pb-2 text-xs font-bold transition active:opacity-70 ${
                    active
                      ? "border-[rgb(var(--primary))] text-brand"
                      : "border-transparent text-muted hover:text-[rgb(var(--text-main))]"
                  }`}
                >
                  {city.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-brand">المجالات</p>
            <h2 className="text-lg font-black sm:text-xl">
              {selectedCategory ? "المجال المختار" : "من وين حاب تبدأ؟"}
            </h2>
          </div>

          {selectedCategory && (
            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-xs font-black text-brand"
            >
              كل المجالات <ChevronLeft size={15} />
            </Link>
          )}
        </div>

        <div className="mobile-snap-row -mx-4 px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-8">
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
                className={`group min-w-[132px] border-b px-1 py-3 transition active:opacity-70 sm:min-w-0 sm:rounded-[1.1rem] sm:border sm:p-3 ${
                  selected
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.06)]"
                    : "border-theme sm:bg-surface"
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${visual.tone}`}>
                  <Icon size={19} />
                </span>

                <h3 className="mt-2.5 line-clamp-1 text-xs font-black">{parent.name_ar}</h3>

                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-muted">
                  {parent.description_ar || "شوف الخدمات الموجودة"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {browsingServices ? (
        <section className="mx-auto mt-9 max-w-6xl px-4 sm:px-6 lg:mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-brand">الخدمات</p>
              <h2 className="text-xl font-black sm:text-2xl">
                {selectedCategory
                  ? `شو موجود في ${selectedCategory.name_ar}؟`
                  : "كل الخدمات الموجودة على جسر"}
              </h2>
            </div>
            <span className="text-[11px] font-bold text-muted">{totalServiceTypes} خدمة</span>
          </div>

          <div className="space-y-10">
            {visibleGroups.map((group, groupIndex) => {
              const services = group.serviceTypes || [];
              const visual = categoryVisuals[groupIndex % categoryVisuals.length];
              const Icon = visual.icon;

              return (
                <section key={group.id} className="scroll-mt-24">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${visual.tone}`}>
                      <Icon size={17} />
                    </span>
                    <div>
                      <h3 className="text-base font-black sm:text-lg">{group.name_ar}</h3>
                      <p className="text-[10px] text-muted">{services.length} خدمة</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[1.3rem] border border-theme bg-surface sm:grid sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service, index) => (
                      <Link
                        key={service.id}
                        href={`/service-types/${service.id}`}
                        className="group flex min-h-[120px] gap-3 border-b border-theme p-4 transition hover:bg-surface-muted active:opacity-75 sm:border-e"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            serviceTones[index % serviceTones.length]
                          }`}
                        >
                          <Grid2X2 size={17} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-black leading-6">{service.title}</h4>
                            <ArrowLeft size={14} className="mt-1 shrink-0 text-brand" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                            {cleanServiceDescription(service.description)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
          <div className="mb-6 flex gap-5 overflow-x-auto border-b border-theme hide-scrollbar">
            {scopes.map((item) => {
              const active = scope === item.value;

              return (
                <Link
                  key={item.value}
                  href={hrefFor({
                    tab: item.value === "ALL" ? null : item.value,
                    page: null,
                  })}
                  className={`shrink-0 border-b-2 pb-3 text-[11px] font-black transition ${
                    active
                      ? "border-[rgb(var(--primary))] text-brand"
                      : "border-transparent text-muted hover:text-[rgb(var(--text-main))]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                {q ? `نتائج لـ «${q}»` : area ? `الموجود في ${area}` : "النتائج"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                لقينا {results.length} {results.length === 1 ? "نتيجة" : "نتائج"}
              </p>
            </div>
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
            <div className="mx-auto max-w-xl border-y border-theme py-12 text-center sm:border sm:p-10 sm:rounded-[1.4rem] sm:bg-surface">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
                <Search size={21} />
              </span>
              <h3 className="mt-4 text-base font-black">ما لقينا نتيجة مطابقة</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-6 text-muted">
                جرّب تحكي المشكلة بطريقة ثانية، أو شيل اسم المدينة وخلي جسر يدور بشكل أوسع.
              </p>
              <Link href="/discover" className="secondary-button mt-5 !min-h-[42px] !rounded-xl text-xs">
                ارجع لكل الخدمات
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
