import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  ChevronLeft,
  Heart,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { getUserProfileAction } from "@/lib/actions/profile";
import ProfileClient from "./_components/profile-client";
import AccountActions from "./_components/account-actions";

export const metadata = {
  title: "الملف الشخصي | جسر الأردن",
};

const settingsGroups = [
  {
    title: "نشاطك على جسر",
    items: [
      {
        href: "/bookings",
        label: "الطلبات",
        desc: "تابع الطلبات الجارية والسابقة",
        icon: CalendarDays,
      },
      {
        href: "/messages",
        label: "الرسائل",
        desc: "محادثاتك مع مقدمي الخدمة",
        icon: MessageCircle,
      },
      {
        href: "/favorites",
        label: "المفضلة",
        desc: "الخدمات ومقدمو الخدمة المحفوظون",
        icon: Heart,
      },
      {
        href: "/notifications",
        label: "الإشعارات",
        desc: "تحديثات الحجز والعروض والحساب",
        icon: Bell,
      },
    ],
  },
  {
    title: "الحساب والمساعدة",
    items: [
      {
        href: "/forgot-password",
        label: "كلمة المرور",
        desc: "تغيير كلمة المرور واستعادة الوصول",
        icon: ShieldCheck,
      },
      {
        href: "/faq",
        label: "مركز المساعدة",
        desc: "الأسئلة الشائعة والدعم",
        icon: CircleHelp,
      },
    ],
  },
];

export default async function ProfilePage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
          {result.error || "تعذر تحميل الملف الشخصي"}
        </div>
      </main>
    );
  }

  const profile = result.profile;

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
      <header className="border-b border-theme pb-5">
        <p className="text-[11px] font-bold text-brand">حسابك</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-lg font-bold text-brand">
              {profile.full_name?.slice(0, 1) || "ج"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">
                {profile.full_name || "مستخدم جسر"}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted" dir="ltr">
                {profile.phone || profile.email}
              </p>
            </div>
          </div>

          <span className="text-[11px] text-muted">
            رقم الحساب: {profile.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <ProfileClient initialProfile={result.profile} />
          <AccountActions />
        </div>

        <aside className="space-y-6">
          {settingsGroups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 text-xs font-bold text-muted">
                {group.title}
              </h2>

              <div className="overflow-hidden rounded-2xl border border-theme bg-surface">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 border-b border-theme p-4 transition-colors last:border-b-0 hover:bg-surface-muted"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand">
                        <Icon size={17} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm font-bold">
                          {item.label}
                        </strong>
                        <span className="mt-0.5 block truncate text-[11px] text-muted">
                          {item.desc}
                        </span>
                      </div>

                      <ChevronLeft size={15} className="shrink-0 text-muted" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
}
