"use client";

import { useState, useCallback } from "react";
import { getAdminPaymentsAction } from "@/lib/actions/admin-payments";

interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
  bookings:
    | {
        id: string;
        booking_date: string;
        status: string;
        services: { title: string } | null;
      }
    | null;
  users: { full_name: string; email: string } | null;
}

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "PAY_ON_COMPLETION",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;

const METHOD_FILTERS = ["ALL", "CARD", "CASH_ON_DELIVERY", "EFAWATEERCOM"] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  PAY_ON_COMPLETION: "الدفع عند الإكتمال",
  PAID: "مدفوع",
  FAILED: "فشل",
  REFUNDED: "مسترد",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  PAY_ON_COMPLETION: "bg-sky-100 text-sky-800 border-sky-300",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-300",
  FAILED: "bg-rose-100 text-rose-800 border-rose-300",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-300",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "بطاقة",
  CASH_ON_DELIVERY: "نقد عند التسليم",
  EFAWATEERCOM: "إيفاءاتيركم",
};

const METHOD_STYLES: Record<string, string> = {
  CARD: "bg-blue-100 text-blue-800 border-blue-300",
  CASH_ON_DELIVERY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  EFAWATEERCOM: "bg-purple-100 text-purple-800 border-purple-300",
};

function formatJOD(amount: number, currency: string) {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency || "JOD"}`;
}

export default function AdminPaymentsClient({
  initialPayments,
  initialTotal,
  initialPage,
  initialTotalPages,
}: {
  initialPayments: AdminPayment[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}) {
  const [payments, setPayments] = useState<AdminPayment[]>(initialPayments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(
    async (pageNum: number, status: string, method: string) => {
      setLoading(true);
      const res = await getAdminPaymentsAction({
        page: pageNum,
        limit: 20,
        status: status !== "ALL" ? status : undefined,
        method: method !== "ALL" ? method : undefined,
      });
      if (res.success) {
        setPayments(res.payments || []);
        setTotal(res.total ?? 0);
        setPage(res.page ?? 1);
        setTotalPages(res.totalPages ?? 1);
      } else {
        alert(res.error || "فشل تحميل المدفوعات");
      }
      setLoading(false);
    },
    []
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    void fetchPayments(newPage, statusFilter, methodFilter);
  };

  return (
    <div className="space-y-4 text-right dir-rtl">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white border rounded-xl shadow-sm p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">الحالة</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value);
              void fetchPayments(1, value, methodFilter);
            }}
            className="border rounded-lg p-2 text-sm bg-white min-w-[140px]"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "الكل" : STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            طريقة الدفع
          </label>
          <select
            value={methodFilter}
            onChange={(e) => {
              const value = e.target.value;
              setMethodFilter(value);
              void fetchPayments(1, statusFilter, value);
            }}
            className="border rounded-lg p-2 text-sm bg-white min-w-[140px]"
          >
            {METHOD_FILTERS.map((m) => (
              <option key={m} value={m}>
                {m === "ALL" ? "الكل" : METHOD_LABELS[m] || m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-right text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-xs text-gray-500">
            <tr>
              <th className="p-3">المبلغ</th>
              <th className="p-3">طريقة الدفع</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">تاريخ الحجز</th>
              <th className="p-3">الخدمة</th>
              <th className="p-3">العميل</th>
              <th className="p-3">تاريخ العملية</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  {loading
                    ? "جاري التحميل..."
                    : "لا توجد عمليات تطابق الفلاتر المحددة."}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold text-gray-900">
                    {formatJOD(p.amount, p.currency)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        METHOD_STYLES[p.payment_method] ||
                        "bg-gray-100 text-gray-800 border-gray-300"
                      }`}
                    >
                      {METHOD_LABELS[p.payment_method] || p.payment_method}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        STATUS_STYLES[p.status] ||
                        "bg-gray-100 text-gray-800 border-gray-300"
                      }`}
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">
                    {p.bookings?.booking_date || "—"}
                  </td>
                  <td className="p-3 text-gray-700">
                    {p.bookings?.services?.title || "—"}
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">
                      {p.users?.full_name || "—"}
                    </p>
                    <p className="text-gray-500 text-[11px]">
                      {p.users?.email || ""}
                    </p>
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(p.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">
            إجمالي {total} عملية — صفحة {page} من {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
              className="px-4 py-2 rounded-lg border text-xs font-semibold bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
              className="px-4 py-2 rounded-lg border text-xs font-semibold bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
