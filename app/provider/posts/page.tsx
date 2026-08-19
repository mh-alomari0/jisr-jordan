import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import { getProviderPostsAction } from "@/lib/actions/provider-content";
import ProviderPostsClient from "./_components/provider-posts-client";

export const metadata = { title: "المحتوى المهني | مساحة مقدم الخدمة" };

export default async function ProviderPostsPage() {
  const [postsResult, listingsResult] = await Promise.all([getProviderPostsAction(), getProviderListingsAction()]);
  if (!postsResult.success) return <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">{postsResult.error}</div>;
  return <div className="mx-auto max-w-5xl p-3 sm:p-6"><header className="mb-6"><h1 className="text-2xl font-black">المحتوى المهني</h1><p className="mt-1 text-sm text-muted">ابنِ الثقة بمحتوى مرتبط بخدماتك وخبرتك.</p></header><ProviderPostsClient posts={postsResult.posts as never} listings={listingsResult.listings || []} /></div>;
}

