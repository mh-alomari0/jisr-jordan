import { getHomeServiceTaxonomyAction, getMarketplaceCategoriesAction } from "@/lib/actions/marketplace-discovery";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import ProviderListingsClient from "./_components/provider-listings-client";

export const metadata = { title: "خدماتي | مساحة مقدم الخدمة" };

export default async function ProviderListingsPage() {
  const [listingsResult, categoriesResult, taxonomyResult] = await Promise.all([
    getProviderListingsAction(),
    getMarketplaceCategoriesAction(),
    getHomeServiceTaxonomyAction(),
  ]);

  if (!listingsResult.success) {
    return <div className="mx-auto max-w-6xl p-6"><div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">{listingsResult.error}</div></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-7 max-w-3xl">
        <p className="text-[10px] font-bold tracking-[.08em] text-brand">مساحة مقدم الخدمة</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-5xl">خدماتك هي واجهتك <span className="text-brand">على جسر.</span></h1>
        <p className="mt-3 text-sm leading-7 text-muted">اختَر نوع الخدمة من دليل جسر، ثم أضف عرضك الخاص وسعرك وطريقة التقديم والمناطق والصور.</p>
      </header>

      <ProviderListingsClient
        listings={listingsResult.listings}
        categories={categoriesResult.categories || []}
        serviceTypes={(taxonomyResult.categories || []).flatMap((category) => category.serviceTypes || [])}
      />
    </div>
  );
}
