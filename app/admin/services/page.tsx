import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminServicesClient from "./_components/admin-services-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة الخدمات | لوحة التحكم",
};

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: services } = await supabase
    .from("services")
    .select("id, title, description, price, category, is_active")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize);
  const hasMore = (services || []).length > pageSize;

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة الخدمات والأسعار</h1>
        <p className="text-gray-600 text-sm">إضافة خدمات جديدة، تعديل حالة التفعيل، والتحكم بالأسعار</p>
      </div>

      <AdminServicesClient initialServices={(services || []).slice(0, pageSize)} />
      <AdminPagination path="/admin/services" page={page} hasMore={hasMore} />
    </div>
  );
}
