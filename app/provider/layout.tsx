import Link from "next/link";

const links = [
  ["/provider", "الطلبات الحالية"],
  ["/provider/listings", "عروض الخدمات"],
  ["/provider/quotes", "طلبات عروض الأسعار"],
  ["/provider/posts", "المحتوى المهني"],
  ["/provider/schedule", "جدول العمل"],
  ["/provider/profile", "الملف المهني"],
] as const;

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <aside className="w-full border-b border-theme bg-surface p-4 md:w-64 md:border-b-0 md:border-l md:p-6">
        <div className="border-b border-theme pb-4">
          <Link href="/provider" className="text-lg font-black"><span className="text-brand">جسر</span> | مساحة المزود</Link>
          <p className="mt-1 text-xs text-muted">إدارة العمل والحضور المهني</p>
        </div>
        <nav aria-label="مساحة مقدم الخدمة" className="mt-4 flex gap-2 overflow-x-auto text-xs font-bold md:flex-col md:gap-1 md:overflow-visible md:text-sm">
          {links.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-lg p-2.5 transition hover:bg-surface-muted hover:text-brand">{label}</Link>)}
          <div className="hidden border-t border-theme pt-4 md:block">
            <Link href="/" className="secondary-button w-full !px-3">العودة للسوق</Link>
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-x-hidden p-2 md:p-6">{children}</div>
    </div>
  );
}
