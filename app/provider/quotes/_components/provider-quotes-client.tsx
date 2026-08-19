"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToQuoteRequestAction } from "@/lib/actions/marketplace-transactions";

interface ProviderQuoteRow { id: string; amount: number; currency: string; timeline_days: number; message: string | null; status: string; expires_at: string; }
interface ProviderQuoteRequestRow {
  id: string; requirements: string; budget: number | null; target_date: string | null; status: string; created_at: string;
  service_listings?: { id: string; slug: string; title: string; delivery_type: string; pricing_model: string } | null;
  provider_quotes?: ProviderQuoteRow[] | null;
}

export default function ProviderQuotesClient({ requests }: { requests: ProviderQuoteRequestRow[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (requestId: string, formData: FormData) => {
    setPending(true); setMessage("");
    const expires = new Date(); expires.setDate(expires.getDate() + 7);
    const result = await respondToQuoteRequestAction({
      requestId,
      amount: Number(formData.get("amount")),
      timelineDays: Number(formData.get("timelineDays")),
      message: String(formData.get("message") || ""),
      expiresAt: expires.toISOString(),
    });
    setPending(false);
    if (!result.success) { setMessage(result.error || "تعذر إرسال العرض"); return; }
    setActiveId(null); router.refresh();
  };
  return (
    <div className="space-y-4">
      {message && <p role="alert" className="rounded-xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
      {requests.length ? requests.map((request) => {
        const current = request.provider_quotes?.find((quote) => quote.status === "PENDING");
        const respondable = ["REQUESTED", "QUOTED"].includes(request.status);
        return (
          <article key={request.id} className="surface-card p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div><span className="status-pill bg-surface-muted">{request.status}</span><h2 className="mt-2 font-black">{request.service_listings?.title || "طلب عرض سعر"}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{request.requirements}</p></div>
              <div className="shrink-0 text-xs text-muted">{request.budget ? "ميزانية العميل: " + request.budget + " د.أ" : "لم يحدد ميزانية"}</div>
            </div>
            {current && <div className="mt-4 rounded-xl bg-[rgb(var(--primary-soft))] p-4 text-xs"><strong className="text-brand">عرضك الحالي: {current.amount} د.أ</strong><p className="mt-1 text-muted">المدة: {current.timeline_days} يوم · صالح حتى {new Date(current.expires_at).toLocaleDateString("ar-JO")}</p></div>}
            {respondable && <div className="mt-4">
              {activeId === request.id ? <form action={(data) => submit(request.id, data)} className="grid gap-3 border-t border-theme pt-4 sm:grid-cols-2">
                <label className="text-xs font-bold">السعر النهائي بالدينار<input name="amount" type="number" min="1" max="1000000" step="0.01" required className="form-field mt-1.5" /></label>
                <label className="text-xs font-bold">مدة التنفيذ بالأيام<input name="timelineDays" type="number" min="1" max="3650" required className="form-field mt-1.5" /></label>
                <label className="text-xs font-bold sm:col-span-2">رسالة وتفاصيل العرض<textarea name="message" maxLength={2000} rows={3} className="form-field mt-1.5" /></label>
                <div className="flex gap-2 sm:col-span-2"><button disabled={pending} className="brand-button">{pending ? "جارٍ الإرسال..." : "إرسال عرض صالح 7 أيام"}</button><button type="button" onClick={() => setActiveId(null)} className="secondary-button">إلغاء</button></div>
              </form> : <button type="button" onClick={() => setActiveId(request.id)} className="brand-button mt-4">{current ? "تعديل بعرض جديد" : "إرسال عرض سعر"}</button>}
            </div>}
          </article>
        );
      }) : <div className="surface-card p-10 text-center text-sm text-muted">لا توجد طلبات عروض أسعار حالياً.</div>}
    </div>
  );
}

