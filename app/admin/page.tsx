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
      <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر جلب بيانات لوحة التحكم"}
      </div>
    );
  }

  const { stats } = result;

  const metrics = [
    {
      label: "الإيرادات المكتملة",
      value: `${stats.totalRevenue} د.أ`,
      note: "إجمالي المعاملات المكتملة",
      icon: Banknote,
      tone:
        "bg-[rgb(var(--success)/0.11)] text-[rgb(var(--success))]",
    },
    {
      label: "طلبات نشطة",
      value: stats.pendingBookingsCount,
      note: "انتظار أو قيد التنفيذ",
      icon: CalendarClock,
      tone:
        "bg-[rgb(var(--category-tech)/0.11)] text-[rgb(var(--category-tech))]",
    },
    {
      label: "حجوزات مكتملة",
      value: stats.completedBookingsCount,
      note: "طلبات وصلت للنهاية",
      icon: CheckCircle2,
      tone:
        "bg-[rgb(var(--primary-soft))] text-brand",
    },
    {
      label: "المستخدمون",
      value: stats.totalUsersCount,
      note: "إجمالي الحسابات المسجلة",
      icon: UsersRound,
      tone:
        "bg-[rgb(var(--category-education)/0.11)] text-[rgb(var(--category-education))]",
    },
  ];

  const shortcuts = [
    {
      href: "/admin/listings",
      title: "مراجعة عروض الخدمات",
      copy: "راجع ما يرسله مقدمو الخدمة قبل ظهوره في السوق.",
      icon: Store,
    },
    {
      href: "/admin/bookings",
      title: "متابعة الحجوزات",
      copy: "راقب الحالات والمشاكل التشغيلية للطلبات.",
      icon: CalendarClock,
    },
    {
      href: "/admin/users",
      title: "المستخدمون والصلاحيات",
      copy: "إدارة الحسابات والأدوار بدون خلطها مع تجربة العميل.",
      icon: UsersRound,
    },
    {
      href: "/admin/audit-logs",
      title: "مراجعة سجلات الأمان",
      copy: "تتبع الأحداث الإدارية والحساسة في النظام.",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white shadow-[0_24px_65px_rgba(13,90,84,0.14)] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="absolute -bottom-24 left-[45%] h-52 w-52 rounded-full bg-[#ffc985]/15" />

        <div className="relative max-w-3xl">
          <p className="text-[10px] font-bold tracking-[.08em] text-[#c9eee8]">
            مركز تشغيل جسر
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-5xl">
            شوف السوق كامل،
            <span className="text-[#ffc985]"> واتخذ القرار بسرعة.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            مؤشرات الأداء والمراجعة والتشغيل في مكان واحد بدون ما نخلط
            لوحة الإدارة مع تجربة العميل أو مقدم الخدمة.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold text-brand">
            مؤشرات الأداء
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            الصورة الحالية
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(
            ({ label, value, note, icon: Icon, tone }) => (
              <article
                key={label}
                className="rounded-[1.7rem] border border-theme bg-surface p-5 shadow-soft"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}
                >
                  <Icon size={17} />
                </span>

                <strong className="mt-5 block text-2xl font-bold tracking-[-.035em]">
                  {value}
                </strong>

                <p className="mt-1 text-xs font-bold">
                  {label}
                </p>

                <p className="mt-1 text-[9px] text-muted">
                  {note}
                </p>
              </article>
            ),
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold text-brand">
            إجراءات سريعة
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            شو بدك تراجع الآن؟
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map(
            ({ href, title, copy, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-4 rounded-[1.7rem] border border-theme bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.35)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                  <Icon size={18} />
                </span>

                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">
                    {title}
                  </strong>

                  <span className="mt-1 block text-[10px] leading-5 text-muted">
                    {copy}
                  </span>
                </span>

                <ArrowLeft
                  size={14}
                  className="mt-1 shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-brand"
                />
              </Link>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
