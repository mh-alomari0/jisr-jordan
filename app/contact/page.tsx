import { Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "تواصل معنا | جسر الأردن",
  description: "قنوات التواصل والدعم لمنصة جسر الأردن.",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 p-6 text-right" dir="rtl">
      <header className="space-y-2 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">تواصل معنا</h1>
        <p className="text-sm text-gray-600">للاستفسارات التشغيلية أو المساعدة في حسابك أو حجزك.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:support@jisr-jordan.com"
          className="rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Mail className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="font-bold text-gray-900">البريد الإلكتروني</h2>
          <span className="mt-2 block text-sm text-gray-600" dir="ltr">support@jisr-jordan.com</span>
        </a>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <MapPin className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="font-bold text-gray-900">نطاق الخدمة</h2>
          <p className="mt-2 text-sm text-gray-600">المملكة الأردنية الهاشمية، وفق مناطق التغطية المتاحة لكل مزود.</p>
        </div>
      </div>

      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-900">
        لا تتوفر حالياً قنوات دعم عبر واتساب أو الإشعارات الفورية أو البريد الآلي للعمليات. تظهر تحديثات الحجز داخل حسابك في المنصة.
      </p>
    </div>
  );
}
