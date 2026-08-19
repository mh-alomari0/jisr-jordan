import {
  CreditCard,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
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
      <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل سجل المدفوعات"}
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#102d2c] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <CreditCard size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#a9dcd6]">
            السجل المالي
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            كل دفعة،
            <span className="text-[#ffc985]"> إلها أثر واضح.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            راقب العمليات المالية وحالاتها بدون تعديل تاريخ المعاملة أو
            تجاوز مسار الدفع المسجل.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              المدفوعات
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              سجل العمليات
            </h2>
            <p className="mt-1 text-xs text-muted">
              {result.total ?? 0} عملية إجمالاً
            </p>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ReceiptText size={12} className="text-brand" />
              سجل قابل للتتبع
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
              بدون أسرار دفع
            </span>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
          <AdminPaymentsClient
            initialPayments={result.payments || []}
            initialTotal={result.total ?? 0}
            initialPage={result.page ?? 1}
            initialTotalPages={result.totalPages ?? 1}
          />
        </div>
      </section>
    </main>
  );
}
