"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Phone,
  Play,
} from "lucide-react";
import {
  updateProviderBookingStatusAction,
  type ProviderBookingItem,
} from "@/lib/actions/provider-bookings";

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار التأكيد",
  CONFIRMED: "مؤكد",
  ASSIGNED: "جاهز تبدأه",
  IN_PROGRESS: "الشغل بلّش",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default function ProviderBookingsClient({
  initialBookings,
}: {
  initialBookings: ProviderBookingItem[];
}) {
  const [bookings, setBookings] = useState<ProviderBookingItem[]>(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("ACTIVE");

  const filters = [
    {
      id: "ACTIVE",
      label: "الجارية",
      count: bookings.filter((b) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(b.status),
      ).length,
    },
    {
      id: "ASSIGNED",
      label: "جاهزة",
      count: bookings.filter((b) => b.status === "ASSIGNED").length,
    },
    {
      id: "IN_PROGRESS",
      label: "شغال عليها",
      count: bookings.filter((b) => b.status === "IN_PROGRESS").length,
    },
    {
      id: "COMPLETED",
      label: "خلصت",
      count: bookings.filter((b) => b.status === "COMPLETED").length,
    },
    {
      id: "ALL",
      label: "الكل",
      count: bookings.length,
    },
  ];

  const filteredBookings = useMemo(() => {
    if (filterStatus === "ALL") return bookings;
    if (filterStatus === "ACTIVE") {
      return bookings.filter((booking) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(booking.status),
      );
    }
    return bookings.filter((booking) => booking.status === filterStatus);
  }, [bookings, filterStatus]);

  const handleStatusUpdate = async (
    bookingId: string,
    newStatus: "IN_PROGRESS" | "COMPLETED",
  ) => {
    setLoadingId(bookingId);

    const result = await updateProviderBookingStatusAction(bookingId, newStatus);

    if (result.success) {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: newStatus }
            : booking,
        ),
      );
    } else {
      window.alert(result.error || "تعذر تحديث حالة الطلب");
    }

    setLoadingId(null);
  };

  return (
    <div>
      <div className="hide-scrollbar flex gap-5 overflow-x-auto border-b border-theme pb-2">
        {filters.map((filter) => {
          const active = filterStatus === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setFilterStatus(filter.id)}
              className={`relative shrink-0 pb-2 text-xs font-bold transition ${
                active ? "text-brand" : "text-muted hover:text-[rgb(var(--text-main))]"
              }`}
            >
              {filter.label}
              <span className="ms-1 text-[10px] opacity-70">{filter.count}</span>
              {active && (
                <span className="absolute inset-x-0 -bottom-[9px] h-0.5 bg-[rgb(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-brand" />
          <h3 className="mt-3 text-sm font-bold">ما في شغل هون حالياً</h3>
          <p className="mt-1 text-[11px] leading-6 text-muted">
            أول ما يوصل طلب ضمن هاي الحالة رح يبين مباشرة.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-theme">
          {filteredBookings.map((booking) => {
            const amount =
              booking.agreed_amount ?? booking.services?.price ?? null;

            return (
              <article key={booking.id} className="py-5 first:pt-4 last:pb-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-base font-black leading-7">
                        {booking.services?.title || "خدمة بدون عنوان"}
                      </h3>
                      <span className="text-[10px] font-bold text-brand">
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                      {(booking.booking_date || booking.start_time) && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={13} />
                          {booking.booking_date || "بدون تاريخ"}
                          {booking.start_time ? ` · ${booking.start_time}` : ""}
                        </span>
                      )}

                      {booking.phone && (
                        <span className="inline-flex items-center gap-1.5" dir="ltr">
                          <Phone size={13} />
                          {booking.phone}
                        </span>
                      )}
                    </div>

                    {booking.address && (
                      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-muted">
                        <MapPin size={13} className="mt-1 shrink-0" />
                        <span>{booking.address}</span>
                      </p>
                    )}

                    {booking.workflow_type && booking.workflow_type !== "LEGACY_HOME" && (
                      <p className="mt-2 text-[10px] text-muted">
                        {booking.workflow_type === "QUOTE_PROJECT"
                          ? "طلب ناتج عن عرض سعر"
                          : "حجز مباشر"}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    {amount != null && (
                      <strong className="text-sm text-brand">
                        {Number(amount).toFixed(2)} د.أ
                      </strong>
                    )}

                    {booking.status === "ASSIGNED" && (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() =>
                          handleStatusUpdate(booking.id, "IN_PROGRESS")
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))] px-3 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        <Play size={13} />
                        {loadingId === booking.id ? "جاري..." : "ابدأ الشغل"}
                      </button>
                    )}

                    {booking.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() =>
                          handleStatusUpdate(booking.id, "COMPLETED")
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-theme px-3 text-[11px] font-bold text-brand disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        {loadingId === booking.id ? "جاري..." : "خلصت الخدمة"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
