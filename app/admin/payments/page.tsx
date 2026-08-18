import { getAdminPaymentsAction } from "@/lib/actions/admin-payments";
import AdminPaymentsClient from "./_components/admin-payments-client";

export const metadata = {
  title: "إدارة المدفوعات | جسر الأردن",
};

export default async function AdminPaymentsPage() {
  const result = await getAdminPaymentsAction({ page: 1, limit: 20 });

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر تحميل سجل المدفوعات"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">سجل المدفوعات</h1>
        <p className="text-gray-600 text-sm">
          متابعة جميع العمليات المالية وحالة الدفعات
        </p>
      </div>
      <AdminPaymentsClient
        initialPayments={result.payments || []}
        initialTotal={result.total ?? 0}
        initialPage={result.page ?? 1}
        initialTotalPages={result.totalPages ?? 1}
      />
    </div>
  );
}
