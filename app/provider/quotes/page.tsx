import { getProviderQuoteRequestsAction } from "@/lib/actions/marketplace-transactions";
import ProviderQuotesClient from "./_components/provider-quotes-client";

export const metadata = { title: "طلبات عروض الأسعار | مساحة مقدم الخدمة" };

export default async function ProviderQuotesPage() {
  const result = await getProviderQuoteRequestsAction();
  if (!result.success) return <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">{result.error}</div>;
  return <div className="mx-auto max-w-5xl p-3 sm:p-6"><header className="mb-6"><h1 className="text-2xl font-black">طلبات عروض الأسعار</h1><p className="mt-1 text-sm text-muted">رد بسعر نهائي ومدة واضحة. لا تظهر لك بيانات اتصال العميل قبل قبول العرض.</p></header><ProviderQuotesClient requests={result.requests as never} /></div>;
}

