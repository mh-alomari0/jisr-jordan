import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminServicesClient from "./_components/admin-services-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة الخدمات | لوحة التحكم",
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1,
  );

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
    },
  );

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, title, description, price, category, is_active",
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize);

  const hasMore = (services || []).length > pageSize;
  const visible = (services || []).slice(0, pageSize);

  return (
    <main className="space-y-6">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          دليل الخدمات
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          الخدمات الأساسية
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          هاي التعريفات اللي يعتمد عليها الكتالوج وربط مقدمي الخدمة. أي تعديل هون ينعكس على أكثر من مكان، فخلّيه محسوب.
        </p>
        <p className="mt-3 text-[10px] text-muted">
          {visible.length} خدمة في هذه الصفحة
        </p>
      </header>

      <section>
        <AdminServicesClient initialServices={visible} />
      </section>

      <AdminPagination
        path="/admin/services"
        page={page}
        hasMore={hasMore}
      />
    </main>
  );
}
