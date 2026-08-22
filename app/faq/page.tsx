import Link from "next/link";
import { CircleHelp, Mail } from "lucide-react";

export const metadata = {
  title: "الأسئلة الشائعة والدعم | جسر الأردن",
};

const faqs = [
  {
    q: "كيف أحجز خدمة؟",
    a: "ابحث عن الخدمة، افتح العرض المناسب، حدد الموعد والعنوان ثم أكد الطلب. بعدها بتقدر تتابع حالته من صفحة طلباتي.",
  },
  {
    q: "شو طريقة الدفع المتاحة حالياً؟",
    a: "الدفع النقدي عند إنجاز الخدمة هو المسار المتاح حالياً داخل جسر للحجوزات التي تدعمه.",
  },
  {
    q: "كيف يتم اعتماد مقدم الخدمة؟",
    a: "طلبات مقدمي الخدمة تمر بمراجعة إدارية قبل تفعيل حساب مقدم الخدمة ونشر خدماته على المنصة.",
  },
  {
    q: "بقدر ألغي الطلب؟",
    a: "إذا كانت حالة الطلب تسمح بالإلغاء، رح يظهر خيار الإلغاء داخل تفاصيل الطلب قبل بدء التنفيذ.",
  },
  {
    q: "شو أعمل إذا صار عندي مشكلة؟",
    a: "احتفظ بتفاصيل الطلب والمحادثة داخل جسر، وتواصل معنا من صفحة الدعم مع رقم الطلب ووصف المشكلة.",
  },
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-theme pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
            <CircleHelp size={19} />
          </span>
          <div>
            <p className="text-[10px] font-bold text-brand">مساعدة سريعة</p>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-4xl">
              أكثر الأسئلة اللي بتتكرر
            </h1>
          </div>
        </div>
      </header>

      <section className="divide-y divide-[rgb(var(--border))] border-y border-theme">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold sm:text-base">
              <span>{faq.q}</span>
              <span className="text-lg font-normal text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-5 text-xs leading-7 text-muted sm:text-sm">
              {faq.a}
            </p>
          </details>
        ))}
      </section>

      <section className="flex flex-col gap-3 border-t border-theme pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold">لسه عندك سؤال؟</h2>
          <p className="mt-1 text-xs text-muted">
            ابعثلنا التفاصيل من صفحة التواصل.
          </p>
        </div>

        <Link href="/contact" className="secondary-button gap-2 self-start">
          <Mail size={15} />
          تواصل معنا
        </Link>
      </section>
    </main>
  );
}
