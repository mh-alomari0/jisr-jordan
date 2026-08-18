"use client";

import { useState } from "react";
import { updateAdminBookingStatusAction, AdminBookingItem } from "@/lib/actions/admin-bookings";
import {
  assignProviderToBookingAction,
  getEligibleProvidersForBookingAction,
} from "@/lib/actions/admin-providers";
import { getAllowedTransitions, type BookingStatus } from "@/lib/booking-state-machine";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  ASSIGNED: "تم تعيين المزود",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  REFUNDED: "مسترد",
};

interface EligibleProvider {
  providerId: string;
  fullName: string;
  phone: string | null;
  bio: string | null;
}

export default function AdminBookingsClient({ initialBookings }: { initialBookings: AdminBookingItem[] }) {
  const [bookings, setBookings] = useState<AdminBookingItem[]>(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionError, setActionError] = useState("");
  const [eligibleByBooking, setEligibleByBooking] = useState<Record<string, EligibleProvider[]>>({});
  const [selectedProvider, setSelectedProvider] = useState<Record<string, string>>({});

  const handleStatusChange = async (
    bookingId: string,
    newStatus: BookingStatus
  ) => {
    setLoadingId(bookingId);
    setActionError("");
    const res = await updateAdminBookingStatusAction(bookingId, newStatus);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } else {
      setActionError(res.error || "فشل تغيير حالة الحجز");
    }
    setLoadingId(null);
  };

  const loadEligibleProviders = async (bookingId: string) => {
    setLoadingId(bookingId);
    setActionError("");
    const res = await getEligibleProvidersForBookingAction(bookingId);
    if (res.success) {
      setEligibleByBooking((current) => ({
        ...current,
        [bookingId]: (res.providers || []) as EligibleProvider[],
      }));
    } else {
      setActionError(res.error || "تعذر تحميل مقدمي الخدمة المؤهلين");
    }
    setLoadingId(null);
  };

  const assignProvider = async (bookingId: string) => {
    const providerId = selectedProvider[bookingId];
    if (!providerId) return;
    setLoadingId(bookingId);
    setActionError("");
    const res = await assignProviderToBookingAction(bookingId, providerId);
    if (res.success) {
      setBookings((current) => current.map((booking) =>
        booking.id === bookingId
          ? { ...booking, provider_id: providerId, status: "ASSIGNED" }
          : booking
      ));
      setEligibleByBooking((current) => ({ ...current, [bookingId]: [] }));
    } else {
      setActionError(res.error || "تعذر تعيين مقدم الخدمة");
    }
    setLoadingId(null);
  };

  const filteredBookings = statusFilter === "ALL"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="space-y-4 text-right dir-rtl">
      <div className="flex gap-2 border-b pb-3 flex-wrap">
        {["ALL", "PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === st ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {st === "ALL" ? `الكل (${bookings.length})` : STATUS_LABELS[st] || st}
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

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
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="min-w-48 space-y-2">
                      {getAllowedTransitions(b.status as BookingStatus)
                        .filter((status) => status !== "ASSIGNED")
                        .length > 0 && (
                        <select
                          disabled={loadingId === b.id}
                          defaultValue=""
                          aria-label={`تغيير حالة الحجز ${b.id.slice(0, 8)}`}
                          onChange={(e) => {
                            if (e.target.value) {
                              void handleStatusChange(b.id, e.target.value as BookingStatus);
                              e.target.value = "";
                            }
                          }}
                          className="w-full border rounded p-1.5 text-xs bg-white disabled:opacity-50"
                        >
                          <option value="" disabled>اختر الإجراء</option>
                          {getAllowedTransitions(b.status as BookingStatus)
                            .filter((status) => status !== "ASSIGNED")
                            .map((status) => (
                              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                            ))}
                        </select>
                      )}

                      {b.status === "CONFIRMED" && !b.provider_id && (
                        eligibleByBooking[b.id] === undefined ? (
                          <button
                            type="button"
                            disabled={loadingId === b.id}
                            onClick={() => void loadEligibleProviders(b.id)}
                            className="w-full rounded bg-indigo-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            اختيار مقدم خدمة
                          </button>
                        ) : eligibleByBooking[b.id].length > 0 ? (
                          <div className="space-y-2">
                            <select
                              value={selectedProvider[b.id] || ""}
                              onChange={(e) => setSelectedProvider((current) => ({ ...current, [b.id]: e.target.value }))}
                              aria-label={`مقدم الخدمة للحجز ${b.id.slice(0, 8)}`}
                              className="w-full border rounded p-1.5 text-xs bg-white"
                            >
                              <option value="">اختر مقدم الخدمة</option>
                              {eligibleByBooking[b.id].map((provider) => (
                                <option key={provider.providerId} value={provider.providerId}>
                                  {provider.fullName}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!selectedProvider[b.id] || loadingId === b.id}
                              onClick={() => void assignProvider(b.id)}
                              className="w-full rounded bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              تأكيد التعيين
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700">لا يوجد مزود مؤهل لهذه الخدمة.</p>
                        )
                      )}
                    </div>
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
