import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-theme bg-[rgb(var(--canvas)/0.8)] text-xs text-muted backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6">
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
          <Link href="/discover" className="hover:text-brand transition-colors">
            استكشاف الخدمات
          </Link>
          <Link href="/faq" className="hover:text-brand transition-colors">
            الأسئلة الشائعة
          </Link>
          <Link href="/contact" className="hover:text-brand transition-colors">
            تواصل معنا
          </Link>
          <Link href="/terms" className="hover:text-brand transition-colors">
            الشروط والأحكام
          </Link>
          <Link href="/privacy" className="hover:text-brand transition-colors">
            سياسة الخصوصية
          </Link>
        </nav>
      </div>
    </footer>
  );
}