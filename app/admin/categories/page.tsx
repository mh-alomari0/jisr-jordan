import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MarketplaceCategory } from "@/lib/marketplace";
import AdminCategoriesClient from "./_components/admin-categories-client";

export const metadata = { title: "إدارة التصنيفات" };

export default async function AdminCategoriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("service_categories").select("id, parent_id, slug, name_ar, description_ar, icon, display_order, is_active, requires_moderation").order("display_order").order("name_ar");
  return <div className="mx-auto max-w-6xl p-3 sm:p-6"><header className="mb-6"><h1 className="text-2xl font-black">التصنيفات والتخصصات</h1><p className="mt-1 text-sm text-muted">إدارة الهيكل المدفوع بقاعدة البيانات وسياسات المراجعة.</p></header><AdminCategoriesClient categories={(data || []) as MarketplaceCategory[]} /></div>;
}

