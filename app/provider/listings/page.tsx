import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import {
  getHomeServiceTaxonomyAction,
  getMarketplaceCategoriesAction,
} from "@/lib/actions/marketplace-discovery";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import ProviderListingsClient from "./_components/provider-listings-client";

export const metadata = { title: "خدماتي | مساحة مقدم الخدمة" };

export default async function ProviderListingsPage() {
  const [listingsResult, categoriesResult, taxonomyResult] = await Promise.all([
    getProviderListingsAction(),
    getMarketplaceCategoriesAction({ normalizeDrift: false }),
    getHomeServiceTaxonomyAction({ normalizeDrift: false }),
  ]);

  if (!listingsResult.success) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="border-y border-theme py-10 text-center text-sm text-[rgb(var(--danger))]">
          {listingsResult.error}
        </div>
      </main>
    );
  }

  const listings = listingsResult.listings || [];
  const published = listings.filter((item) => item.status === "PUBLISHED").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-5 border-b border-theme pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <Link
            href="/provider"
            className="inline-flex items-center gap-1 text-xs font-bold text-muted transition hover:text-brand"
          >
            <ArrowRight size={14} />
            مساحة الشغل
          </Link>

          <h1 className="mt-3 text-3xl font-black tracking-[-.05em] sm:text-4xl">
            خدماتي
          </h1>

          <p className="mt-2 text-sm leading-7 text-muted">
            هون بتحدد شو بتقدم، بكم، وين، وكيف. خلّي كل خدمة واضحة قبل ما الزبون يبعثلك.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-end">
            <strong className="block text-lg font-black">{published}</strong>
            <span className="text-[10px] text-muted">خدمة منشورة</span>
          </div>

          <a
            href="#new-listing"
            className="brand-button !min-h-11 !rounded-xl !px-4 text-xs"
          >
            <Plus size={15} />
            خدمة جديدة
          </a>
        </div>
      </header>

      <section id="new-listing">
        <ProviderListingsClient
          listings={listings}
          categories={categoriesResult.categories || []}
          serviceTypes={(taxonomyResult.categories || []).flatMap(
            (category) => category.serviceTypes || [],
          )}
        />
      </section>
    </main>
  );
}
