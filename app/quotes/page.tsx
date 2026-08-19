import { redirect } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { getCustomerQuotesAction } from "@/lib/actions/marketplace-transactions";
import CustomerQuotesClient from "./_components/customer-quotes-client";

export const metadata = { title: "عروض الأسعار" };

export default async function CustomerQuotesPage() {
  const result = await getCustomerQuotesAction();
  if (!result.success && result.error === "يجب تسجيل الدخول") redirect("/login?redirectTo=/quotes");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><FileQuestion size={20}/></span>
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">طلبات التسعير</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">خلي السعر <span className="text-[#ffc985]">واضح قبل ما تبدأ.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">تابع ردود مقدمي الخدمة، قارن العرض، وبعد القبول يتحول لطلب رسمي داخل جسر.</p>
        </div>
      </section>

      <section className="mt-8">
        {result.success
          ? <CustomerQuotesClient requests={result.requests as never} />
          : <div role="alert" className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm">{result.error}</div>}
      </section>
    </main>
  );
}
