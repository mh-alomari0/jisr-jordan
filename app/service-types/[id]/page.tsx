import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import ProviderServiceCard from "@/components/marketplace/provider-service-card";
import {
  getServiceTypeAction,
  getServiceTypeProvidersAction,
} from "@/lib/actions/marketplace-discovery";
import { pricingModelLabels } from "@/lib/marketplace";
import { JORDAN_CITIES } from "@/lib/constants";

const sortOptions = [
  ["RATING_DESC", "الأعلى تقييماً"],
  ["EXPERIENCE_DESC", "الأكثر خبرة"],
  ["EXPERIENCE_ASC", "الأحدث خبرة"],
  ["PRICE_ASC", "السعر: الأقل أولاً"],
  ["PRICE_DESC", "السعر: الأعلى أولاً"],
  ["COMPLETED_DESC", "الأكثر خدمات مكتملة"],
  ["COMPLETED_ASC", "الأقل خدمات مكتملة"],
  ["AVAILABLE_FIRST", "المتاح الآن أولاً"],
] as const;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const numeric = (value: string | undefined) =>
  value && Number.isFinite(Number(value)) ? Number(value) : null;

const publicServiceDescription = (
  value: string | null | undefined,
) => value?.replace(/السعر\s+يشمل[\s\S]*$/u, "").trim() || null;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const result = await getServiceTypeAction((await params).id);

  return result.success
    ? {
        title: result.service.title,
        description:
          publicServiceDescription(result.service.description) ||
          `اختر مقدم خدمة ${result.service.title}`,
      }
    : { title: "نوع الخدمة" };
}

