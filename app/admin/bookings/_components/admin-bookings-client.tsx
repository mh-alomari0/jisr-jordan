"use client";

import { useState } from "react";
import { updateAdminBookingStatusAction, AdminBookingItem } from "@/lib/actions/admin-bookings";

export default function AdminBookingsClient({ initialBookings }: { initialBookings: AdminBookingItem[] }) {
  const [bookings, setBookings] = useState<AdminBookingItem[]>(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleStatusChange = async (
    bookingId: string,
    newStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  ) => {
    setLoadingId(bookingId);
    const res = await updateAdminBookingStatusAction(bookingId, newStatus);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } else {
      alert(res.error || "فشل تغيير حالة الحجز");
    }
    setLoadingId(null);
  };

  const filteredBookings = statusFilter === "ALL"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="space-y-4 text-right dir-rtl">
      <div className="flex gap-2 border-b pb-3">
        {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === st ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {st === "ALL" ? `الكل (${bookings.length})` : st}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b text-xs text-gray-500">
            <tr>
              <th className="p-3">الخدمة والعميل</th>
              <th className="p-3">الموعد والتفاصيل</th>
              <th className="p-3">السعر والتسديد</th>
              <th className="p-3">الحالة الحالية</th>
              <th className="p-3">التحكم بالحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  لا توجد حجوزات تطابق خيار الفلترة المعتمد.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-bold text-gray-900">{b.services?.title || "خدمة عامة"}</p>
                    <p className="text-gray-500 text-[11px]">{b.users?.email || b.customer_id}</p>
                  </td>
                  <td className="p-3 text-gray-600">
                    <p>{b.booking_date} ({b.start_time})</p>
                    <p className="text-[11px] text-gray-400">{b.address || "بدون عنوان"}</p>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-gray-900">{b.services?.price || 0} د.أ</span>
                    <span className="block text-[10px] text-gray-500">{b.payment_status || "غير مدفوع"}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-gray-100 text-gray-800">
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      disabled={loadingId === b.id}
                      value={b.status}
                      onChange={(e) =>
                        handleStatusChange(
                          b.id,
                          e.target.value as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
                        )
                      }
                      className="border rounded p-1.5 text-xs bg-white disabled:opacity-50"
                    >
                      <option value="PENDING">معلق (PENDING)</option>
                      <option value="IN_PROGRESS">قيد التنفيذ (IN_PROGRESS)</option>
                      <option value="COMPLETED">مكتمل (COMPLETED)</option>
                      <option value="CANCELLED">ملغى (CANCELLED)</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}