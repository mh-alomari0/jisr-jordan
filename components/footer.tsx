import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto hidden border-t border-theme bg-surface text-xs text-muted md:block">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p><span className="font-black text-[rgb(var(--text-main))]">جسر الأردن</span> © {new Date().getFullYear()}</p>
        <nav aria-label="روابط المساعدة" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/faq" className="hover:text-brand">المساعدة</Link>
          <Link href="/contact" className="hover:text-brand">تواصل معنا</Link>
          <Link href="/terms" className="hover:text-brand">الشروط</Link>
          <Link href="/privacy" className="hover:text-brand">الخصوصية</Link>
        </nav>
      </div>
    </footer>
  );
}