export default async function ServiceTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const { id } = await params;
  const query = await searchParams;

  const serviceResult = await getServiceTypeAction(id);
  if (!serviceResult.success) notFound();

  const sort = one(query.sort) || "RATING_DESC";
  const area = one(query.area) || null;
  const pricing = one(query.pricing) || null;
  const page = Math.max(
    1,
    Number.parseInt(one(query.page) || "1", 10) || 1,
  );

  const providersResult = await getServiceTypeProvidersAction({
    serviceId: id,
    sort,
    serviceArea: area,
    pricingModel: pricing,
    minPrice: numeric(one(query.minPrice)),
    maxPrice: numeric(one(query.maxPrice)),
    minRating: numeric(one(query.rating)),
    minExperience: numeric(one(query.experience)),
    remoteOnly: one(query.remote) === "1",
    availableToday: one(query.available) === "1",
    page,
  });

  const providers = providersResult.providers || [];
  const service = serviceResult.service;
  const publicDescription = publicServiceDescription(service.description);
  const category = Array.isArray(service.service_categories)
    ? service.service_categories[0]
    : service.service_categories;

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      const item = one(value);
      if (item && key !== "page") params.set(key, item);
    }

    params.set("page", String(nextPage));
    return `?${params.toString()}`;
  };

  const filtered =
    Boolean(area) ||
    Boolean(pricing) ||
    Boolean(one(query.minPrice)) ||
    Boolean(one(query.maxPrice)) ||
    Boolean(one(query.rating)) ||
    Boolean(one(query.experience)) ||
    one(query.remote) === "1" ||
    one(query.available) === "1";

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-11">
      <nav
        aria-label="مسار التصفح"
        className="mb-5 flex flex-wrap items-center gap-1 text-[10px] text-muted"
      >
        <Link href="/" className="hover:text-brand">
          الرئيسية
        </Link>
        <ChevronLeft className="h-3 w-3" />
        <Link href="/discover" className="hover:text-brand">
          الخدمات
        </Link>
        <ChevronLeft className="h-3 w-3" />
        <span>{category?.name_ar || "نوع الخدمة"}</span>
      </nav>

      <section className="relative overflow-hidden rounded-[2.2rem] bg-[#0b817a] px-5 py-8 text-white shadow-[0_24px_70px_rgba(10,100,95,.17)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border-[25px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 left-[46%] h-56 w-56 rounded-full bg-[#ffc985]/18" />

        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[#cef0ea]">
            <Sparkles size={13} />
            قارن واختار براحتك
          </span>

          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-[-.055em] sm:text-5xl">
            {service.title}
          </h1>

          {publicDescription && (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
              {publicDescription}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold text-white/80">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
              مقدمو خدمة معتمدون
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
              قارن الأسعار والخبرة
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
              التواصل داخل جسر
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[1.7rem] border border-theme bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                  <SlidersHorizontal size={16} />
                </span>
                <div>
                  <p className="text-[9px] font-bold text-brand">
                    رتّب النتائج
                  </p>
                  <h2 className="text-sm font-bold">
                    اختَر الأنسب إلك
                  </h2>
                </div>
              </div>

              <FilterForm
                id={id}
                sort={sort}
                area={area}
                pricing={pricing}
                query={query}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <details className="mb-4 rounded-2xl border border-theme bg-surface p-4 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
                <SlidersHorizontal className="h-4 w-4 text-brand" />
                تصفية وترتيب النتائج
              </summary>
              <FilterForm
                id={id}
                sort={sort}
                area={area}
                pricing={pricing}
                query={query}
              />
            </details>

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-brand">
                  مقدمو هذه الخدمة
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">
                  مين بناسب طلبك؟
                </h2>
                <p
                  aria-live="polite"
                  className="mt-1 text-[11px] text-muted"
                >
                  {providers.length} نتيجة في هذه الصفحة
                </p>
              </div>

              {filtered && (
                <Link
                  href={`/service-types/${id}`}
                  className="secondary-button !min-h-9 !px-3 text-[10px]"
                >
                  مسح الفلاتر
                </Link>
              )}
            </div>

            {providersResult.success ? (
              providers.length ? (
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <ProviderServiceCard
                      key={provider.listing_id}
                      result={provider}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] px-6 py-14 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                    <Search size={22} />
                  </span>
                  <h2 className="mt-4 text-lg font-bold">
                    لسه ما في عروض مناسبة هون
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
                    جرّب منطقة ثانية أو امسح بعض الفلاتر. وإذا ما في
                    مقدمين للخدمة بعد، رح يظهروا هون أول ما ينشروا عروضهم.
                  </p>
                  <Link
                    href={`/service-types/${id}`}
                    className="brand-button mt-5 gap-1.5"
                  >
                    عرض كل مقدمي الخدمة
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              )
            ) : (
              <p
                role="alert"
                className="rounded-2xl bg-[rgb(var(--danger)/0.08)] p-5 text-center text-xs text-[rgb(var(--danger))]"
              >
                {providersResult.error}
              </p>
            )}

            <div className="mt-6 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={pageHref(page - 1)}
                  className="secondary-button"
                >
                  السابق
                </Link>
              )}

              {providersResult.hasMore && (
                <Link
                  href={pageHref(page + 1)}
                  className="secondary-button"
                >
                  التالي
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterForm({
  id,
  sort,
  area,
  pricing,
  query,
}: {
  id: string;
  sort: string;
  area: string | null;
  pricing: string | null;
  query: Record<string, string | string[] | undefined>;
}) {
  return (
    <form
      action={`/service-types/${id}`}
      className="mt-5 space-y-4 text-[11px]"
    >
      <label className="block font-bold">
        ترتيب حسب
        <select
          name="sort"
          defaultValue={sort}
          className="form-field mt-1.5"
        >
          {sortOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block font-bold">
        منطقة الخدمة
        <select
          name="area"
          defaultValue={area || ""}
          className="form-field mt-1.5"
        >
          <option value="">كل المناطق</option>
          {JORDAN_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="block font-bold">
        نظام التسعير
        <select
          name="pricing"
          defaultValue={pricing || ""}
          className="form-field mt-1.5"
        >
          <option value="">الكل</option>
          {Object.entries(pricingModelLabels).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="font-bold">
          أقل سعر
          <input
            name="minPrice"
            type="number"
            min="0"
            defaultValue={one(query.minPrice) || ""}
            className="form-field mt-1.5"
          />
        </label>

        <label className="font-bold">
          أعلى سعر
          <input
            name="maxPrice"
            type="number"
            min="1"
            defaultValue={one(query.maxPrice) || ""}
            className="form-field mt-1.5"
          />
        </label>
      </div>

      <label className="block font-bold">
        أقل تقييم
        <select
          name="rating"
          defaultValue={one(query.rating) || ""}
          className="form-field mt-1.5"
        >
          <option value="">أي تقييم</option>
          <option value="4">4 فأعلى</option>
          <option value="3">3 فأعلى</option>
        </select>
      </label>

      <label className="block font-bold">
        سنوات الخبرة
        <input
          name="experience"
          type="number"
          min="0"
          max="80"
          defaultValue={one(query.experience) || ""}
          className="form-field mt-1.5"
        />
      </label>

      <label className="flex items-center gap-2 font-bold">
        <input
          name="remote"
          value="1"
          type="checkbox"
          defaultChecked={one(query.remote) === "1"}
        />
        متاح عن بُعد
      </label>

      <label className="flex items-center gap-2 font-bold">
        <input
          name="available"
          value="1"
          type="checkbox"
          defaultChecked={one(query.available) === "1"}
        />
        لديه دوام اليوم
      </label>

      <button className="brand-button w-full">تطبيق</button>
      <Link
        href={`/service-types/${id}`}
        className="secondary-button w-full"
      >
        مسح
      </Link>
    </form>
  );
}
