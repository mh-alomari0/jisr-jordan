import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-theme bg-[rgb(var(--canvas)/0.8)] text-xs text-muted backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark h-7 w-7 text-xs">ج</span>
          <p className="text-xs font-bold text-[rgb(var(--text-main))]">
            منصة جسر الأردن © {new Date().getFullYear()}
          </p>
        </div>

        <nav
          aria-label="روابط سريعة"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold"
        >
          <Link href="/discover" className="transition-colors hover:text-brand">
            استكشاف الخدمات
          </Link>
          <Link href="/faq" className="transition-colors hover:text-brand">
            الأسئلة الشائعة
          </Link>
          <Link href="/contact" className="transition-colors hover:text-brand">
            تواصل معنا
          </Link>
          <Link href="/terms" className="transition-colors hover:text-brand">
            الشروط والأحكام
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-brand">
            سياسة الخصوصية
          </Link>
        </nav>
      </div>
    </footer>
  );
}
