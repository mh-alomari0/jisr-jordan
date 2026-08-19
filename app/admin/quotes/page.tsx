import {
  ArrowLeft,
  FileQuestion,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { getAdminQuoteRequestsAction } from "@/lib/actions/marketplace-admin";

export const metadata = {
  title: "متابعة عروض الأسعار",
};

function listingTitle(
  value:
    | { title?: string }
    | { title?: string }[]
    | null,
) {
  return Array.isArray(value)
    ? value[0]?.title
    : value?.title;
}

export default async function AdminQuotesPage() {
  const result = await getAdminQuoteRequestsAction();

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <FileQuestion size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            مسارات التسعير
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            تابع التفاوض
            <span className="text-[#ffc985]"> بدون ما تتدخل فيه.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            رؤية تشغيلية لطلب العميل ورد مقدم الخدمة وحالة العرض، بدون كشف
            كلمات مرور أو أسرار أو بيانات دفع حساسة.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              الطلبات والعروض
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              متابعة التسعير
            </h2>
            {result.success && (
              <p className="mt-1 text-xs text-muted">
                {result.requests.length} طلب
              </p>
            )}
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <WalletCards size={12} className="text-brand" />
              سعر وحالة
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
              عرض تشغيلي فقط
            </span>
          </div>
        </div>

        {result.success ? (
          result.requests.length ? (
            <div className="space-y-3">
              {result.requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[1.7rem] border border-theme bg-surface p-5 shadow-soft"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <span className="status-pill bg-surface-muted">
                        {request.status}
                      </span>
                      <h3 className="mt-2 text-base font-bold">
                        {listingTitle(
                          request.service_listings,
                        ) || "طلب عرض سعر"}
                      </h3>
                    </div>

                    <div className="text-[9px] leading-5 text-muted">
                      عميل:{" "}
                      {String(request.customer_id).slice(0, 8)}
                      <br />
                      مزود:{" "}
                      {String(request.provider_id).slice(0, 8)}
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-xs leading-6">
                    {request.requirements}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-theme pt-4">
                    {request.provider_quotes?.map(
                      (quote) => (
                        <span
                          key={quote.id}
                          className="status-pill bg-[rgb(var(--primary-soft))] text-brand"
                        >
                          {quote.amount} د.أ · {quote.status}
                        </span>
                      ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
              <FileQuestion className="mx-auto h-8 w-8 text-brand" />
              <p className="mt-3 text-sm font-bold">
                لا توجد طلبات عروض أسعار بعد
              </p>
            </div>
          )
        ) : (
          <div
            role="alert"
            className="rounded-[1.8rem] border border-theme bg-surface p-8 text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}
      </section>
    </main>
  );
}
