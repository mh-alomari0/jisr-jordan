"use client";

import { useState } from "react";
import { cancelCustomerBookingAction } from "@/lib/actions/customer-bookings";

export interface CustomerBookingItem {
  id: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  services?: {
    title?: string | null;
    price?: number | null;
  } | null;
}

export default function CustomerBookingsClient({ initialBookings }: { initialBookings: CustomerBookingItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("هل أنت تأكد من إلغاء الطلب؟")) return;
    setLoadingId(bookingId);
    const res = await cancelCustomerBookingAction(bookingId);
    if (!res.success) {
      alert(res.error || "تعذر إلغاء الحجز");
    }
    setLoadingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">مكتمل</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">قيد التنفيذ</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">ملغى</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">قيد الانتظار</span>;
    }
  };

  if (initialBookings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 border rounded-xl">
        ليس لديك أي حجوزات حالية أو سابقة.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {initialBookings.map((b) => (
        <div key={b.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">{b.services?.title || "خدمة غير محددة"}</h2>
            {getStatusBadge(b.status)}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>الموعد:</strong> {b.booking_date} ({b.start_time})</p>
            <p><strong>العنوان:</strong> {b.address || "غير محدد"}</p>
            {b.services?.price && <p><strong>السعر:</strong> {b.services.price} د.أ</p>}
          </div>

          {b.status === "PENDING" && (
            <div className="pt-3 border-t">
              <button
                type="button"
                disabled={loadingId === b.id}
                onClick={() => handleCancel(b.id)}
                className="text-xs text-red-600 hover:underline disabled:opacity-50 font-medium"
              >
                إلغاء الطلب المعلق
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}