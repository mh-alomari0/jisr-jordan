"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  WalletCards,
  XCircle,
  Zap,
} from "lucide-react";
import { getBookingStatusLabel } from "@/lib/constants";
import { cancelCustomerBookingAction } from "@/lib/actions/customer-bookings";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import {
  submitMarketplaceReviewAction,
  submitServiceReviewAction,
} from "@/lib/actions/reviews";
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
  services: {
    id: string;
    title: string;
    price: number;
    category: string;
  } | null;
  listing?: { id: string; slug: string; title: string } | null;
  users: { full_name: string; phone: string } | null;
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return "غير محدد";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("ar-JO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const steps = [
  { key: "PENDING", label: "تم استلام الطلب" },
  { key: "CONFIRMED", label: "تم التأكيد" },
  { key: "IN_PROGRESS", label: "قيد التنفيذ" },
  { key: "COMPLETED", label: "مكتمل" },
];

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
  const amount =
    booking.agreed_amount ?? payment?.amount ?? service?.price ?? null;

  async function handleCancel() {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز؟")) return;
    setCancelLoading(true);
    setActionError("");
    const res = await cancelCustomerBookingAction(booking.id);
    if (res.success) router.refresh();
    else setActionError(res.error || "تعذر إلغاء الحجز");
    setCancelLoading(false);
  }

  async function handleCOD() {
    setCodLoading(true);
    setActionError("");
    const res = await createCODPaymentAction(booking.id);
    if (res.success) router.refresh();
    else setActionError(res.error || "تعذر إنشاء طلب الدفع");
    setCodLoading(false);
  }

  async function revealContact() {
    setContactLoading(true);
    setActionError("");
    const result = await revealBookingProviderContactAction(booking.id);
    if (result.success) setProviderContact(result.contact);
    else setActionError(result.error || "تعذر إظهار بيانات التواصل");
    setContactLoading(false);
  }

  async function handleReview() {
    setReviewLoading(true);
    setActionError("");
    const result = booking.listing_id
      ? await submitMarketplaceReviewAction(booking.id, rating, reviewComment)
      : booking.service_id
        ? await submitServiceReviewAction(
            booking.service_id,
            rating,
            reviewComment,
            booking.id,
          )
        : { success: false as const, error: "بيانات الحجز غير مكتملة" };

    if (!result.success) setActionError(result.error || "تعذر حفظ التقييم");
    else router.refresh();
    setReviewLoading(false);
  }

  // Calculate current step index
  const currentStepIndex =
    booking.status === "COMPLETED"
      ? 3
      : booking.status === "IN_PROGRESS" || booking.status === "ASSIGNED"
        ? 2
        : booking.status === "CONFIRMED"
          ? 1
          : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#065357] via-[#087f79] to-[#0ba59d] p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="status-pill bg-white/20 text-white font-black">
              {getBookingStatusLabel(booking.status)}
            </span>
            <p className="text-[11px] font-bold text-[#c9eee8]">
              طلب #{booking.id.slice(0, 8)}
            </p>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-[-.04em] sm:text-3xl">
            {service?.title || booking.listing?.title || "تفاصيل الحجز"}
          </h1>

          {amount != null && (
            <div className="mt-4 flex items-baseline gap-1 text-2xl font-black text-[#ffc985]">
              <span>{Number(amount).toFixed(2)}</span>
              <span className="text-xs font-bold text-white/80">د.أ</span>
            </div>
          )}
        </div>
      </section>

      {/* Visual Stepper Tracker */}
      <section className="surface-card p-5 sm:p-6">
        <p className="text-[11px] font-black text-brand mb-4">مسار متابعة الطلب</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {steps.map((step, idx) => {
            const isPassed = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={step.key} className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-black transition-all ${
                    isPassed
                      ? "bg-[rgb(var(--primary))] text-white shadow-md"
                      : "bg-surface-muted text-muted"
                  } ${isCurrent ? "ring-4 ring-[rgb(var(--primary)/0.2)] scale-105" : ""}`}
                >
                  {isPassed ? <CheckCircle2 size={18} /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-[10px] font-bold ${
                    isPassed ? "text-brand" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="surface-card p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-black">موعد ومكان التنفيذ</h2>

          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <CalendarDays className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-muted">تاريخ الحجز</p>
                <strong className="text-xs">{formatDate(booking.booking_date)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <Clock3 className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-muted">الوقت المختار</p>
                <strong className="text-xs">
                  {booking.start_time || "غير محدد"}
                  {booking.end_time ? ` - ${booking.end_time}` : ""}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <MapPin className="h-5 w-5 text-brand shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted">موقع الخدمة</p>
                <strong className="text-xs truncate block">{booking.address || "غير محدد"}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
              <Phone className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-muted">رقم هاتفك المسجل</p>
                <strong dir="ltr" className="text-xs">{booking.phone || "غير محدد"}</strong>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="border-t border-theme pt-4">
              <p className="text-[11px] font-bold text-brand">ملاحظاتك:</p>
              <p className="mt-1 text-xs leading-6 text-muted whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          )}
        </section>

        {/* Provider & Payment Sidebar */}
        <aside className="space-y-4">
          <section className="surface-card p-5">
            <h2 className="text-base font-black">مقدم الخدمة</h2>
            {provider ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] font-black text-brand text-lg">
                    {provider.full_name?.slice(0, 1) || "ج"}
                  </div>
                  <div>
                    <strong className="block text-sm">{provider.full_name || "مقدم الخدمة"}</strong>
                    <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--success))] font-bold">
                      <ShieldCheck size={13} /> معاملة معتمدة داخل جسر
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-muted p-3 text-center">
                  {provider.phone ? (
                    <a
                      href={`tel:${provider.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-brand"
                      dir="ltr"
                    >
                      <Phone size={14} /> {provider.phone}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={revealContact}
                      disabled={contactLoading}
                      className="text-xs font-black text-brand hover:underline"
                    >
                      {contactLoading ? "جارٍ التحقق..." : "إظهار رقم مقدم الخدمة"}
                    </button>
                  )}
                </div>

                {booking.provider_id && (
                  <MessageProviderButton
                    providerId={booking.provider_id}
                    listingId={booking.listing_id}
                    bookingId={booking.id}
                    className="secondary-button w-full"
                  />
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-xs text-muted">
                بانتظار تعيين مقدم الخدمة.
              </p>
            )}
          </section>

          <section className="surface-card p-5">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-brand" />
              <h2 className="text-base font-black">بيانات الدفع</h2>
            </div>

            {payment ? (
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">المبلغ الإجمالي</span>
                  <strong className="text-brand font-black">
                    {payment.amount} {payment.currency}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">طريقة الدفع</span>
                  <strong className="font-bold">
                    {payment.payment_method === "CASH_ON_DELIVERY"
                      ? "الدفع عند الاستلام"
                      : payment.payment_method}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">لم يتم إصدار فاتورة بعد.</p>
            )}

            {canCreateCOD && (
              <button
                type="button"
                onClick={handleCOD}
                disabled={codLoading}
                className="brand-button mt-4 w-full text-xs font-black"
              >
                {codLoading ? "جارٍ الاعتماد..." : "تأكيد الدفع نقداً عند الإنجاز"}
              </button>
            )}
          </section>
        </aside>
      </div>

      {/* Review Section */}
      {isCompleted && !hasReviewed && (booking.listing_id || booking.service_id) && (
        <section className="surface-card p-5 sm:p-6">
          <p className="text-[11px] font-black text-brand">تقييمك يهمنا</p>
          <h2 className="mt-1 text-lg font-black">كيف كانت تجربتك مع الخدمة؟</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="text-xs font-bold">
              التقييم
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="form-field mt-1.5"
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} نجوم ⭐
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold">
              رأيك بالخدمة (اختياري)
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="اكتب انطباعك عن الجودة والالتزام بالموعد..."
                className="form-field mt-1.5"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleReview}
            disabled={reviewLoading}
            className="brand-button mt-4"
          >
            <Star size={15} className="me-1 fill-current" />
            {reviewLoading ? "جارٍ الحفظ..." : "إرسال التقييم"}
          </button>
        </section>
      )}

      {actionError && (
        <p role="alert" className="rounded-2xl bg-[rgb(var(--danger)/0.1)] p-4 text-xs font-bold text-[rgb(var(--danger))]">
          {actionError}
        </p>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {cancellable && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelLoading}
            className="secondary-button text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.08)]"
          >
            <XCircle size={15} />
            {cancelLoading ? "جارٍ الإلغاء..." : "إلغاء الطلب"}
          </button>
        )}

        <Link href="/bookings" className="secondary-button ms-auto">
          <ArrowLeft size={15} />
          العودة لكل الطلبات
        </Link>
      </div>
    </div>
  );
}