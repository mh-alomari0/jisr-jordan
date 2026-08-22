import { FileQuestion } from "lucide-react";
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
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          مسارات التسعير
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          عروض الأسعار
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          تابع طلب العميل ورد مقدم الخدمة وحالة العرض من ناحية تشغيلية، بدون تدخل في التفاوض نفسه.
        </p>
        {result.success && (
          <p className="mt-3 text-[10px] text-muted">
            {result.requests.length} طلب
          </p>
        )}
      </header>

      <section>
        {result.success ? (
          result.requests.length ? (
            <div className="divide-y divide-theme border-y border-theme">
              {result.requests.map((request) => (
                <article key={request.id} className="py-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-brand">
                        {request.status}
                      </p>
                      <h2 className="mt-1 text-sm font-bold sm:text-base">
                        {listingTitle(request.service_listings) ||
                          "طلب عرض سعر"}
                      </h2>
                    </div>

                    <div className="shrink-0 text-[9px] leading-5 text-muted">
                      عميل: {String(request.customer_id).slice(0, 8)}
                      <br />
                      مزود: {String(request.provider_id).slice(0, 8)}
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 max-w-3xl text-xs leading-6">
                    {request.requirements}
                  </p>

                  {request.provider_quotes?.length ? (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-theme pt-3 text-[10px]">
                      {request.provider_quotes.map((quote) => (
                        <span key={quote.id}>
                          <strong>{quote.amount} د.أ</strong>
                          <span className="ms-1 text-muted">
                            · {quote.status}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileQuestion className="mx-auto h-7 w-7 text-muted" />
              <p className="mt-3 text-sm font-bold">
                ما في طلبات عروض أسعار بعد
              </p>
            </div>
          )
        ) : (
          <div
            role="alert"
            className="border-b border-theme py-8 text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}
      </section>
    </main>
  );
}
