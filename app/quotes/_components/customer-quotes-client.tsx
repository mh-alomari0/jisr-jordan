"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileQuestion, WalletCards, XCircle } from "lucide-react";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import { acceptProviderQuoteAction, rejectProviderQuoteAction } from "@/lib/actions/marketplace-transactions";

interface CustomerQuoteRow { id: string; amount: number; currency: string; timeline_days: number; message: string | null; status: string; expires_at: string; }
interface CustomerQuoteRequestRow {
  id: string; requirements: string; budget: number | null; target_date: string | null; status: string; created_at: string;
  service_listings?: { id: string; slug: string; title: string; delivery_type: string; pricing_model: string } | null;
  provider_quotes?: CustomerQuoteRow[] | null;
}

export default function CustomerQuotesClient({ requests }: { requests: CustomerQuoteRequestRow[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman" }).format(new Date());

  const accept = async (quote: CustomerQuoteRow, remote: boolean, data: FormData) => {
    setPending(true); setMessage("");
    const result = await acceptProviderQuoteAction({
      quoteId: quote.id,
      bookingDate: String(data.get("bookingDate")),
      startTime: String(data.get("startTime")),
      endTime: String(data.get("endTime")),
      phone: String(data.get("phone")),
      address: remote ? "خدمة عن بُعد" : String(data.get("address")),
      idempotencyKey: crypto.randomUUID().replaceAll("-", ""),
    });
    if (!result.success || !result.bookingId) { setPending(false); setMessage(result.error || "تعذر قبول العرض"); return; }
    const payment = await createCODPaymentAction(result.bookingId);
    if (!payment.success) setMessage("تم إنشاء الطلب، ويمكنك اختيار الدفع النقدي من صفحة الحجز.");
    router.push("/bookings/" + result.bookingId);
  };

  const reject = async (quoteId: string) => {
    if (!window.confirm("رفض عرض السعر الحالي؟")) return;
    const result = await rejectProviderQuoteAction(quoteId);
    if (!result.success) setMessage(result.error || "تعذر رفض العرض"); else router.refresh();
  };

  if (!requests.length) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
        <FileQuestion className="mx-auto h-7 w-7 text-brand" />
        <h2 className="mt-3 text-lg font-bold">ما عندك طلبات عروض أسعار</h2>
        <p className="mt-2 text-xs text-muted">اختَر خدمة بتسعير مرن وابعث تفاصيلك لمقدم الخدمة.</p>
        <Link href="/discover" className="brand-button mt-5">اكتشف الخدمات</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p role="alert" className="rounded-2xl bg-[rgb(var(--warning)/0.1)] p-4 text-xs">{message}</p>}
      {requests.map((request) => {
        const quote = request.provider_quotes?.find((item) => item.status === "PENDING");
        const expired = quote ? new Date(quote.expires_at) <= new Date() : false;
        const remote = request.service_listings?.delivery_type === "REMOTE";

        return (
          <article key={request.id} className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-bold text-muted">{request.status}</span>
                  <h2 className="mt-3 text-lg font-bold">{request.service_listings?.title || "طلب عرض سعر"}</h2>
                  <p className="mt-2 line-clamp-3 max-w-2xl text-xs leading-6 text-muted">{request.requirements}</p>
                </div>
                {quote && <div className="shrink-0 rounded-2xl bg-[rgb(var(--primary-soft))] px-4 py-3"><p className="text-[9px] text-muted">السعر المقترح</p><strong className="mt-1 block text-xl text-brand">{quote.amount} د.أ</strong></div>}
              </div>

              {quote ? (
                <div className="mt-5 border-t border-theme pt-5">
                  <div className="rounded-2xl bg-surface-muted p-4">
                    <p className="text-xs leading-6">{quote.message || "أرسل مقدم الخدمة سعراً نهائياً للمتطلبات المذكورة."}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted">
                      <span className="inline-flex items-center gap-1"><Clock3 size={13}/>مدة التنفيذ: {quote.timeline_days} يوم</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13}/>صالح حتى {new Date(quote.expires_at).toLocaleDateString("ar-JO")}</span>
                    </div>
                  </div>

                  {!expired && request.status === "QUOTED" && (
                    activeId === quote.id ? (
                      <form action={(data) => accept(quote, remote, data)} className="mt-4 grid gap-3 rounded-2xl border border-theme p-4 sm:grid-cols-3">
                        <label className="text-xs font-bold">موعد البدء<input name="bookingDate" type="date" min={today} defaultValue={request.target_date || ""} required className="form-field mt-1.5" /></label>
                        <label className="text-xs font-bold">من<input name="startTime" type="time" defaultValue="09:00" required className="form-field mt-1.5" /></label>
                        <label className="text-xs font-bold">إلى<input name="endTime" type="time" defaultValue="10:00" required className="form-field mt-1.5" /></label>
                        <label className="text-xs font-bold sm:col-span-3">رقم الهاتف<input name="phone" inputMode="tel" dir="ltr" pattern="(077|078|079)[0-9]{7}" required className="form-field mt-1.5 text-right" /></label>
                        {!remote && <label className="text-xs font-bold sm:col-span-3">عنوان التنفيذ<input name="address" minLength={5} maxLength={500} required className="form-field mt-1.5" /></label>}
                        <div className="flex flex-wrap gap-2 sm:col-span-3">
                          <button disabled={pending} className="brand-button gap-1.5"><CheckCircle2 size={14}/>{pending ? "جارٍ القبول..." : "قبول وإنشاء الطلب"}</button>
                          <button type="button" onClick={() => setActiveId(null)} className="secondary-button">إلغاء</button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setActiveId(quote.id)} className="brand-button gap-1.5"><WalletCards size={14}/>قبول العرض</button>
                        <button type="button" onClick={() => reject(quote.id)} className="secondary-button gap-1.5 text-[rgb(var(--danger))]"><XCircle size={14}/>رفض</button>
                        {request.service_listings?.slug && <Link href={`/listings/${request.service_listings.slug}`} className="secondary-button ms-auto gap-1.5">عرض الخدمة <ArrowLeft size={14}/></Link>}
                      </div>
                    )
                  )}

                  {expired && <p className="mt-3 text-xs font-bold text-[rgb(var(--danger))]">انتهت صلاحية هذا العرض.</p>}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[rgb(var(--primary)/0.25)] p-5 text-center text-xs text-muted">
                  بانتظار رد مقدم الخدمة.
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
