import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { getAdminDashboardStatsAction } from "@/lib/actions/admin-dashboard";

export const metadata = {
  title: "نظرة عامة | إدارة جسر",
};

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStatsAction();

  if (!result.success || !result.stats) {
    return (
      <div className="border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر جلب بيانات لوحة التحكم"}
      </div>
    );
  }

  const { stats } = result;

  const metrics = [
    {
      label: "الإيرادات المكتملة",
      value: `${stats.totalRevenue} د.أ`,
      note: "من المعاملات المكتملة",
      icon: Banknote,
    },
    {
      label: "طلبات نشطة",
      value: stats.pendingBookingsCount,
      note: "بانتظار أو قيد التنفيذ",
      icon: CalendarClock,
    },
    {
      label: "حجوزات مكتملة",
      value: stats.completedBookingsCount,
      note: "طلبات وصلت للنهاية",
      icon: CheckCircle2,
    },
    {
      label: "المستخدمون",
      value: stats.totalUsersCount,
      note: "إجمالي الحسابات",
      icon: UsersRound,
    },
  ];

  const shortcuts = [
    {
      href: "/admin/listings",
      title: "عروض الخدمات",
      copy: "راجع العروض قبل ظهورها للمستخدمين.",
      icon: Store,
    },
    {
      href: "/admin/bookings",
      title: "الحجوزات",
      copy: "تابع الطلبات اللي تحتاج تدخل أو مراجعة.",
      icon: CalendarClock,
    },
    {
      href: "/admin/users",
      title: "المستخدمون والصلاحيات",
      copy: "راجع الحسابات والأدوار والصلاحيات.",
      icon: UsersRound,
    },
    {
      href: "/admin/audit-logs",
      title: "سجلات الأمان",
      copy: "راجع الأحداث الإدارية والحساسة.",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="space-y-9">
      <header className="max-w-3xl border-b border-theme pb-6">
        <p className="text-[10px] font-bold text-brand">لوحة الإدارة</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] sm:text-4xl">
          شو وضع جسر اليوم؟
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          أهم الأرقام والمهام اللي تحتاج انتباهك، بدون زحمة مؤشرات ما إلها داعي.
        </p>
      </header>

      <section>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, note, icon: Icon }) => (
            <article key={label} className="border-b border-theme pb-5 xl:border-b-0 xl:border-e xl:pe-6 last:border-0">
              <div className="flex items-center gap-2 text-muted">
                <Icon size={15} />
                <span className="text-[10px] font-bold">{label}</span>
              </div>

              <strong className="mt-3 block text-3xl font-bold tracking-[-.035em]">
                {value}
              </strong>

              <p className="mt-1 text-[10px] text-muted">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">المراجعة اليومية</p>
            <h2 className="mt-1 text-xl font-bold">ابدأ من هون</h2>
          </div>
        </div>

        <div className="divide-y divide-theme border-y border-theme">
          {shortcuts.map(({ href, title, copy, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 py-4 transition hover:bg-surface-muted/60 sm:px-2"
            >
              <Icon size={18} className="shrink-0 text-brand" />

              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{title}</strong>
                <span className="mt-1 block text-[10px] leading-5 text-muted">
                  {copy}
                </span>
              </span>

              <ArrowLeft
                size={14}
                className="shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-brand"
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
