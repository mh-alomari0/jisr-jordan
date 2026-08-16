"use client";

import { useState } from "react";
import { adminCancelBookingAction, AdminBookingStatus } from "@/lib/actions/admin-bookings";

export interface AdminBookingItem {
  id: string;
  status: AdminBookingStatus;
  phone?: string | null;
  address?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  created_at?: string | null;
  services?: {
    title?: string | null;
    price?: number | null;
  } | null;
}

export default function AdminBookingsClient({ initialBookings }: { initialBookings: AdminBookingItem[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredBookings = initialBookings.filter((b) => {
    if (filter === "ALL") return true;
    return b.status === filter;
  });

  const handleCancel = async (bookingId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في إلغاء هذا الحجز؟")) return;
    setLoadingId(bookingId);
    const res = await adminCancelBookingAction(bookingId);
    if (!res.success) {
      alert(res.error || "فشل إلغاء الحجز");
    }
    setLoadingId(null);
  };

  const getBadgeColor = (st: AdminBookingStatus) => {
    switch (st) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* أزرار الفلترة */}
      <div className="flex gap-2 border-b pb-3 overflow-x-auto">
        {["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              filter === st ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {st === "ALL" ? "الكل" : st}
          </button>
        ))}
      </div>

      {/* جدول الحجوزات */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">الخدمة</th>
              <th className="p-4">الموعد</th>
              <th className="p-4">الهاتف والعنوان</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  لا توجد حجوزات تطابق الفلتر المحدد.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-4 font-medium">
                    {b.services?.title || "خدمة غير محددة"}
                    {b.services?.price && <span className="block text-xs text-gray-500">{b.services.price} د.أ</span>}
                  </td>
                  <td className="p-4">
                    {b.booking_date}
                    <span className="block text-xs text-gray-500">{b.start_time}</span>
                  </td>
                  <td className="p-4">
                    {b.phone || "بدون هاتف"}
                    <span className="block text-xs text-gray-500">{b.address || "بدون عنوان"}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${getBadgeColor(b.status)}`}>
                      {b.status || "PENDING"}
                    </span>
                  </td>
                  <td className="p-4">
                    {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                      <button
                        type="button"
                        disabled={loadingId === b.id}
                        onClick={() => handleCancel(b.id)}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        إلغاء الحجز
                      </button>
                    )}
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