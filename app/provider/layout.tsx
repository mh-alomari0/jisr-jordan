import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileQuestion,
  Home,
  Images,
  UserRound,
} from "lucide-react";

const links = [
  { href: "/provider", label: "الرئيسية", icon: Home },
  { href: "/provider/listings", label: "خدماتي", icon: BriefcaseBusiness },
  { href: "/provider/quotes", label: "عروض الأسعار", icon: FileQuestion },
  { href: "/provider/posts", label: "أعمالي", icon: Images },
  { href: "/provider/schedule", label: "جدولي", icon: CalendarDays },
  { href: "/provider/profile", label: "ملفي", icon: UserRound },
] as const;

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-theme bg-[rgb(var(--surface)/0.86)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold tracking-[.08em] text-brand">
                مساحة مقدم الخدمة
              </p>
              <h2 className="mt-0.5 text-sm font-bold">
                أدِر شغلك من مكان واحد
              </h2>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-theme bg-surface px-3 py-2 text-[10px] font-bold transition hover:text-brand"
            >
              السوق
              <ArrowLeft size={13} />
            </Link>
          </div>

          <nav
            aria-label="مساحة مقدم الخدمة"
            className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-theme bg-surface px-3 py-2 text-[10px] font-bold text-muted transition hover:border-[rgb(var(--primary)/0.35)] hover:text-brand"
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
