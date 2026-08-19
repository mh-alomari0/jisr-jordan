"use client";

import { useState } from "react";
import { updateProviderBookingStatusAction, ProviderBookingItem } from "@/lib/actions/provider-bookings";

export default function ProviderBookingsClient({ initialBookings }: { initialBookings: ProviderBookingItem[] }) {
  const [bookings, setBookings] = useState<ProviderBookingItem[]>(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const handleStatusUpdate = async (bookingId: string, newStatus: "IN_PROGRESS" | "COMPLETED") => {
    setLoadingId(bookingId);
    const res = await updateProviderBookingStatusAction(bookingId, newStatus);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } else {
      alert(res.error || "تعذر تحديث حالة الطلب");
    }
    setLoadingId(null);
  };

  const filteredBookings = filterStatus === "ALL"
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* أزرار الفلترة */}
      <div className="flex gap-2 border-b pb-3">
        <button
          type="button"
          onClick={() => setFilterStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === "ALL" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          الكل ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("ASSIGNED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === "ASSIGNED" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          معيّنة لي
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("IN_PROGRESS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === "IN_PROGRESS" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          قيد التنفيذ
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("COMPLETED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === "COMPLETED" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >
          مكتملة
        </button>
      </div>

      {/* بطاقات الطلبات */}
      {filteredBookings.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white border rounded-xl">
          لا توجد طلبات حجز تطابق الفئة المحددة.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBookings.map((b) => (
            <div key={b.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-gray-900">{b.services?.title || "خدمة بدون عنوان"}</h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 rounded-full">
                  {b.status}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1 border-y py-2">
                <p><strong>التاريخ والوقت:</strong> {b.booking_date} | {b.start_time}</p>
                <p><strong>الهاتف:</strong> {b.phone || "غير محدد"}</p>
                <p><strong>العنوان:</strong> {b.address || "غير محدد"}</p>
                {b.services?.price && <p><strong>القيمة:</strong> {b.services.price} د.أ</p>}
                {b.workflow_type && b.workflow_type !== "LEGACY_HOME" && <p><strong>نوع الطلب:</strong> {b.workflow_type === "QUOTE_PROJECT" ? "عرض سعر" : "حجز مباشر"}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                {b.status === "ASSIGNED" && (
                  <button
                    type="button"
                    disabled={loadingId === b.id}
                    onClick={() => handleStatusUpdate(b.id, "IN_PROGRESS")}
                    className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    بدء التنفيذ
                  </button>
                )}

                {b.status === "IN_PROGRESS" && (
                  <button
                    type="button"
                    disabled={loadingId === b.id}
                    onClick={() => handleStatusUpdate(b.id, "COMPLETED")}
                    className="w-full bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    إنهاء وإكمال الخدمة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
