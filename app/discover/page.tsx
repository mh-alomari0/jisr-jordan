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
  title: "استكشاف الخدمات",
  description:
    "كل خدمات جسر الأردن مرتبة حسب المجال، ثم اختر الخدمة وقارن بين مقدميها.",
};

const scopes = [
  { value: "ALL", label: "الكل" },
  { value: "LISTINGS", label: "عروض الخدمات" },
  { value: "PROVIDERS", label: "مقدمو الخدمة" },
  { value: "POSTS", label: "المنشورات" },
] as const;

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
  if (!value) return "شوف مقدمي هذه الخدمة وقارن بينهم قبل الطلب.";
  return value.replace(/السعر\s+يشمل[\s\S]*$/u, "").trim();
}

function buildQueryString(
  current: {
    q: string;
    scope: (typeof scopes)[number]["value"];
    category: string | null;
    delivery: string | null;
    pricing: string | null;
  },
  changes: Record<string, string | null>,
) {
  const next = new URLSearchParams();

  if (current.q) next.set("q", current.q);
  if (current.scope !== "ALL") next.set("tab", current.scope);
  if (current.category) next.set("category", current.category);
  if (current.delivery) next.set("delivery", current.delivery);
  if (current.pricing) next.set("pricing", current.pricing);

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
  const page = Math.max(
    1,
    Number.parseInt(one(params.page) || "1", 10) || 1,
  );

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

  const browsingServices = !q;

  const searchResult = browsingServices
    ? {
        success: true as const,
        results: [],
        hasMore: false,
        page: 1,
      }
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
      { q, scope, category, delivery, pricing },
      changes,
    );

  const hasFilters = Boolean(delivery || pricing);

  return (
    <div className="page-reveal pb-12 sm:pb-16">
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold tracking-[.08em] text-brand">
            دليل جسر
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
            {selectedCategory ? (
              <>
                {selectedCategory.name_ar}
                <br />
                <span className="text-brand">كل خدمات المجال قدامك.</span>
              </>
            ) : (
              <>
                كل خدمات جسر
                <br />
                <span className="text-brand">مرتبة وواضحة.</span>
              </>
            )}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            {selectedCategory
              ? `نعرض لك كل أنواع الخدمات الموجودة داخل ${selectedCategory.name_ar}. اختَر الخدمة وبعدها قارن مقدميها.`
              : `عندنا ${categories.length} مجالات رئيسية و${totalServiceTypes} نوع خدمة فعّال حالياً. اختَر المجال أو انزل وشوف كل الخدمات بالتفصيل.`}
          </p>
        </div>

        <form
          action="/discover"
          role="search"
          className="mt-7 max-w-2xl"
        >
          <label htmlFor="discover-search" className="sr-only">
            ابحث عن خدمة أو مقدم خدمة
          </label>

          <div className="flex h-14 items-center gap-3 rounded-2xl border border-theme bg-surface px-4 shadow-soft focus-within:border-[rgb(var(--primary))]">
            <Search
              size={20}
              className="shrink-0 text-brand"
              aria-hidden="true"
            />

            <input
              id="discover-search"
              name="q"
              defaultValue={q}
              maxLength={120}
              placeholder="مثلاً: كشف تسريب مياه، مدرس رياضيات، تصميم شعار..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />

            <button
              type="submit"
              className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-xs font-bold text-white transition hover:bg-[rgb(var(--primary-strong))]"
            >
              ابحث
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[.08em] text-brand">
              المجالات الرئيسية
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-.04em] sm:text-2xl">
              اختَر مجال، أو شوفهم كلهم
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

        <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {categories.map((parent, index) => {
            const visual =
              categoryVisuals[index % categoryVisuals.length];
            const Icon = visual.icon;
            const selected = category === parent.id;

            return (
              <Link
                key={parent.id}
                href={hrefFor({
                  category: selected ? null : parent.id,
                  q: null,
                  page: null,
                })}
                aria-current={selected ? "page" : undefined}
                className={`home-category-card group flex min-w-[142px] flex-col rounded-2xl border p-3.5 transition hover:-translate-y-1 hover:shadow-soft sm:min-w-0 ${
                  selected
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.07)]"
                    : "border-theme bg-surface"
                }`}
              >
                <span
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${visual.tone}`}
                >
                  <Icon size={21} />
                </span>

                <h3 className="home-category-title line-clamp-2 text-sm font-bold leading-5 tracking-[-.03em]">
                  {parent.name_ar}
                </h3>

                <p className="home-category-copy mt-1 line-clamp-3 text-[10px] leading-5 text-muted">
                  {parent.description_ar || "خدمات تناسب احتياجك"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {browsingServices ? (
        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-14">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[.08em] text-brand">
                كل الخدمات بالتفصيل
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-.045em] sm:text-3xl">
                {selectedCategory
                  ? `خدمات ${selectedCategory.name_ar}`
                  : "اختَر الخدمة اللي محتاجها"}
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                كل خدمة تحت هي نوع خدمة ثابت على جسر. لما تفتحها بنعرض لك كل مقدميها وعروضهم وأسعارهم.
              </p>
            </div>

            <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-bold text-muted">
              {totalServiceTypes} خدمة
            </span>
          </div>

          {visibleGroups.length > 0 ? (
            <div className="space-y-10">
              {visibleGroups.map((group, groupIndex) => {
                const services = group.serviceTypes || [];
                const visual =
                  categoryVisuals[
                    groupIndex % categoryVisuals.length
                  ];
                const Icon = visual.icon;

                return (
                  <section
                    key={group.id}
                    className="scroll-mt-24"
                    aria-labelledby={`group-${group.id}`}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${visual.tone}`}
                      >
                        <Icon size={19} />
                      </span>

                      <div>
                        <h3
                          id={`group-${group.id}`}
                          className="text-lg font-bold tracking-[-.035em] sm:text-xl"
                        >
                          {group.name_ar}
                        </h3>

                        <p className="mt-0.5 text-[10px] text-muted">
                          {group.description_ar ||
                            `${services.length} خدمات ضمن هذا المجال`}
                        </p>
                      </div>
                    </div>

                    {services.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {services.map((service, index) => (
                          <Link
                            key={service.id}
                            href={`/service-types/${service.id}`}
                            className="group flex min-h-[180px] flex-col justify-between rounded-3xl border border-theme bg-surface p-5 transition hover:-translate-y-1 hover:border-[rgb(var(--primary)/0.45)] hover:shadow-soft"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                  serviceTones[
                                    index % serviceTones.length
                                  ]
                                }`}
                              >
                                <Grid2X2 size={20} />
                              </span>

                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-theme text-muted transition group-hover:bg-[rgb(var(--primary))] group-hover:text-white">
                                <ArrowLeft size={15} />
                              </span>
                            </div>

                            <div className="mt-5">
                              <p className="text-[9px] font-bold text-brand">
                                {service.category_name ||
                                  group.name_ar}
                              </p>

                              <h4 className="mt-1 text-base font-bold leading-7 tracking-[-.03em]">
                                {service.title}
                              </h4>

                              <p className="mt-1 line-clamp-3 text-[11px] leading-6 text-muted">
                                {cleanServiceDescription(
                                  service.description,
                                )}
                              </p>

                              <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-brand">
                                شوف مقدمي الخدمة
                                <ArrowLeft size={13} />
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-[rgb(var(--primary)/0.32)] bg-[rgb(var(--primary)/0.025)] p-8 text-center">
                        <p className="text-sm font-bold">
                          ما في أنواع خدمات مضافة داخل هذا المجال بعد
                        </p>

                        <p className="mt-2 text-[11px] leading-6 text-muted">
                          المجال موجود، لكن جدول الخدمات ما فيه أنواع فعالة مرتبطة فيه حالياً.
                        </p>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="empty-state py-14">
              <span className="empty-state-icon">
                <Grid2X2 size={23} />
              </span>

              <h3 className="text-base font-bold">
                ما في خدمات مضافة لهذا المجال بعد
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
                المجال موجود، لكن ما في Service Types فعالة مرتبطة فيه حالياً.
              </p>

              <Link href="/discover" className="brand-button mt-5">
                عرض كل المجالات
                <ArrowLeft size={14} />
              </Link>
            </div>
          )}
        </section>
      ) : (
        <>
          <section
            id="filters"
            className="mx-auto mt-8 max-w-6xl scroll-mt-24 px-4 sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              {scopes.map((item) => {
                const active = scope === item.value;

                return (
                  <Link
                    key={item.value}
                    href={hrefFor({
                      tab:
                        item.value === "ALL"
                          ? null
                          : item.value,
                      page: null,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                      active
                        ? "bg-[rgb(var(--primary))] text-white"
                        : "border border-theme bg-surface hover:text-brand"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <details className="mt-4 rounded-3xl border border-theme bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-[10px] font-bold text-brand">
                    نتائج البحث
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    صفّي النتائج إذا احتجت
                  </h2>
                </div>

                <SlidersHorizontal
                  size={18}
                  className="text-muted"
                />
              </summary>

              <form
                action="/discover"
                className="grid gap-3 border-t border-theme p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3"
              >
                {q && <input type="hidden" name="q" value={q} />}
                {scope !== "ALL" && (
                  <input
                    type="hidden"
                    name="tab"
                    value={scope}
                  />
                )}

                <label className="text-[11px] font-bold">
                  طريقة تقديم الخدمة
                  <select
                    name="delivery"
                    defaultValue={delivery || ""}
                    className="form-field mt-1.5"
                  >
                    <option value="">الكل</option>
                    {Object.entries(
                      deliveryTypeLabels,
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[11px] font-bold">
                  نظام التسعير
                  <select
                    name="pricing"
                    defaultValue={pricing || ""}
                    className="form-field mt-1.5"
                  >
                    <option value="">الكل</option>
                    {Object.entries(
                      pricingModelLabels,
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end gap-2">
                  <button
                    className="brand-button flex-1"
                    type="submit"
                  >
                    تطبيق
                  </button>

                  {hasFilters && (
                    <Link
                      href={
                        q
                          ? `/discover?q=${encodeURIComponent(q)}`
                          : "/discover"
                      }
                      className="secondary-button"
                    >
                      مسح
                    </Link>
                  )}
                </div>
              </form>
            </details>
          </section>

          <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:mt-12">
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-[.08em] text-brand">
                نتائج جسر
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-[-.04em] sm:text-2xl">
                نتائج البحث عن: {q}
              </h2>

              <p
                aria-live="polite"
                className="mt-1 text-[11px] text-muted"
              >
                {results.length} نتيجة في هذه الصفحة
              </p>
            </div>

            {searchResult.success ? (
              results.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.map((result) => (
                    <SearchResultCard
                      key={
                        result.result_type +
                        result.result_id
                      }
                      result={result}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state py-14">
                  <span className="empty-state-icon">
                    <Search size={23} />
                  </span>

                  <h3 className="text-base font-bold">
                    ما لقينا نتيجة مطابقة
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
                    جرّب كلمة أبسط، أو امسح البحث وشوف كل الخدمات مرتبة حسب المجال.
                  </p>

                  <Link href="/discover" className="brand-button mt-5">
                    عرض كل الخدمات
                  </Link>
                </div>
              )
            ) : (
              <div
                role="alert"
                className="rounded-3xl border border-[rgb(var(--danger)/0.35)] bg-surface p-8 text-center text-sm"
              >
                {searchResult.error}
              </div>
            )}

            {(page > 1 || searchResult.hasMore) && (
              <div className="mt-7 flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={hrefFor({
                      page: String(page - 1),
                    })}
                    className="secondary-button"
                  >
                    السابق
                  </Link>
                )}

                {searchResult.hasMore && (
                  <Link
                    href={hrefFor({
                      page: String(page + 1),
                    })}
                    className="secondary-button"
                  >
                    التالي
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
