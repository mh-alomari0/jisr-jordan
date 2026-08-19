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
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  ASSIGNED: "تم تعيين مقدم",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default function CustomerBookingsClient({ initialBookings }: { initialBookings: CustomerBookingItem[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ACTIVE");

  const visible = useMemo(() => {
    if (filter === "ALL") return bookings;
    if (filter === "ACTIVE") return bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.status));
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء الطلب؟")) return;
    setLoadingId(bookingId);
    const res = await cancelCustomerBookingAction(bookingId);
    if (!res.success) alert(res.error || "تعذر إلغاء الحجز");
    else setBookings((items) => items.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
    setLoadingId(null);
  };

  const filters = [
    ["ACTIVE", "النشطة"],
    ["IN_PROGRESS", "قيد التنفيذ"],
    ["COMPLETED", "المكتملة"],
    ["CANCELLED", "الملغاة"],
    ["ALL", "الكل"],
  ];

  if (!initialBookings.length) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
        <Search className="mx-auto h-7 w-7 text-brand" />
        <h3 className="mt-3 text-lg font-bold">لسه ما عندك حجوزات</h3>
        <p className="mt-2 text-xs text-muted">أول طلب تعمله رح يظهر هون مع حالته وتفاصيله.</p>
        <Link href="/discover" className="brand-button mt-5">اكتشف الخدمات</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold ${filter === id ? "bg-[rgb(var(--primary))] text-white" : "border border-theme bg-surface text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((b) => {
          const amount = b.agreed_amount ?? b.services?.price ?? null;
          const completed = b.status === "COMPLETED";
          const cancelled = b.status === "CANCELLED";
          return (
            <article key={b.id} className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
              <div className={`h-1.5 ${completed ? "bg-[rgb(var(--success))]" : cancelled ? "bg-[rgb(var(--danger))]" : "bg-[rgb(var(--primary))]"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-bold text-muted">{labels[b.status] || b.status}</span>
                    <h3 className="mt-3 text-lg font-bold">{b.services?.title || "خدمة غير محددة"}</h3>
                    <p className="mt-1 text-[10px] text-muted">#{b.id.slice(0, 8)}</p>
                  </div>
                  {amount != null && <strong className="text-sm text-brand">{Number(amount).toFixed(2)} د.أ</strong>}
                </div>

                <div className="mt-5 grid gap-2 border-y border-theme py-4 text-[10px] text-muted">
                  {b.booking_date && <span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-brand" />{b.booking_date}</span>}
                  {b.start_time && <span className="inline-flex items-center gap-2"><Clock3 size={14} className="text-brand" />{b.start_time}</span>}
                  {b.address && <span className="inline-flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-brand" />{b.address}</span>}
                  {b.workflow_type && b.workflow_type !== "LEGACY_HOME" && <span className="inline-flex items-center gap-2"><WalletCards size={14} className="text-brand" />{b.workflow_type === "QUOTE_PROJECT" ? "عرض سعر مقبول" : "حجز مباشر"}</span>}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link href={`/bookings/${b.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                    عرض التفاصيل <ArrowLeft size={14} />
                  </Link>

                  {["PENDING", "CONFIRMED", "ASSIGNED"].includes(b.status) && (
                    <button type="button" disabled={loadingId === b.id} onClick={() => handleCancel(b.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[rgb(var(--danger))] disabled:opacity-50">
                      <XCircle size={13} />{loadingId === b.id ? "جارٍ الإلغاء..." : "إلغاء"}
                    </button>
                  )}

                  {completed && <CheckCircle2 size={18} className="text-[rgb(var(--success))]" />}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
