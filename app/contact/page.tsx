import { Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "تواصل معنا | جسر الأردن",
  description: "قنوات التواصل والدعم الفني لمنصة جسر الأردن.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-theme pb-6">
        <p className="text-[10px] font-bold text-brand">الدعم</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-4xl">
          احكيلنا شو صار
        </h1>
        <p className="mt-2 max-w-xl text-xs leading-6 text-muted sm:text-sm">
          عندك سؤال، ملاحظة أو مشكلة؟ ابعثلنا التفاصيل وبنراجعها.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <a
          href="mailto:support@jisr-jordan.com"
          className="border-b border-theme pb-5 transition hover:text-brand sm:border-b-0 sm:border-e sm:pe-6"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
            <Mail size={19} />
          </span>
          <h2 className="mt-4 text-sm font-bold">البريد الإلكتروني</h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            للمشاكل والاستفسارات والمراسلات المتعلقة بالحساب أو الطلبات.
          </p>
          <span className="mt-3 block text-xs font-bold text-brand" dir="ltr">
            support@jisr-jordan.com
          </span>
        </a>

        <div className="sm:ps-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-brand">
            <MapPin size={19} />
          </span>
          <h2 className="mt-4 text-sm font-bold">التغطية داخل الأردن</h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            ظهور الخدمة يعتمد على المناطق التي يحددها مقدم الخدمة داخل المنصة.
          </p>
        </div>
      </section>
    </main>
  );
}
