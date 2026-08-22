"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  WalletCards,
  XCircle,
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
  { key: "PENDING", label: "وصلنا طلبك" },
  { key: "CONFIRMED", label: "تأكد الموعد" },
  { key: "IN_PROGRESS", label: "الشغل بلّش" },
  { key: "COMPLETED", label: "خلصت الخدمة" },
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
    if (!confirm("متأكد إنك بدك تلغي الطلب؟")) return;
    setCancelLoading(true);
    setActionError("");
    const res = await cancelCustomerBookingAction(booking.id);
    if (res.success) router.refresh();
    else setActionError(res.error || "ما قدرنا نلغي الطلب حالياً");
    setCancelLoading(false);
  }

  async function handleCOD() {
    setCodLoading(true);
    setActionError("");
    const res = await createCODPaymentAction(booking.id);
    if (res.success) router.refresh();
    else setActionError(res.error || "ما قدرنا نعتمد طريقة الدفع");
    setCodLoading(false);
  }

  async function revealContact() {
    setContactLoading(true);
    setActionError("");
    const result = await revealBookingProviderContactAction(booking.id);
    if (result.success) setProviderContact(result.contact);
    else setActionError(result.error || "ما قدرنا نظهر بيانات التواصل");
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

    if (!result.success) setActionError(result.error || "ما قدرنا نحفظ تقييمك");
    else router.refresh();
    setReviewLoading(false);
  }

  const currentStepIndex =
    booking.status === "COMPLETED"
      ? 3
      : booking.status === "IN_PROGRESS" || booking.status === "ASSIGNED"
        ? 2
        : booking.status === "CONFIRMED"
          ? 1
          : 0;

  return (
    <div className="space-y-8">
      <section className="border-b border-theme pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-brand">
              {getBookingStatusLabel(booking.status)}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">
              {service?.title || booking.listing?.title || "تفاصيل الطلب"}
            </h1>
            <p className="mt-2 text-[10px] text-muted">
              طلب #{booking.id.slice(0, 8)}
            </p>
          </div>

          {amount != null && (
            <div className="text-start sm:text-end">
              <p className="text-[10px] text-muted">المبلغ المتوقع</p>
              <p className="mt-1 text-xl font-black text-brand">
                {Number(amount).toFixed(2)} <span className="text-xs">د.أ</span>
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">وين وصل الطلب؟</p>
            <h2 className="mt-1 text-lg font-black">متابعة الحالة</h2>
          </div>
          <span className="text-[10px] text-muted">
            {steps[Math.min(currentStepIndex, steps.length - 1)].label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, idx) => {
            const isPassed = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="min-w-0">
                <div className="flex items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                      isPassed
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white"
                        : "border-theme bg-surface text-muted"
                    }`}
                  >
                    {isPassed ? <Check size={15} /> : idx + 1}
                  </span>
                  {idx < steps.length - 1 && (
                    <span
                      className={`mx-1 h-px flex-1 ${
                        idx < currentStepIndex
                          ? "bg-[rgb(var(--primary))]"
                          : "bg-[rgb(var(--border))]"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`mt-2 truncate text-[9px] font-bold ${
                    isCurrent ? "text-brand" : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-bold text-brand">تفاصيل التنفيذ</p>
            <h2 className="mt-1 text-lg font-black">الموعد والمكان</h2>
          </div>

          <div className="divide-y divide-[rgb(var(--border))] border-y border-theme">
            <div className="flex items-start gap-3 py-4">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-[10px] text-muted">اليوم</p>
                <strong className="mt-1 block text-xs">
                  {formatDate(booking.booking_date)}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 py-4">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-[10px] text-muted">الوقت</p>
                <strong className="mt-1 block text-xs">
                  {booking.start_time || "غير محدد"}
                  {booking.end_time ? ` - ${booking.end_time}` : ""}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 py-4">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted">العنوان</p>
                <strong className="mt-1 block break-words text-xs leading-6">
                  {booking.address || "غير محدد"}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 py-4">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-[10px] text-muted">رقمك المسجل</p>
                <strong dir="ltr" className="mt-1 block text-xs">
                  {booking.phone || "غير محدد"}
                </strong>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-5 border-s-2 border-[rgb(var(--primary)/0.35)] ps-4">
              <p className="text-[10px] font-bold text-brand">الملاحظات اللي كتبتها</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-muted">
                {booking.notes}
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="border-b border-theme pb-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black">مقدم الخدمة</h2>
              {provider && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[rgb(var(--success))]">
                  <ShieldCheck size={12} /> داخل جسر
                </span>
              )}
            </div>

            {provider ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--primary-soft))] text-base font-black text-brand">
                    {provider.full_name?.slice(0, 1) || "ج"}
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {provider.full_name || "مقدم الخدمة"}
                    </strong>
                    <p className="mt-0.5 text-[10px] text-muted">المسؤول عن تنفيذ طلبك</p>
                  </div>
                </div>

                {provider.phone ? (
                  <a
                    href={`tel:${provider.phone}`}
                    className="inline-flex items-center gap-2 text-xs font-black text-brand"
                    dir="ltr"
                  >
                    <Phone size={14} /> {provider.phone}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={revealContact}
                    disabled={contactLoading}
                    className="text-xs font-black text-brand disabled:opacity-50"
                  >
                    {contactLoading ? "بنجهز الرقم..." : "إظهار رقم مقدم الخدمة"}
                  </button>
                )}

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
              <p className="mt-3 text-xs leading-6 text-muted">
                لسه ما تعيّن مقدم خدمة. أول ما يتحدد، رح يبين هون.
              </p>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-brand" />
              <h2 className="text-base font-black">الدفع</h2>
            </div>

            {payment ? (
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">المبلغ</span>
                  <strong>{payment.amount} {payment.currency}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">الطريقة</span>
                  <strong>
                    {payment.payment_method === "CASH_ON_DELIVERY"
                      ? "نقداً بعد الإنجاز"
                      : payment.payment_method}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-6 text-muted">
                لسه ما تم اعتماد طريقة الدفع لهذا الطلب.
              </p>
            )}

            {canCreateCOD && (
              <button
                type="button"
                onClick={handleCOD}
                disabled={codLoading}
                className="brand-button mt-4 w-full text-xs font-black"
              >
                {codLoading ? "جاري الاعتماد..." : "اعتماد الدفع نقداً بعد الإنجاز"}
              </button>
            )}
          </section>
        </aside>
      </div>

      {isCompleted && !hasReviewed && (booking.listing_id || booking.service_id) && (
        <section className="border-t border-theme pt-7">
          <p className="text-[10px] font-bold text-brand">بعد ما خلصت الخدمة</p>
          <h2 className="mt-1 text-lg font-black">كيف كانت التجربة؟</h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            تقييمك بيساعد الناس يعرفوا شو يتوقعوا، وبيساعد مقدم الخدمة كمان.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="text-xs font-bold">
              التقييم
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="form-field mt-1.5"
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} نجوم
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold">
              احكيلنا عنها (اختياري)
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="مثلاً: وصل بالموعد، الشغل كان مرتب..."
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
            <Star size={15} />
            {reviewLoading ? "جاري الحفظ..." : "إرسال التقييم"}
          </button>
        </section>
      )}

      {actionError && (
        <p
          role="alert"
          className="border-s-2 border-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.05)] px-4 py-3 text-xs font-bold text-[rgb(var(--danger))]"
        >
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-theme pt-5">
        {cancellable && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelLoading}
            className="inline-flex items-center gap-2 text-xs font-bold text-[rgb(var(--danger))] disabled:opacity-50"
          >
            <XCircle size={15} />
            {cancelLoading ? "جاري الإلغاء..." : "إلغاء الطلب"}
          </button>
        )}

        <Link href="/bookings" className="ms-auto inline-flex items-center gap-1 text-xs font-bold text-brand">
          كل الطلبات <ArrowLeft size={14} />
        </Link>
      </div>
    </div>
  );
}
