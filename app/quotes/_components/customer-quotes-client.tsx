"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div className="space-y-4">
      {message && <p role="alert" className="rounded-xl bg-[rgb(var(--warning)/0.1)] p-3 text-xs">{message}</p>}
      {requests.length ? requests.map((request) => {
        const quote = request.provider_quotes?.find((item) => item.status === "PENDING");
        const expired = quote ? new Date(quote.expires_at) <= new Date() : false;
        const remote = request.service_listings?.delivery_type === "REMOTE";
        return (
          <article key={request.id} className="surface-card p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div><span className="status-pill bg-surface-muted">{request.status}</span><h2 className="mt-2 font-black">{request.service_listings?.title || "طلب عرض سعر"}</h2><p className="mt-2 line-clamp-3 text-xs leading-6 text-muted">{request.requirements}</p></div>
              {quote && <strong className="shrink-0 text-lg text-brand">{quote.amount} د.أ</strong>}
            </div>
            {quote ? <div className="mt-4 border-t border-theme pt-4">
              <p className="text-xs leading-6">{quote.message || "أرسل مقدم الخدمة سعراً نهائياً للمتطلبات المذكورة."}</p>
              <p className="mt-2 text-[11px] text-muted">مدة التنفيذ: {quote.timeline_days} يوم · صالح حتى {new Date(quote.expires_at).toLocaleDateString("ar-JO")}</p>
              {!expired && request.status === "QUOTED" && (activeId === quote.id ? (
                <form action={(data) => accept(quote, remote, data)} className="mt-4 grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-3">
                  <label className="text-xs font-bold">موعد البدء<input name="bookingDate" type="date" min={today} defaultValue={request.target_date || ""} required className="form-field mt-1.5" /></label>
                  <label className="text-xs font-bold">من<input name="startTime" type="time" defaultValue="09:00" required className="form-field mt-1.5" /></label>
                  <label className="text-xs font-bold">إلى<input name="endTime" type="time" defaultValue="10:00" required className="form-field mt-1.5" /></label>
                  <label className="text-xs font-bold sm:col-span-3">رقم الهاتف<input name="phone" inputMode="tel" dir="ltr" pattern="(077|078|079)[0-9]{7}" required className="form-field mt-1.5 text-right" /></label>
                  {!remote && <label className="text-xs font-bold sm:col-span-3">عنوان التنفيذ<input name="address" minLength={5} maxLength={500} required className="form-field mt-1.5" /></label>}
                  <div className="flex flex-wrap gap-2 sm:col-span-3"><button disabled={pending} className="brand-button">{pending ? "جارٍ القبول..." : "قبول وإنشاء الطلب"}</button><button type="button" onClick={() => setActiveId(null)} className="secondary-button">إلغاء</button></div>
                </form>
              ) : <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveId(quote.id)} className="brand-button">قبول العرض</button><button type="button" onClick={() => reject(quote.id)} className="secondary-button text-[rgb(var(--danger))]">رفض</button></div>)}
              {expired && <p className="mt-3 text-xs text-[rgb(var(--danger))]">انتهت صلاحية هذا العرض.</p>}
            </div> : <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-muted">بانتظار رد مقدم الخدمة.</p>}
          </article>
        );
      }) : <div className="surface-card p-10 text-center"><p className="font-black">لا توجد طلبات عروض أسعار</p><p className="mt-2 text-xs text-muted">استكشف الخدمات ذات التسعير المرن وابدأ طلباً آمناً.</p></div>}
    </div>
  );
}

