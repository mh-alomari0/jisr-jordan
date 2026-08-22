"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import { cancelCustomerBookingAction } from "@/lib/actions/customer-bookings";

export interface CustomerBookingItem {
  id: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  listing_id?: string | null;
  agreed_amount?: number | null;
  workflow_type?: string | null;
  services?: { title?: string | null; price?: number | null } | null;
}

const labels: Record<string, string> = {
  PENDING: "بانتظار التأكيد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم اختيار مقدم الخدمة",
  IN_PROGRESS: "الشغل بلّش",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const filters = [
  ["ACTIVE", "الحالية"],
  ["IN_PROGRESS", "قيد التنفيذ"],
  ["COMPLETED", "المكتملة"],
  ["CANCELLED", "الملغاة"],
  ["ALL", "الكل"],
] as const;

function formatBookingDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ar-JO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function CustomerBookingsClient({
  initialBookings,
}: {
  initialBookings: CustomerBookingItem[];
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ACTIVE");

  const visible = useMemo(() => {
    if (filter === "ALL") return bookings;

    if (filter === "ACTIVE") {
      return bookings.filter(
        (booking) => !["COMPLETED", "CANCELLED"].includes(booking.status),
      );
    }

    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("متأكد بدك تلغي الطلب؟")) return;

    setLoadingId(bookingId);
    const result = await cancelCustomerBookingAction(bookingId);

    if (!result.success) {
      alert(result.error || "ما قدرنا نلغي الطلب حالياً");
    } else {
      setBookings((items) =>
        items.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "CANCELLED" }
            : booking,
        ),
      );
    }

    setLoadingId(null);
  };

  if (!initialBookings.length) {
    return (
      <div className="border-t border-theme py-12 text-center sm:py-16">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
          <Search size={19} />
        </span>
        <h3 className="mt-4 text-base font-bold">لسه ما طلبت خدمة</h3>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
          أول ما تعمل طلب، رح تلاقيه هون وتقدر تتابع شو صار عليه خطوة بخطوة.
        </p>
        <Link href="/discover" className="brand-button mt-5">
          دور على خدمة
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="hide-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-theme pb-2">
        {filters.map(([id, label]) => {
          const active = filter === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-[11px] font-bold transition ${
                active
                  ? "border-[rgb(var(--primary))] text-brand"
                  : "border-transparent text-muted hover:text-[rgb(var(--text-main))]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-bold">ما في طلبات بهالقسم</p>
          <p className="mt-1 text-xs text-muted">جرّب قسم ثاني من فوق.</p>
        </div>
      ) : (
        <div className="divide-y divide-[rgb(var(--border))] border-y border-theme">
          {visible.map((booking) => {
            const amount = booking.agreed_amount ?? booking.services?.price ?? null;
            const completed = booking.status === "COMPLETED";
            const cancelled = booking.status === "CANCELLED";
            const canCancel = ["PENDING", "CONFIRMED", "ASSIGNED"].includes(
              booking.status,
            );

            return (
              <article
                key={booking.id}
                className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold ${
                        completed
                          ? "text-[rgb(var(--success))]"
                          : cancelled
                            ? "text-[rgb(var(--danger))]"
                            : "text-brand"
                      }`}
                    >
                      {labels[booking.status] || booking.status}
                    </span>
                    <span className="text-[9px] text-muted">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </div>

                  <h3 className="mt-1.5 truncate text-base font-bold">
                    {booking.services?.title || "خدمة"}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted">
                    {booking.booking_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {formatBookingDate(booking.booking_date)}
                      </span>
                    )}
                    {booking.start_time && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} />
                        {booking.start_time}
                      </span>
                    )}
                    {booking.address && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin size={13} className="shrink-0" />
                        <span className="max-w-[18rem] truncate">{booking.address}</span>
                      </span>
                    )}
                    {booking.workflow_type && booking.workflow_type !== "LEGACY_HOME" && (
                      <span className="inline-flex items-center gap-1.5">
                        <WalletCards size={13} />
                        {booking.workflow_type === "QUOTE_PROJECT"
                          ? "عرض سعر"
                          : "حجز مباشر"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:min-w-[11rem] sm:flex-col sm:items-end">
                  {amount != null && (
                    <strong className="text-sm font-bold">
                      {Number(amount).toFixed(2)} د.أ
                    </strong>
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                    >
                      التفاصيل <ArrowLeft size={14} />
                    </Link>

                    {canCancel && (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() => void handleCancel(booking.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[rgb(var(--danger))] disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        {loadingId === booking.id ? "بنلغي..." : "إلغاء"}
                      </button>
                    )}

                    {completed && (
                      <CheckCircle2
                        size={17}
                        className="text-[rgb(var(--success))]"
                        aria-label="مكتمل"
                      />
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
