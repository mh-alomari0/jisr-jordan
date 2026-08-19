import { getAdminProvidersAction } from "@/lib/actions/admin-providers";
import AdminProvidersClient from "./_components/admin-providers-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة مقدمي الخدمة | جسر الأردن",
};

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const result = await getAdminProvidersAction(page);

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر تحميل قائمة مقدمي الخدمة"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة مقدمي الخدمة</h1>
        <p className="text-gray-600 text-sm">
          مراجعة طلبات الانضمام واعتماد أو رفض مقدمي الخدمة
        </p>
      </div>
      <AdminProvidersClient providers={result.providers || []} />
      <AdminPagination path="/admin/providers" page={result.page || page} hasMore={Boolean(result.hasMore)} />
    </div>
  );
}
