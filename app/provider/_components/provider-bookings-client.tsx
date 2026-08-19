"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Play,
} from "lucide-react";
import {
  updateProviderBookingStatusAction,
  type ProviderBookingItem,
} from "@/lib/actions/provider-bookings";

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  ASSIGNED: "معيّن إليك",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default function ProviderBookingsClient({
  initialBookings,
}: {
  initialBookings: ProviderBookingItem[];
}) {
  const [bookings, setBookings] =
    useState<ProviderBookingItem[]>(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("ACTIVE");

  const filters = [
    {
      id: "ACTIVE",
      label: "النشطة",
      count: bookings.filter((b) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(b.status),
      ).length,
    },
    {
      id: "ASSIGNED",
      label: "المعيّنة",
      count: bookings.filter((b) => b.status === "ASSIGNED").length,
    },
    {
      id: "IN_PROGRESS",
      label: "قيد التنفيذ",
      count: bookings.filter((b) => b.status === "IN_PROGRESS").length,
    },
    {
      id: "COMPLETED",
      label: "المكتملة",
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
    return bookings.filter(
      (booking) => booking.status === filterStatus,
    );
  }, [bookings, filterStatus]);

  const handleStatusUpdate = async (
    bookingId: string,
    newStatus: "IN_PROGRESS" | "COMPLETED",
  ) => {
    setLoadingId(bookingId);

    const result = await updateProviderBookingStatusAction(
      bookingId,
      newStatus,
    );

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
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-3">
        {filters.map((filter) => {
          const active = filterStatus === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setFilterStatus(filter.id)}
              className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold transition ${
                active
                  ? "bg-[rgb(var(--primary))] text-white"
                  : "border border-theme bg-surface text-muted hover:text-brand"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          );
        })}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="mt-2 rounded-[1.6rem] border border-dashed border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--primary)/0.02)] px-5 py-10 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-brand" />
          <h3 className="mt-3 text-sm font-bold">
            ما في طلبات ضمن هذه الفئة
          </h3>
          <p className="mt-1 text-[11px] leading-6 text-muted">
            لما يوصل طلب جديد أو يبدأ شغل حالي رح يظهر هون.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          {filteredBookings.map((booking) => {
            const amount =
              booking.agreed_amount ??
              booking.services?.price ??
              null;

            return (
              <article
                key={booking.id}
                className="rounded-[1.6rem] border border-theme bg-surface p-4 transition hover:border-[rgb(var(--primary)/0.35)] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-bold text-muted">
                      {statusLabels[booking.status] || booking.status}
                    </span>

                    <h3 className="mt-2 line-clamp-2 text-base font-bold leading-7">
                      {booking.services?.title || "خدمة بدون عنوان"}
                    </h3>

                    {booking.workflow_type &&
                      booking.workflow_type !== "LEGACY_HOME" && (
                        <p className="mt-1 text-[10px] text-brand">
                          {booking.workflow_type === "QUOTE_PROJECT"
                            ? "طلب مبني على عرض سعر"
                            : "حجز مباشر"}
                        </p>
                      )}
                  </div>

                  {amount != null && (
                    <strong className="rounded-2xl bg-[rgb(var(--primary-soft))] px-3 py-2 text-sm text-brand">
                      {Number(amount).toFixed(2)} د.أ
                    </strong>
                  )}
                </div>

                <div className="mt-4 grid gap-2 border-t border-theme pt-4 sm:grid-cols-2">
                  {(booking.booking_date || booking.start_time) && (
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <CalendarDays size={14} className="text-brand" />
                      <span>
                        {booking.booking_date || "بدون تاريخ"}
                        {booking.start_time
                          ? ` · ${booking.start_time}`
                          : ""}
                      </span>
                    </div>
                  )}

                  {booking.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <Phone size={14} className="text-brand" />
                      <span>{booking.phone}</span>
                    </div>
                  )}

                  {booking.address && (
                    <div className="flex items-start gap-2 text-[10px] leading-5 text-muted sm:col-span-2">
                      <MapPin
                        size={14}
                        className="mt-0.5 shrink-0 text-brand"
                      />
                      <span>{booking.address}</span>
                    </div>
                  )}
                </div>

                {(booking.status === "ASSIGNED" ||
                  booking.status === "IN_PROGRESS") && (
                  <div className="mt-4 flex gap-2">
                    {booking.status === "ASSIGNED" && (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() =>
                          handleStatusUpdate(
                            booking.id,
                            "IN_PROGRESS",
                          )
                        }
                        className="brand-button gap-2 !min-h-10 flex-1"
                      >
                        <Play size={14} />
                        {loadingId === booking.id
                          ? "جارٍ التحديث..."
                          : "ابدأ التنفيذ"}
                      </button>
                    )}

                    {booking.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() =>
                          handleStatusUpdate(
                            booking.id,
                            "COMPLETED",
                          )
                        }
                        className="brand-button gap-2 !min-h-10 flex-1"
                      >
                        <CheckCircle2 size={14} />
                        {loadingId === booking.id
                          ? "جارٍ التحديث..."
                          : "إنهاء الخدمة"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
