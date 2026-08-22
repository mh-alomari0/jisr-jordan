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
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          بنية السوق
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          التصنيفات
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          رتّب المجالات والتخصصات بالشكل اللي يظهر فيه للناس، وحدد شو يحتاج مراجعة قبل النشر.
        </p>
        <p className="mt-3 text-[10px] text-muted">
          {categories.length} تصنيف · {roots} مجالات رئيسية
        </p>
      </header>

      <section>
        <AdminCategoriesClient categories={categories} />
      </section>
    </main>
  );
}
