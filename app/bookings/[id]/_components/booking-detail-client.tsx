"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getBookingStatusLabel,
  getBookingStatusStyle,
} from "@/lib/constants";
import { cancelCustomerBookingAction } from "@/lib/actions/customer-bookings";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import { submitMarketplaceReviewAction, submitServiceReviewAction } from "@/lib/actions/reviews";
import { revealBookingProviderContactAction } from "@/lib/actions/booking-detail";
import MessageProviderButton from "@/components/marketplace/message-provider-button";

interface BookingDetail {
  id: string;
  provider_id?: string | null;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  address: string;
  phone: string;
  notes: string | null;
  service_id: string | null;
  listing_id?: string | null;
  workflow_type?: string | null;
  agreed_amount?: number | null;
  payment_status: string | null;
  created_at: string;
  contact_revealed_at?: string | null;
  services: { id: string; title: string; price: number; category: string } | null;
  listing?: { id: string; slug: string; title: string } | null;
  users: { full_name: string; phone: string } | null; // provider info
}

interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
}

interface Props {
  booking: BookingDetail;
  payment: PaymentInfo | null;
  hasReviewed: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "غير محدد";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-JO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    CASH_ON_DELIVERY: "الدفع عند الاستلام",
    CARD: "بطاقة",
  };
  return map[method] || method;
}

function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "قيد الانتظار",
    PAID: "مدفوع",
    PAY_ON_COMPLETION: "يُدفع عند الإكمال",
    FAILED: "فشل",
    REFUNDED: "مسترد",
  };
  return map[status] || status;
}

