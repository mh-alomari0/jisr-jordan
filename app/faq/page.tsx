import Link from "next/link";
import {
  CircleHelp,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "الأسئلة الشائعة والدعم | جسر الأردن",
};

const faqs = [
  {
    q: "كيف يمكنني حجز خدمة عبر منصة جسر الأردن؟",
    a: "يمكنك استكشاف دليل الخدمات أو البحث مباشرة، اختيار الخدمة المناسبة، تحديد التاريخ والوقت المفضلين وعنوانك، ثم تأكيد الحجز ومتابعته فوراً من صفحة 'طلباتي'.",
  },
  {
    q: "ما هي وسائل الدفع المتاحة داخل الأردن؟",
    a: "الخيار الأساسي والمعتمد حالياً هو الدفع النقدي عند استلام الخدمة وإنجازها (Cash on Delivery) بعد التأكد من رضاك التام عن العمل.",
  },
  {
    q: "كيف يتم توثيق واعتماد مقدمي الخدمات؟",
    a: "يراجع فريق إدارة جسر ملف كل مقدم خدمة وخبراته السابقة وبياناته المهنية قبل اعتماد حسابه ونشر خدماته للجمهور.",
  },
  {
    q: "هل أستطيع إلغاء أو تعديل الحجز؟",
    a: "نعم، يمكنك إدارة وتعديل أو إلغاء حجزك بسهولة ومجاناً من خلال صفحة تفاصيل الطلب قبل بدء التنفيذ.",
  },
  {
    q: "ماذا أفعل إذا واجهت مشكلة مع مقدم الخدمة؟",
    a: "فريق دعم جسر جاهز لمساعدتك وحل أي خلاف فوراً عبر محادثة الدعم المباشرة أو عبر واتساب.",
  },
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Header Banner */}
      <section className="surface-card p-6 sm:p-8 text-center space-y-3 bg-gradient-to-br from-[rgb(var(--primary-soft))] to-surface">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--primary))] text-white shadow-md">
          <CircleHelp size={28} />
        </span>
        <h1 className="text-2xl font-black sm:text-4xl">كيف نقدر نساعدك؟</h1>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-6">
          إليك إجابات لأكثر الأسئلة تكراراً حول كيفية استخدام المنصة والدفع وحماية الحجوزات.
        </p>
      </section>

      {/* Accordion Questions */}
      <section className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="surface-card group overflow-hidden !rounded-2xl transition-all duration-200"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 sm:p-5 font-black text-sm sm:text-base">
              <span>{faq.q}</span>
              <span className="ms-2 flex h-7 w-7 items-center justify-center rounded-xl bg-surface-muted text-muted transition-transform group-open:rotate-180">
                ↓
              </span>
            </summary>
            <div className="border-t border-theme px-4 pb-5 pt-3 text-xs leading-6 text-muted sm:px-5 sm:text-sm sm:leading-7">
              {faq.a}
            </div>
          </details>
        ))}
      </section>

      {/* 🟢 Direct WhatsApp Support Box */}
      <section className="surface-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-[#25D366]/30 bg-[#25D366]/5">
        <div className="flex items-center gap-3.5 text-center sm:text-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md">
            <MessageCircle size={24} className="fill-current" />
          </span>
          <div>
            <h3 className="text-base font-black">عندك استفسار إضافي؟</h3>
            <p className="text-xs text-muted">تواصل مع فريق خدمة عملاء جسر الأردن عبر واتساب مباشرة.</p>
          </div>
        </div>

        <a
          href="https://wa.me/962790000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%B9%D9%86%D8%AF%D9%8A%20%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%AD%D9%88%D9%84%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%AC%D8%B3%D8%B1"
          target="_blank"
          rel="noopener noreferrer"
          className="brand-button !min-h-[44px] !bg-[#25D366] hover:!bg-[#1ebc59] !shadow-lg whitespace-nowrap text-xs font-black"
        >
          <MessageCircle size={16} className="fill-current me-1" /> تحدث معنا على واتساب
        </a>
      </section>
    </main>
  );
}