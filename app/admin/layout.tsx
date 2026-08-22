import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  FileQuestion,
  LayoutDashboard,
  ListTree,
  ReceiptText,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const links = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/categories", label: "التصنيفات", icon: ListTree },
  { href: "/admin/listings", label: "عروض المزودين", icon: Store },
  { href: "/admin/quotes", label: "عروض الأسعار", icon: FileQuestion },
  { href: "/admin/content", label: "مراجعة المحتوى", icon: ClipboardCheck },
  { href: "/admin/commissions", label: "العمولات", icon: Banknote },
  { href: "/admin/services", label: "دليل الخدمات", icon: Boxes },
  { href: "/admin/users", label: "المستخدمون", icon: UsersRound },
  { href: "/admin/bookings", label: "الحجوزات", icon: CalendarDays },
  { href: "/admin/providers", label: "مقدمو الخدمة", icon: BookOpenCheck },
  { href: "/admin/payments", label: "المدفوعات", icon: WalletCards },
  { href: "/admin/audit-logs", label: "سجلات الأمان", icon: ReceiptText },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-theme bg-surface">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="brand-mark h-9 w-9 text-sm">ج</span>

            <span>
              <strong className="block text-sm">إدارة جسر</strong>
              <span className="mt-0.5 block text-[9px] text-muted">
                التشغيل والمراجعة
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] font-bold text-muted sm:inline">
              {profile.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-brand"
            >
              رجوع للسوق
              <ArrowLeft size={13} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-theme bg-surface md:min-h-[calc(100vh-65px)] md:border-b-0 md:border-l">
          <nav
            aria-label="لوحة الإدارة"
            className="hide-scrollbar flex gap-1 overflow-x-auto px-3 py-2 md:sticky md:top-0 md:flex-col md:px-3 md:py-4"
          >
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-[10px] font-bold text-muted transition hover:border-[rgb(var(--primary)/0.25)] hover:text-brand md:border-b-0 md:border-e-2 md:text-xs"
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
