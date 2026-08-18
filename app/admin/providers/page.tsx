import { getAdminProvidersAction } from "@/lib/actions/admin-providers";
import AdminProvidersClient from "./_components/admin-providers-client";

export const metadata = {
  title: "إدارة مقدمي الخدمة | جسر الأردن",
};

export default async function AdminProvidersPage() {
  const result = await getAdminProvidersAction();

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
    </div>
  );
}
