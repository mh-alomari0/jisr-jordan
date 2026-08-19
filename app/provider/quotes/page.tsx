import { FileQuestion } from "lucide-react";
import { getProviderQuoteRequestsAction } from "@/lib/actions/marketplace-transactions";
import ProviderQuotesClient from "./_components/provider-quotes-client";

export const metadata = {
  title: "طلبات عروض الأسعار | مساحة مقدم الخدمة",
};

export default async function ProviderQuotesPage() {
  const result = await getProviderQuoteRequestsAction();

  if (!result.success) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">
          {result.error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <FileQuestion size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            فرص جديدة
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            افهم الطلب،
            <span className="text-[#ffc985]"> وبعدها سعّر.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            اقرأ متطلبات العميل وميزانيته والتاريخ المستهدف، وأرسل سعراً نهائياً
            ومدة تنفيذ واضحة. بيانات الاتصال تظل محمية حتى يتم المسار المسموح.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <ProviderQuotesClient
          requests={result.requests as never}
        />
      </div>
    </main>
  );
}
