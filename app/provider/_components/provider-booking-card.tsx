"use client";

import { useState } from "react";
import { updateBookingStatusAction, BookingStatus } from "@/lib/actions/provider";

export interface ProviderBookingItem {
  id: string;
  status: BookingStatus;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  services?: {
    title?: string | null;
    price?: number | null;
  } | null;
}

export default function ProviderBookingCard({ booking }: { booking: ProviderBookingItem }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BookingStatus>(booking.status || "PENDING");

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    setLoading(true);
    const res = await updateBookingStatusAction(booking.id, newStatus);
    if (res.success) {
      setStatus(newStatus);
    } else {
      alert(res.error || "فشل التحديث");
    }
    setLoading(false);
  };

  const getBadgeColor = (st: BookingStatus) => {
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
    <div className="border rounded-xl p-5 shadow-sm bg-white space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-lg">
          {booking.services?.title || "خدمة غير محددة"}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeColor(status)}`}>
          {status}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>العنوان:</strong> {booking.address || "غير محدد"}</p>
        <p><strong>الهاتف:</strong> {booking.phone || "غير محدد"}</p>
        <p><strong>الموعد:</strong> {booking.booking_date} ({booking.start_time})</p>
      </div>

      <div className="pt-3 border-t flex gap-2">
        <button
          type="button"
          disabled={loading || status === "IN_PROGRESS"}
          onClick={() => handleStatusUpdate("IN_PROGRESS")}
          className="flex-1 text-xs py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          قيد التنفيذ
        </button>

        <button
          type="button"
          disabled={loading || status === "COMPLETED"}
          onClick={() => handleStatusUpdate("COMPLETED")}
          className="flex-1 text-xs py-2 px-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          إكتمال
        </button>
      </div>
    </div>
  );
}