import { Images } from "lucide-react";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import { getProviderPostsAction } from "@/lib/actions/provider-content";
import ProviderPostsClient from "./_components/provider-posts-client";

export const metadata = {
  title: "أعمالي | مساحة مقدم الخدمة",
};

export default async function ProviderPostsPage() {
  const [postsResult, listingsResult] = await Promise.all([
    getProviderPostsAction(),
    getProviderListingsAction(),
  ]);

  if (!postsResult.success) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">
          {postsResult.error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#f8e0d6] p-6 text-[#743b35] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/35" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/45">
            <Images size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold opacity-70">
            شغلك بحكي عنك
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            ورجي العميل
            <span className="text-[#0b817a]"> شو بتعرف تعمل.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">
            انشر نتائج أعمال، قبل وبعد، نصائح وصور مرتبطة بخدماتك.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <ProviderPostsClient
          posts={postsResult.posts as never}
          listings={listingsResult.listings || []}
        />
      </div>
    </main>
  );
}
