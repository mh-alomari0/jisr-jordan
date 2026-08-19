import { redirect } from "next/navigation";
import { getCustomerQuotesAction } from "@/lib/actions/marketplace-transactions";
import CustomerQuotesClient from "./_components/customer-quotes-client";

export const metadata = { title: "عروض الأسعار" };

export default async function CustomerQuotesPage() {
  const result = await getCustomerQuotesAction();
  if (!result.success && result.error === "يجب تسجيل الدخول") redirect("/login?redirectTo=/quotes");
  return <div className="mx-auto max-w-4xl px-4 py-8"><header className="mb-6"><h1 className="text-2xl font-black">عروض الأسعار</h1><p className="mt-1 text-sm text-muted">تابع طلباتك واقبل سعراً نهائياً لإنشاء طلب مسجل بعمولته.</p></header>{result.success ? <CustomerQuotesClient requests={result.requests as never} /> : <div role="alert" className="surface-card p-8 text-center">{result.error}</div>}</div>;
}

