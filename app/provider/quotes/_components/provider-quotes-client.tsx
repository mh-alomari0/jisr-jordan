"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Sparkles,
  WalletCards,
  XCircle,
} from "lucide-react";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import {
  acceptProviderQuoteAction,
  rejectProviderQuoteAction,
} from "@/lib/actions/marketplace-transactions";

interface CustomerQuoteRow {
  id: string;
  amount: number;
  currency: string;
  timeline_days: number;
  message: string | null;
  status: string;
  expires_at: string;
}

interface CustomerQuoteRequestRow {
  id: string;
  requirements: string;
  budget: number | null;
  target_date: string | null;
  status: string;
  created_at: string;
  service_listings?: {
    id: string;
    slug: string;
    title: string;
    delivery_type: string;
    pricing_model: string;
  } | null;
  provider_quotes?: CustomerQuoteRow[] | null;
}

export default function CustomerQuotesClient({
  requests,
}: {
  requests: CustomerQuoteRequestRow[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman",
  }).format(new Date());

  const accept = async (
    quote: CustomerQuoteRow,
    remote: boolean,
    data: FormData,
  ) => {
    setPending(true);
    setMessage("");

    const result = await acceptProviderQuoteAction({
      quoteId: quote.id,
      bookingDate: String(data.get("bookingDate")),
      startTime: String(data.get("startTime")),
      endTime: String(data.get("endTime")),
      phone: String(data.get("phone")),
      address: remote ? "خدمة عن بُعد" : String(data.get("address")),
      idempotencyKey: crypto.randomUUID().replaceAll("-", ""),
    });

    if (!result.success || !result.bookingId) {
      setPending(false);
      setMessage(result.error || "تعذر قبول العرض");
      return;
    }

    const payment = await createCODPaymentAction(result.bookingId);
    if (!payment.success) {
      setMessage("تم إنشاء الطلب، ويمكنك اختيار الدفع النقدي من صفحة الحجز.");
    }
    router.push("/bookings/" + result.bookingId);
  };

  const reject = async (quoteId: string) => {
    if (!window.confirm("هل أنت متأكد من رفض هذا العرض؟")) return;
    const result = await rejectProviderQuoteAction(quoteId);
    if (!result.success) setMessage(result.error || "تعذر رفض العرض");
    else router.refresh();
  };

  if (!requests.length) {
    return (
      <div className="surface-card p-12 text-center space-y-3">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
          <FileQuestion size={26} />
        </span>
        <h2 className="text-lg font-black">لا توجد لديك طلبات عروض أسعار</h2>
        <p className="text-xs text-muted max-w-sm mx-auto leading-6">
          يمكنك طلب عرض سعر مخصص لأي خدمة تحتاج إلى تفاصيل محددة من دليل الخدمات.
        </p>
        <Link href="/discover" className="brand-button mt-4 text-xs font-black">
          استكشف الخدمات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message && (
        <p
          role="alert"
          className="rounded-2xl bg-[rgb(var(--warning)/0.1)] p-4 text-xs font-bold text-[rgb(var(--warning))]"
        >
          {message}
        </p>
      )}

      {requests.map((request) => {
        const quote = request.provider_quotes?.find(
          (item) => item.status === "PENDING",
        );
        const expired = quote
          ? new Date(quote.expires_at) <= new Date()
          : false;
        const remote = request.service_listings?.delivery_type === "REMOTE";

        return (
          <article
            key={request.id}
            className="surface-card overflow-hidden p-5 sm:p-7 space-y-4"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <span className="status-pill bg-surface-muted text-muted font-black">
                  {request.status === "QUOTED"
                    ? "وصلك عرض سعر 🎉"
                    : request.status === "REQUESTED"
                      ? "قيد دراسة الفني"
                      : request.status}
                </span>

                <h2 className="mt-3 text-lg font-black sm:text-xl">
                  {request.service_listings?.title || "طلب عرض سعر"}
                </h2>

                <p className="mt-2 text-xs leading-6 text-muted max-w-2xl">
                  {request.requirements}
                </p>
              </div>

              {quote && (
                <div className="rounded-2xl bg-[rgb(var(--primary-soft))] p-4 text-center sm:text-start shrink-0">
                  <p className="text-[10px] font-bold text-muted">السعر المقدم</p>
                  <strong className="mt-1 block text-2xl font-black text-brand">
                    {quote.amount} د.أ
                  </strong>
                </div>
              )}
            </div>

            {quote ? (
              <div className="border-t border-theme pt-4 space-y-4">
                <div className="rounded-2xl bg-surface-muted p-4 space-y-2">
                  <p className="text-xs leading-6 font-medium">
                    {quote.message || "أرسل مقدم الخدمة عرضاً رسمياً لتنفيذ متطلباتك."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-[11px] font-bold text-muted pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} className="text-brand" /> مدة الإنجاز: {quote.timeline_days} أيام
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-brand" /> صالح لغاية:{" "}
                      {new Date(quote.expires_at).toLocaleDateString("ar-JO")}
                    </span>
                  </div>
                </div>

                {!expired && request.status === "QUOTED" && (
                  activeId === quote.id ? (
                    <form
                      action={(data) => accept(quote, remote, data)}
                      className="rounded-2xl border border-theme bg-surface-muted p-4 sm:p-5 grid gap-3 sm:grid-cols-3"
                    >
                      <label className="text-xs font-bold">
                        موعد البدء
                        <input
                          name="bookingDate"
                          type="date"
                          min={today}
                          defaultValue={request.target_date || ""}
                          required
                          className="form-field mt-1.5"
                        />
                      </label>

                      <label className="text-xs font-bold">
                        من
                        <input
                          name="startTime"
                          type="time"
                          defaultValue="09:00"
                          required
                          className="form-field mt-1.5"
                        />
                      </label>

                      <label className="text-xs font-bold">
                        إلى
                        <input
                          name="endTime"
                          type="time"
                          defaultValue="10:00"
                          required
                          className="form-field mt-1.5"
                        />
                      </label>

                      <label className="text-xs font-bold sm:col-span-3">
                        رقم الهاتف للتأكيد
                        <input
                          name="phone"
                          inputMode="tel"
                          dir="ltr"
                          pattern="(077|078|079)[0-9]{7}"
                          placeholder="0791234567"
                          required
                          className="form-field mt-1.5 text-right"
                        />
                      </label>

                      {!remote && (
                        <label className="text-xs font-bold sm:col-span-3">
                          عنوان التنفيذ
                          <input
                            name="address"
                            minLength={5}
                            maxLength={500}
                            placeholder="المدينة، المنطقة، الشارع"
                            required
                            className="form-field mt-1.5"
                          />
                        </label>
                      )}

                      <div className="flex flex-wrap gap-2 sm:col-span-3 pt-2">
                        <button
                          disabled={pending}
                          className="brand-button text-xs font-black"
                        >
                          <CheckCircle2 size={15} />
                          {pending ? "جارٍ التأكيد..." : "تأكيد وقبول العرض"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveId(null)}
                          className="secondary-button text-xs font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveId(quote.id)}
                        className="brand-button !min-h-[42px] text-xs font-black shadow-md"
                      >
                        <WalletCards size={15} /> قبول العرض وبدء الحجز
                      </button>

                      <button
                        type="button"
                        onClick={() => reject(quote.id)}
                        className="secondary-button !min-h-[42px] text-xs font-bold text-[rgb(var(--danger))]"
                      >
                        <XCircle size={15} /> رفض العرض
                      </button>

                      {request.service_listings?.slug && (
                        <Link
                          href={`/listings/${request.service_listings.slug}`}
                          className="secondary-button !min-h-[42px] ms-auto text-xs font-bold"
                        >
                          عرض تفاصيل الخدمة <ArrowLeft size={14} />
                        </Link>
                      )}
                    </div>
                  )
                )}

                {expired && (
                  <p className="text-xs font-bold text-[rgb(var(--danger))]">
                    انتهت صلاحية هذا العرض، يرجى تقديم طلب جديد.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-theme p-4 text-center text-xs text-muted">
                ⏳ طلبك وصل لمقدم الخدمة وبانتظار تقدير السعر المناسب لك.
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}