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
  Phone,
  ShieldCheck,
  Star,
  WalletCards,
  XCircle,
} from "lucide-react";
import { getBookingStatusLabel } from "@/lib/constants";
import { cancelCustomerBookingAction } from "@/lib/actions/customer-bookings";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import { submitMarketplaceReviewAction, submitServiceReviewAction } from "@/lib/actions/reviews";
import { revealBookingProviderContactAction } from "@/lib/actions/booking-detail";
import MessageProviderButton from "@/components/marketplace/message-provider-button";

interface BookingDetail {
  id: string; provider_id?: string | null; status: string; booking_date: string; start_time: string; end_time: string;
  address: string; phone: string; notes: string | null; service_id: string | null; listing_id?: string | null;
  workflow_type?: string | null; agreed_amount?: number | null; payment_status: string | null; created_at: string;
  contact_revealed_at?: string | null;
  services: { id: string; title: string; price: number; category: string } | null;
  listing?: { id: string; slug: string; title: string } | null;
  users: { full_name: string; phone: string } | null;
}
interface PaymentInfo { id: string; amount: number; currency: string; payment_method: string; status: string; }
interface Props { booking: BookingDetail; payment: PaymentInfo | null; hasReviewed: boolean; }

const formatDate = (dateStr: string) => {
  if (!dateStr) return "غير محدد";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const paymentMethod = (m: string) => ({ CASH_ON_DELIVERY: "الدفع عند الاستلام", CARD: "بطاقة" }[m] || m);
const paymentStatus = (s: string) => ({ PENDING: "قيد الانتظار", PAID: "مدفوع", PAY_ON_COMPLETION: "يُدفع عند الإكمال", FAILED: "فشل", REFUNDED: "مسترد" }[s] || s);

export default function BookingDetailClient({ booking, payment, hasReviewed }: Props) {
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
  const cancellable = ["PENDING", "CONFIRMED", "ASSIGNED"].includes(booking.status) && !booking.contact_revealed_at && payment?.status !== "PAID";
  const canCreateCOD = !payment && ["PENDING", "CONFIRMED", "ASSIGNED"].includes(booking.status);
  const isCompleted = booking.status === "COMPLETED";
  const amount = booking.agreed_amount ?? payment?.amount ?? service?.price ?? null;

  async function handleCancel() {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز؟")) return;
    setCancelLoading(true); setActionError("");
    const res = await cancelCustomerBookingAction(booking.id);
    if (res.success) router.refresh(); else setActionError(res.error || "تعذر إلغاء الحجز");
    setCancelLoading(false);
  }

  async function handleCOD() {
    setCodLoading(true); setActionError("");
    const res = await createCODPaymentAction(booking.id);
    if (res.success) router.refresh(); else setActionError(res.error || "تعذر إنشاء طلب الدفع");
    setCodLoading(false);
  }

  async function revealContact() {
    setContactLoading(true); setActionError("");
    const result = await revealBookingProviderContactAction(booking.id);
    if (result.success) setProviderContact(result.contact); else setActionError(result.error || "تعذر إظهار بيانات التواصل");
    setContactLoading(false);
  }

  async function handleReview() {
    setReviewLoading(true); setActionError("");
    const result = booking.listing_id
      ? await submitMarketplaceReviewAction(booking.id, rating, reviewComment)
      : booking.service_id
        ? await submitServiceReviewAction(booking.service_id, rating, reviewComment, booking.id)
        : { success: false as const, error: "بيانات الحجز غير مكتملة" };
    if (!result.success) setActionError(result.error || "تعذر حفظ التقييم"); else router.refresh();
    setReviewLoading(false);
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold">{getBookingStatusLabel(booking.status)}</span>
          <h1 className="mt-5 text-3xl font-bold tracking-[-.05em]">{service?.title || booking.listing?.title || "تفاصيل الطلب"}</h1>
          <p className="mt-2 text-[11px] text-white/70">رقم الطلب #{booking.id.slice(0, 8)}</p>
          {amount != null && <strong className="mt-5 block text-2xl text-[#ffc985]">{Number(amount).toFixed(2)} د.أ</strong>}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft sm:p-6">
          <p className="text-[10px] font-bold text-brand">تفاصيل التنفيذ</p>
          <h2 className="mt-1 text-xl font-bold">موعد ومكان الخدمة</h2>
          <div className="mt-5 grid gap-3 text-xs">
            <div className="flex gap-3 rounded-2xl bg-surface-muted p-4"><CalendarDays size={17} className="shrink-0 text-brand" /><div><p className="text-[9px] text-muted">التاريخ</p><strong>{formatDate(booking.booking_date)}</strong></div></div>
            <div className="flex gap-3 rounded-2xl bg-surface-muted p-4"><Clock3 size={17} className="shrink-0 text-brand" /><div><p className="text-[9px] text-muted">الوقت</p><strong>{booking.start_time || "غير محدد"}{booking.end_time ? ` - ${booking.end_time}` : ""}</strong></div></div>
            <div className="flex gap-3 rounded-2xl bg-surface-muted p-4"><MapPin size={17} className="shrink-0 text-brand" /><div><p className="text-[9px] text-muted">العنوان</p><strong className="leading-6">{booking.address || "غير محدد"}</strong></div></div>
            <div className="flex gap-3 rounded-2xl bg-surface-muted p-4"><Phone size={17} className="shrink-0 text-brand" /><div><p className="text-[9px] text-muted">رقمك للتواصل</p><strong dir="ltr">{booking.phone || "غير محدد"}</strong></div></div>
          </div>
          {booking.notes && <div className="mt-5 border-t border-theme pt-5"><p className="text-[10px] font-bold text-brand">ملاحظاتك</p><p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-muted">{booking.notes}</p></div>}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft">
            <p className="text-[10px] font-bold text-brand">مقدم الخدمة</p>
            {provider ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] font-bold text-brand">{provider.full_name?.slice(0,1) || "ج"}</div>
                  <div><strong>{provider.full_name || "مقدم الخدمة"}</strong><p className="mt-1 flex items-center gap-1 text-[9px] text-[rgb(var(--success))]"><ShieldCheck size={12}/>معاملة داخل جسر</p></div>
                </div>
                <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-[10px]">
                  {provider.phone ? <span dir="ltr">{provider.phone}</span> : <button type="button" onClick={revealContact} disabled={contactLoading} className="font-bold text-brand">{contactLoading ? "جارٍ التحقق..." : "إظهار رقم مقدم الخدمة"}</button>}
                </div>
                {!provider.phone && <p className="mt-2 text-[9px] leading-5 text-muted">إظهار الرقم يسجّل كشف بيانات التواصل لحماية حقوق الطرفين.</p>}
                {booking.provider_id && <MessageProviderButton providerId={booking.provider_id} listingId={booking.listing_id} bookingId={booking.id} className="secondary-button mt-3 w-full" />}
              </>
            ) : <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-xs text-muted">لم يتم تعيين مقدم خدمة بعد.</p>}
          </section>

          <section className="rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft">
            <div className="flex items-center gap-2"><WalletCards size={17} className="text-brand"/><h2 className="font-bold">الدفع</h2></div>
            {payment ? (
              <div className="mt-4 space-y-3 text-[11px]">
                <div className="flex justify-between"><span className="text-muted">المبلغ</span><strong>{payment.amount} {payment.currency}</strong></div>
                <div className="flex justify-between"><span className="text-muted">الطريقة</span><strong>{paymentMethod(payment.payment_method)}</strong></div>
                <div className="flex justify-between"><span className="text-muted">الحالة</span><strong>{paymentStatus(payment.status)}</strong></div>
              </div>
            ) : <p className="mt-3 text-[10px] text-muted">لم يتم إنشاء طلب دفع بعد.</p>}
            {canCreateCOD && <button type="button" onClick={handleCOD} disabled={codLoading} className="brand-button mt-4 w-full">{codLoading ? "جارٍ المعالجة..." : "اعتماد الدفع عند الاستلام"}</button>}
          </section>
        </aside>
      </div>

      {isCompleted && !hasReviewed && (booking.listing_id || booking.service_id) && (
        <section className="rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft sm:p-6">
          <p className="text-[10px] font-bold text-brand">تجربتك مهمة</p>
          <h2 className="mt-1 text-xl font-bold">قيّم الخدمة</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
            <label className="text-xs font-bold">التقييم<select value={rating} onChange={(e)=>setRating(Number(e.target.value))} className="form-field mt-1.5">{[5,4,3,2,1].map(v=><option key={v} value={v}>{v} نجوم</option>)}</select></label>
            <label className="text-xs font-bold">تعليق اختياري<textarea value={reviewComment} onChange={(e)=>setReviewComment(e.target.value)} maxLength={1000} rows={3} className="form-field mt-1.5"/></label>
          </div>
          <button type="button" onClick={handleReview} disabled={reviewLoading} className="brand-button mt-4 gap-1.5"><Star size={14}/>{reviewLoading ? "جارٍ الحفظ..." : "حفظ التقييم"}</button>
        </section>
      )}

      {actionError && <p role="alert" className="rounded-2xl bg-[rgb(var(--danger)/0.1)] p-4 text-xs text-[rgb(var(--danger))]">{actionError}</p>}

      <div className="flex flex-wrap gap-2">
        {isCompleted && !booking.listing_id && booking.service_id && <Link href={`/booking?serviceId=${booking.service_id}`} className="brand-button">حجز مرة أخرى</Link>}
        {isCompleted && booking.listing?.slug && <Link href={`/listings/${booking.listing.slug}`} className="brand-button">عرض الخدمة مرة أخرى</Link>}
        {cancellable && <button type="button" onClick={handleCancel} disabled={cancelLoading} className="secondary-button gap-1.5 text-[rgb(var(--danger))]"><XCircle size={14}/>{cancelLoading ? "جارٍ الإلغاء..." : "إلغاء الحجز"}</button>}
        <Link href="/bookings" className="secondary-button ms-auto gap-1.5"><ArrowLeft size={14}/>العودة للحجوزات</Link>
      </div>
    </div>
  );
}
