import { Mail, MapPin, MessageCircle, PhoneCall, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "تواصل معنا | جسر الأردن",
  description: "قنوات التواصل والدعم الفني لمنصة جسر الأردن.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Header Banner */}
      <section className="surface-card p-6 sm:p-8 text-center space-y-3 bg-gradient-to-br from-[rgb(var(--primary-soft))] to-surface">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--primary))] text-white shadow-md">
          <PhoneCall size={26} />
        </span>
        <h1 className="text-2xl font-black sm:text-4xl">فريق جسر دائماً بخدمتك</h1>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-6">
          يسعدنا استقبال استفساراتك واقتراحاتك ومساعدتك في أي وقت.
        </p>
      </section>

      {/* Contact Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="https://wa.me/962790000000"
          target="_blank"
          rel="noopener noreferrer"
          className="surface-card p-6 flex items-start gap-4 transition-transform hover:-translate-y-1 active:scale-[0.98] border-2 border-[#25D366]/30 bg-[#25D366]/5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md">
            <MessageCircle size={24} className="fill-current" />
          </span>
          <div>
            <h2 className="text-base font-black">الدعم عبر واتساب</h2>
            <p className="text-xs text-muted mt-1">استجابة سريعة لجميع استفساراتك اليومية.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#25D366]" dir="ltr">
              +962 79 000 0000
            </span>
          </div>
        </a>

        <a
          href="mailto:support@jisr-jordan.com"
          className="surface-card p-6 flex items-start gap-4 transition-transform hover:-translate-y-1 active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
            <Mail size={22} />
          </span>
          <div>
            <h2 className="text-base font-black">البريد الإلكتروني</h2>
            <p className="text-xs text-muted mt-1">للمراسلات الرسمية والاستفسارات العامة.</p>
            <span className="mt-3 block text-xs font-black text-brand" dir="ltr">
              support@jisr-jordan.com
            </span>
          </div>
        </a>
      </div>

      {/* Coverage area */}
      <section className="surface-card p-6 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-brand">
          <MapPin size={24} />
        </span>
        <div>
          <h3 className="text-base font-black">نطاق التغطية والعمل</h3>
          <p className="text-xs text-muted mt-0.5 leading-6">
            المملكة الأردنية الهاشمية — تشمل العاصمة عمّان وجميع المحافظات وفق مناطق التغطية لكل مقدم خدمة.
          </p>
        </div>
      </section>
    </main>
  );
}