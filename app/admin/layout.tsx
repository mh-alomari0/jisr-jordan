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
  ShieldCheck,
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

  if (
    !profile ||
    !["ADMIN", "SUPER_ADMIN"].includes(profile.role)
  ) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-theme bg-[#102d2c] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a8e86] font-black">
              ج
            </span>

            <span>
              <strong className="block text-sm">
                جسر · الإدارة
              </strong>
              <span className="mt-0.5 block text-[9px] text-white/60">
                تشغيل السوق والمراجعة
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[9px] font-bold text-white/75 sm:inline-flex">
              <ShieldCheck size={13} />
              {profile.role === "SUPER_ADMIN"
                ? "Super Admin"
                : "Admin"}
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold transition hover:bg-white/15"
            >
              السوق
              <ArrowLeft size={13} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-theme bg-surface md:min-h-[calc(100vh-73px)] md:border-b-0 md:border-l">
          <nav
            aria-label="لوحة الإدارة"
            className="hide-scrollbar flex gap-2 overflow-x-auto p-3 md:sticky md:top-0 md:flex-col md:gap-1 md:p-4"
          >
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-[10px] font-bold text-muted transition hover:bg-[rgb(var(--primary-soft))] hover:text-brand md:text-xs"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted transition group-hover:bg-surface">
                  <Icon size={15} />
                </span>
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 overflow-x-hidden p-3 sm:p-5 lg:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}