export default function BookingDetailClient({
  booking,
  payment,
  hasReviewed,
}: Props) {
  const router = useRouter();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [providerContact, setProviderContact] = useState(booking.users);
  const [contactLoading, setContactLoading] = useState(false);

  const service = booking.services;
  const provider = providerContact;

  const cancellable =
    ["PENDING", "CONFIRMED", "ASSIGNED"].includes(booking.status) &&
    !booking.contact_revealed_at &&
    payment?.status !== "PAID";
  const canCreateCOD =
    !payment && ["PENDING", "CONFIRMED", "ASSIGNED"].includes(booking.status);
  const isCompleted = booking.status === "COMPLETED";

  async function handleCancel() {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز؟")) return;
    setCancelLoading(true);
    setActionError("");
    const res = await cancelCustomerBookingAction(booking.id);
    if (res.success) {
      router.refresh();
    } else {
      setActionError(res.error || "تعذر إلغاء الحجز");
    }
    setCancelLoading(false);
  }

  async function handleCOD() {
    setCodLoading(true);
    setActionError("");
    const res = await createCODPaymentAction(booking.id);
    if (res.success) {
      router.refresh();
    } else {
      setActionError(res.error || "تعذر إنشاء طلب الدفع");
    }
    setCodLoading(false);
  }

  async function revealContact() {
    setContactLoading(true); setActionError("");
    const result = await revealBookingProviderContactAction(booking.id);
    if (result.success) setProviderContact(result.contact); else setActionError(result.error || "تعذر إظهار بيانات التواصل");
    setContactLoading(false);
  }

  async function handleMarketplaceReview() {
    setReviewLoading(true);
    setActionError("");
    const result = booking.listing_id
      ? await submitMarketplaceReviewAction(booking.id, rating, reviewComment)
      : booking.service_id
        ? await submitServiceReviewAction(booking.service_id, rating, reviewComment, booking.id)
        : { success: false as const, error: "بيانات الحجز غير مكتملة" };
    if (!result.success) setActionError(result.error || "تعذر حفظ التقييم");
    else router.refresh();
    setReviewLoading(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dir-rtl text-right">
      {/* 1. Status header */}
      <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900">تفاصيل الحجز</h1>
          <p className="text-xs text-slate-500 mt-1 dir-ltr text-left">
            #{booking.id.slice(0, 8)}
          </p>
        </div>
        <span
          className={`inline-flex self-start px-3 py-1.5 rounded-full text-sm font-bold border ${getBookingStatusStyle(
            booking.status
          )}`}
        >
          {getBookingStatusLabel(booking.status)}
        </span>
      </div>

      {/* 2. Service info */}
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          الخدمة
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-bold text-slate-900">
              {service?.title || "خدمة غير محددة"}
            </p>
            {service?.category && (
              <p className="text-xs text-slate-500 mt-1">{service.category}</p>
            )}
          </div>
          {typeof service?.price === "number" && (
            <div className="text-left dir-ltr shrink-0">
              <span className="text-lg font-bold text-emerald-700">
                {service.price}
              </span>
              <span className="text-xs text-slate-500 mr-1">د.أ</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 & 4. Date, time, location, contact */}
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          الموعد والموقع
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-medium">التاريخ</dt>
            <dd className="text-slate-900">{formatDate(booking.booking_date)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-medium">الوقت</dt>
            <dd className="text-slate-900 dir-ltr">
              {booking.start_time || "غير محدد"}
              {booking.end_time ? ` - ${booking.end_time}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-medium">العنوان</dt>
            <dd className="text-slate-900 max-w-[70%] text-left">
              {booking.address || "غير محدد"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-medium">هاتف التواصل</dt>
            <dd className="text-slate-900 dir-ltr" dir="ltr">
              {booking.phone || "غير محدد"}
            </dd>
          </div>
        </dl>
      </div>

      {/* 5. Provider info */}
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          مقدم الخدمة
        </h2>
        {provider ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">الاسم</dt>
              <dd className="text-slate-900">{provider.full_name || "غير متوفر"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">الهاتف</dt>
              <dd className="text-slate-900 dir-ltr" dir="ltr">
                {provider.phone || <button type="button" onClick={revealContact} disabled={contactLoading} className="text-xs font-bold text-brand">{contactLoading ? "جاري التحقق…" : "إظهار بعد تأكيد المعاملة"}</button>}
              </dd>
            </div>
            {!provider.phone && <p className="rounded-xl bg-[rgb(var(--primary-soft))] p-3 text-[10px] leading-5 text-muted">إظهار الرقم يسجّل كشف بيانات التواصل، وبعدها يحتاج الإلغاء إلى مراجعة الإدارة لحماية حقوق الطرفين.</p>}
            {booking.provider_id && <MessageProviderButton providerId={booking.provider_id} listingId={booking.listing_id} bookingId={booking.id} className="secondary-button w-full" />}
          </dl>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            لم يتم تعيين مقدم خدمة بعد
          </p>
        )}
      </div>

      {/* 6. Payment info */}
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          الدفع
        </h2>
        {payment ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">المبلغ</dt>
              <dd className="text-slate-900 dir-ltr" dir="ltr">
                <span className="font-bold">{payment.amount}</span>
                <span className="text-slate-500 mr-1">{payment.currency}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">طريقة الدفع</dt>
              <dd className="text-slate-900">
                {getPaymentMethodLabel(payment.payment_method)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">حالة الدفع</dt>
              <dd className="text-slate-900">
                {getPaymentStatusLabel(payment.status)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            لم يتم إنشاء طلب دفع لهذا الحجز بعد.
          </p>
        )}
      </div>

      {/* 7. Notes */}
      {booking.notes && (
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            ملاحظات
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {booking.notes}
          </p>
        </div>
      )}

      {/* 8. Actions */}
      <div className="p-6 space-y-3">
        {isCompleted && !hasReviewed && (booking.listing_id || booking.service_id) && (
          <div className="mb-4 rounded-xl bg-slate-50 p-4">
            <h2 className="text-sm font-bold">{booking.listing_id ? "قيّم مقدم الخدمة والمعاملة" : "قيّم الخدمة المكتملة"}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="text-xs font-semibold">التقييم
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="form-field mt-1.5">
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} نجوم</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold">تعليق اختياري
                <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} rows={2} className="form-field mt-1.5" />
              </label>
            </div>
            <button type="button" onClick={handleMarketplaceReview} disabled={reviewLoading} className="brand-button mt-3">
              {reviewLoading ? "جارٍ الحفظ..." : "حفظ التقييم"}
            </button>
          </div>
        )}
        {actionError && (
          <div
            className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3"
            role="alert"
          >
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Book again */}
          {isCompleted && !booking.listing_id && booking.service_id && (
            <Link
              href={`/booking?serviceId=${booking.service_id}`}
              className="flex-1 min-w-[140px] text-center bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              حجز مرة أخرى
            </Link>
          )}
          {isCompleted && booking.listing?.slug && (
            <Link href={`/listings/${booking.listing.slug}`} className="brand-button flex-1 min-w-[140px]">عرض الخدمة مرة أخرى</Link>
          )}

          {/* Cancel */}
          {cancellable && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="flex-1 min-w-[140px] bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {cancelLoading ? "جاري الإلغاء..." : "إلغاء الحجز"}
            </button>
          )}

          {/* Cash on delivery */}
          {canCreateCOD && (
            <button
              type="button"
              onClick={handleCOD}
              disabled={codLoading}
              className="flex-1 min-w-[140px] bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {codLoading ? "جاري المعالجة..." : "الدفع عند الاستلام"}
            </button>
          )}
        </div>
      </div>

      {/* 9. Back link */}
      <div className="px-6 pb-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span>العودة للحجوزات</span>
        </Link>
      </div>
    </div>
  );
}
