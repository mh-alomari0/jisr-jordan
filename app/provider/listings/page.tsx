import { getMarketplaceCategoriesAction } from "@/lib/actions/marketplace-discovery";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import ProviderListingsClient from "./_components/provider-listings-client";

export const metadata = { title: "عروض الخدمات | مساحة مقدم الخدمة" };

export default async function ProviderListingsPage() {
  const [listingsResult, categoriesResult] = await Promise.all([getProviderListingsAction(), getMarketplaceCategoriesAction()]);
  if (!listingsResult.success) return <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">{listingsResult.error}</div>;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-6">
      <header><h1 className="text-2xl font-black">عروض الخدمات</h1><p className="mt-1 text-sm text-muted">حوّل خبرتك إلى عروض واضحة للحجز أو طلب السعر.</p></header>
      <ProviderListingsClient listings={listingsResult.listings} categories={categoriesResult.categories || []} />
    </div>
  );
}

