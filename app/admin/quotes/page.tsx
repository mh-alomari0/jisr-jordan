import { getAdminQuoteRequestsAction } from "@/lib/actions/marketplace-admin";

export const metadata = { title: "متابعة عروض الأسعار" };

function listingTitle(value: { title?: string } | { title?: string }[] | null) {
  return Array.isArray(value) ? value[0]?.title : value?.title;
}

export default async function AdminQuotesPage() {
  const result = await getAdminQuoteRequestsAction();
  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-6">
      <header className="mb-6"><h1 className="text-2xl font-black">طلبات وعروض الأسعار</h1><p className="mt-1 text-sm text-muted">رؤية تشغيلية لمسارات التفاوض المسجلة دون كشف كلمات مرور أو أسرار.</p></header>
      {result.success ? result.requests.length ? <div className="space-y-3">{result.requests.map((request) => (
        <article key={request.id} className="surface-card p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row"><div><span className="status-pill bg-surface-muted">{request.status}</span><h2 className="mt-2 font-black">{listingTitle(request.service_listings) || "طلب عرض سعر"}</h2></div><div className="text-[11px] text-muted">عميل: {String(request.customer_id).slice(0, 8)} · مزود: {String(request.provider_id).slice(0, 8)}</div></div>
          <p className="mt-3 line-clamp-3 text-xs leading-6">{request.requirements}</p>
          <div className="mt-3 flex flex-wrap gap-2">{request.provider_quotes?.map((quote) => <span key={quote.id} className="status-pill bg-[rgb(var(--primary-soft))] text-brand">{quote.amount} د.أ · {quote.status}</span>)}</div>
        </article>
      ))}</div> : <div className="surface-card p-10 text-center text-sm text-muted">لا توجد طلبات عروض أسعار بعد.</div> : <div role="alert" className="surface-card p-8">{result.error}</div>}
    </div>
  );
}
