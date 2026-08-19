import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-theme bg-[rgb(var(--surface))] text-xs text-muted">
      <div className="container mx-auto grid gap-8 px-6 py-10 text-right md:grid-cols-4">
        <div className="space-y-3">
          <h3 className="text-base font-black text-[rgb(var(--text-main))]"><span className="text-brand">جسر</span> الأردن</h3>
          <p className="leading-relaxed">
            سوق أردني لاكتشاف مقدمي الخدمات والمهارات، والحجز المباشر أو طلب عرض سعر ضمن مسارات واضحة وآمنة.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[rgb(var(--text-main))]">السوق</h4>
          <ul className="space-y-1.5">
            <li><Link href="/discover" className="transition hover:text-brand">استكشاف السوق</Link></li>
            <li><Link href="/services" className="transition hover:text-brand">الخدمات المنزلية</Link></li>
            <li><Link href="/bookings" className="transition hover:text-brand">متابعة الحجوزات</Link></li>
            <li><Link href="/provider/apply" className="transition hover:text-brand">انضم كمقدم خدمة</Link></li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[rgb(var(--text-main))]">الدعم والثقة</h4>
          <ul className="space-y-1.5">
            <li><Link href="/faq" className="transition hover:text-brand">الأسئلة الشائعة</Link></li>
            <li><Link href="/terms" className="transition hover:text-brand">الشروط والأحكام</Link></li>
            <li><Link href="/privacy" className="transition hover:text-brand">سياسة الخصوصية</Link></li>
            <li><Link href="/contact" className="transition hover:text-brand">تواصل معنا</Link></li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[rgb(var(--text-main))]">تواصل معنا</h4>
          <p>المملكة الأردنية الهاشمية</p>
          <p dir="ltr" className="text-right">support@jisr-jordan.com</p>
          <p className="text-[10px]">قناة الدعم تتطلب تحقق المالك من جاهزية صندوق البريد قبل الإطلاق.</p>
        </div>
      </div>
      <div className="border-t border-theme py-4 text-center">
        © {new Date().getFullYear()} جسر الأردن. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
