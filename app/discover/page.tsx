import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import SearchResultCard from "@/components/marketplace/search-result-card";
import { getMarketplaceCategoriesAction, searchMarketplaceAction } from "@/lib/actions/marketplace-discovery";
import { deliveryTypeLabels, pricingModelLabels, type DeliveryType, type PricingModel } from "@/lib/marketplace";

export const metadata: Metadata = {
  title: "استكشاف الخدمات",
  description: "ابحث في عروض الخدمات ومقدمي الخدمة والمحتوى المهني على جسر الأردن.",
};

const scopes = [
  { value: "ALL", label: "الكل" },
  { value: "LISTINGS", label: "الخدمات" },
  { value: "PROVIDERS", label: "مقدمو الخدمة" },
  { value: "POSTS", label: "المنشورات" },
] as const;

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (one(params.q) || "").slice(0, 120);
  const requestedScope = one(params.tab) || "ALL";
  const scope = scopes.some((item) => item.value === requestedScope) ? requestedScope as (typeof scopes)[number]["value"] : "ALL";
  const category = one(params.category) || null;
  const delivery = one(params.delivery) || null;
  const pricing = one(params.pricing) || null;
  const page = Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1);
  const [categoriesResult, searchResult] = await Promise.all([
    getMarketplaceCategoriesAction(),
    searchMarketplaceAction({
      query: q,
      scope,
      categoryId: category,
      deliveryType: delivery as DeliveryType | null,
      pricingModel: pricing as PricingModel | null,
      page,
      pageSize: 24,
    }),
  ]);
  const categories = categoriesResult.categories || [];
  const results = searchResult.results || [];

  const hrefFor = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (scope !== "ALL") next.set("tab", scope);
    if (category) next.set("category", category);
    if (delivery) next.set("delivery", delivery);
    if (pricing) next.set("pricing", pricing);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return "/discover?" + next.toString();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:py-10">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-black sm:text-3xl">استكشف سوق جسر الأردن</h1>
        <p className="mt-2 text-sm text-muted">ابحث باللغة التي تستخدمها يومياً، ثم صفِّ النتائج حسب طبيعة خدمتك.</p>
        <form action="/discover" role="search" className="surface-card mt-5 flex items-center gap-2 rounded-full p-1.5 ps-4">
          <Search className="h-5 w-5 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} maxLength={120} placeholder="محتاج مدرس رياضيات..." className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none" />
          <button className="brand-button !min-h-11 !rounded-full !px-6">بحث</button>
        </form>
      </header>

      <nav aria-label="نوع نتيجة البحث" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {scopes.map((item) => (
          <Link key={item.value} href={hrefFor({ tab: item.value === "ALL" ? null : item.value, page: null })}
            aria-current={scope === item.value ? "page" : undefined}
            className={scope === item.value ? "brand-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1.5" : "secondary-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1.5"}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface-card h-fit p-4 lg:sticky lg:top-24" aria-label="مرشحات البحث">
          <h2 className="flex items-center gap-2 font-black"><SlidersHorizontal className="h-4 w-4" /> تصفية النتائج</h2>
          <form action="/discover" className="mt-4 space-y-4">
            {q && <input type="hidden" name="q" value={q} />}
            {scope !== "ALL" && <input type="hidden" name="tab" value={scope} />}
            <label className="block text-xs font-bold">المجال
              <select name="category" defaultValue={category || ""} className="form-field mt-1.5">
                <option value="">جميع المجالات</option>
                {categories.map((parent) => (
                  <optgroup key={parent.id} label={parent.name_ar}>
                    <option value={parent.id}>{parent.name_ar} — الكل</option>
                    {(parent.children || []).map((child) => <option key={child.id} value={child.id}>{child.name_ar}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {scope !== "PROVIDERS" && (
              <>
                <label className="block text-xs font-bold">طريقة تقديم الخدمة
                  <select name="delivery" defaultValue={delivery || ""} className="form-field mt-1.5">
                    <option value="">الكل</option>
                    {Object.entries(deliveryTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold">نظام التسعير
                  <select name="pricing" defaultValue={pricing || ""} className="form-field mt-1.5">
                    <option value="">الكل</option>
                    {Object.entries(pricingModelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </>
            )}
            <button className="brand-button w-full" type="submit">تطبيق</button>
            <Link href={q ? "/discover?q=" + encodeURIComponent(q) : "/discover"} className="secondary-button w-full">مسح المرشحات</Link>
          </form>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">{q ? "نتائج البحث عن: " + q : "أحدث ما في السوق"}</h2>
              <p aria-live="polite" className="mt-1 text-xs text-muted">{results.length} نتيجة في هذه الصفحة</p>
            </div>
          </div>
          {searchResult.success ? results.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {results.map((result) => <SearchResultCard key={result.result_type + result.result_id} result={result} />)}
            </div>
          ) : (
            <div className="surface-card p-10 text-center">
              <p className="font-black">لم نجد نتائج مطابقة</p>
              <p className="mt-2 text-xs leading-6 text-muted">جرّب كلمات أبسط أو اختر مجالاً أوسع. لا نعرض بيانات أو أرقاماً غير حقيقية.</p>
            </div>
          ) : (
            <div role="alert" className="surface-card border-[rgb(var(--danger)/0.35)] p-8 text-center text-sm">{searchResult.error}</div>
          )}
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && <Link href={hrefFor({ page: String(page - 1) })} className="secondary-button">السابق</Link>}
            {searchResult.hasMore && <Link href={hrefFor({ page: String(page + 1) })} className="secondary-button">التالي</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
