import {
  Layers3,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MarketplaceCategory } from "@/lib/marketplace";
import AdminCategoriesClient from "./_components/admin-categories-client";

export const metadata = {
  title: "إدارة التصنيفات",
};

export default async function AdminCategoriesPage() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("service_categories")
    .select(
      "id, parent_id, slug, name_ar, description_ar, icon, display_order, is_active, requires_moderation",
    )
    .order("display_order")
    .order("name_ar");

  const categories = (data || []) as MarketplaceCategory[];
  const roots = categories.filter(
    (category) => !category.parent_id,
  ).length;

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#f8e0d6] p-6 text-[#743b35] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/35" />

        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/45">
            <Layers3 size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold opacity-70">
            بنية السوق
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            رتّب المجالات
            <span className="text-[#0b817a]"> بدون ما تربك العميل.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">
            إدارة المجالات والتخصصات وترتيب العرض وسياسة المراجعة
            من قاعدة البيانات نفسها.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              هيكل التصنيفات
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              المجالات والتخصصات
            </h2>

            <p className="mt-1 text-xs text-muted">
              {categories.length} تصنيف · {roots} مجالات رئيسية
            </p>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <Workflow size={12} className="text-brand" />
              هيكل ديناميكي
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldCheck
                size={12}
                className="text-[rgb(var(--success))]"
              />
              سياسة مراجعة
            </span>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
          <AdminCategoriesClient
            categories={categories}
          />
        </div>
      </section>
    </main>
  );
}
