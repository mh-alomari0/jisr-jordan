import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import ProviderServiceCard from "@/components/marketplace/provider-service-card";
import { getServiceTypeAction, getServiceTypeProvidersAction } from "@/lib/actions/marketplace-discovery";
import { pricingModelLabels } from "@/lib/marketplace";
import { JORDAN_CITIES } from "@/lib/constants";

const sortOptions = [
  ["RATING_DESC", "الأعلى تقييماً"], ["EXPERIENCE_DESC", "الأكثر خبرة"],
  ["EXPERIENCE_ASC", "الأحدث خبرة"], ["PRICE_ASC", "السعر: الأقل أولاً"],
  ["PRICE_DESC", "السعر: الأعلى أولاً"], ["COMPLETED_DESC", "الأكثر خدمات مكتملة"],
  ["COMPLETED_ASC", "الأقل خدمات مكتملة"], ["AVAILABLE_FIRST", "المتاح الآن أولاً"],
] as const;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const numeric = (value: string | undefined) => value && Number.isFinite(Number(value)) ? Number(value) : null;
const publicServiceDescription = (value: string | null | undefined) => value?.replace(/السعر\s+يشمل[\s\S]*$/u, "").trim() || null;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const result = await getServiceTypeAction((await params).id);
  return result.success ? { title: result.service.title, description: publicServiceDescription(result.service.description) || `اختر مقدم خدمة ${result.service.title}` } : { title: "نوع الخدمة" };
}

export default async function ServiceTypePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const serviceResult = await getServiceTypeAction(id);
  if (!serviceResult.success) notFound();
  const sort = one(query.sort) || "RATING_DESC";
  const area = one(query.area) || null;
  const pricing = one(query.pricing) || null;
  const page = Math.max(1, Number.parseInt(one(query.page) || "1", 10) || 1);
  const providersResult = await getServiceTypeProvidersAction({
    serviceId: id, sort, serviceArea: area, pricingModel: pricing,
    minPrice: numeric(one(query.minPrice)), maxPrice: numeric(one(query.maxPrice)),
    minRating: numeric(one(query.rating)), minExperience: numeric(one(query.experience)),
    remoteOnly: one(query.remote) === "1", availableToday: one(query.available) === "1", page,
  });
  const providers = providersResult.providers || [];
  const service = serviceResult.service;
  const publicDescription = publicServiceDescription(service.description);
  const category = Array.isArray(service.service_categories) ? service.service_categories[0] : service.service_categories;
  const pageHref = (nextPage: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) { const item = one(value); if (item && key !== "page") params.set(key, item); } params.set("page", String(nextPage)); return `?${params.toString()}`; };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <nav aria-label="مسار التصفح" className="mb-4 flex items-center gap-1 text-xs text-muted">
        <Link href="/">الرئيسية</Link><ChevronLeft className="h-3 w-3" /><Link href="/discover">الخدمات</Link><ChevronLeft className="h-3 w-3" /><span>{category?.name_ar || "نوع الخدمة"}</span>
      </nav>
      <header className="border-b border-theme pb-6">
        <p className="text-xs font-bold text-brand">اختر مقدم الخدمة المناسب</p>
        <h1 className="mt-2 text-2xl font-black sm:text-4xl">{service.title}</h1>
        {publicDescription && <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{publicDescription}</p>}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <details className="border-y border-theme py-3 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-black"><SlidersHorizontal className="h-4 w-4" /> التصفية والترتيب</summary>
          <FilterForm id={id} sort={sort} area={area} pricing={pricing} query={query} />
        </details>
        <aside className="hidden lg:block"><div className="sticky top-24"><h2 className="flex items-center gap-2 font-black"><SlidersHorizontal className="h-4 w-4" /> التصفية والترتيب</h2><FilterForm id={id} sort={sort} area={area} pricing={pricing} query={query} /></div></aside>
        <section aria-labelledby="providers-heading" className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-theme pb-3">
            <div><h2 id="providers-heading" className="font-black">مقدمو الخدمة</h2><p aria-live="polite" className="mt-1 text-xs text-muted">{providers.length} نتيجة في هذه الصفحة</p></div>
          </div>
          {providersResult.success ? providers.length ? <div>{providers.map((provider) => <ProviderServiceCard key={provider.listing_id} result={provider} />)}</div> : (
            <div className="py-16 text-center"><h2 className="font-black">لا توجد عروض منشورة لهذا النوع بعد</h2><p className="mt-2 text-sm text-muted">جرّب منطقة أخرى أو أزل بعض المرشحات.</p></div>
          ) : <p role="alert" className="py-12 text-center text-[rgb(var(--danger))]">{providersResult.error}</p>}
          <div className="mt-6 flex justify-center gap-2">{page > 1 && <Link href={pageHref(page - 1)} className="secondary-button">السابق</Link>}{providersResult.hasMore && <Link href={pageHref(page + 1)} className="secondary-button">التالي</Link>}</div>
        </section>
      </div>
    </div>
  );
}

function FilterForm({ id, sort, area, pricing, query }: { id: string; sort: string; area: string | null; pricing: string | null; query: Record<string, string | string[] | undefined> }) {
  return <form action={`/service-types/${id}`} className="mt-4 space-y-4 text-xs">
    <label className="block font-bold">ترتيب حسب<select name="sort" defaultValue={sort} className="form-field mt-1.5">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block font-bold">منطقة الخدمة<select name="area" defaultValue={area || ""} className="form-field mt-1.5"><option value="">كل المناطق</option>{JORDAN_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
    <label className="block font-bold">نظام التسعير<select name="pricing" defaultValue={pricing || ""} className="form-field mt-1.5"><option value="">الكل</option>{Object.entries(pricingModelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2"><label className="font-bold">أقل سعر<input name="minPrice" type="number" min="0" defaultValue={one(query.minPrice) || ""} className="form-field mt-1.5" /></label><label className="font-bold">أعلى سعر<input name="maxPrice" type="number" min="1" defaultValue={one(query.maxPrice) || ""} className="form-field mt-1.5" /></label></div>
    <label className="block font-bold">أقل تقييم<select name="rating" defaultValue={one(query.rating) || ""} className="form-field mt-1.5"><option value="">أي تقييم</option><option value="4">4 فأعلى</option><option value="3">3 فأعلى</option></select></label>
    <label className="block font-bold">سنوات الخبرة<input name="experience" type="number" min="0" max="80" defaultValue={one(query.experience) || ""} className="form-field mt-1.5" /></label>
    <label className="flex items-center gap-2 font-bold"><input name="remote" value="1" type="checkbox" defaultChecked={one(query.remote) === "1"} /> متاح عن بُعد</label>
    <label className="flex items-center gap-2 font-bold"><input name="available" value="1" type="checkbox" defaultChecked={one(query.available) === "1"} /> لديه دوام اليوم</label>
    <button className="brand-button w-full">تطبيق</button><Link href={`/service-types/${id}`} className="secondary-button w-full">مسح</Link>
  </form>;
}
