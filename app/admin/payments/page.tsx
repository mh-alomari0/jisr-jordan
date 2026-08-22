import { getAdminPaymentsAction } from "@/lib/actions/admin-payments";
import AdminPaymentsClient from "./_components/admin-payments-client";

export const metadata = {
  title: "إدارة المدفوعات | جسر الأردن",
};

export default async function AdminPaymentsPage() {
  const result = await getAdminPaymentsAction({
    page: 1,
    limit: 20,
  });

  if (!result.success) {
    return (
      <div className="border-b border-theme py-8 text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل سجل المدفوعات"}
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          السجل المالي
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          المدفوعات
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          كل عملية وحالتها من السجل المسجل بالنظام، بدون تغيير تاريخ المعاملة أو تجاوز مسار الدفع.
        </p>
        <p className="mt-3 text-[10px] text-muted">
          {result.total ?? 0} عملية إجمالاً
        </p>
      </header>

      <section>
        <AdminPaymentsClient
          initialPayments={result.payments || []}
          initialTotal={result.total ?? 0}
          initialPage={result.page ?? 1}
          initialTotalPages={result.totalPages ?? 1}
        />
      </section>
    </main>
  );
}
