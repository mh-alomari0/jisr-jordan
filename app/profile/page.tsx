import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  ChevronLeft,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
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
        label: "سجل الطلبات",
        desc: "متابعة الطلبات الجارية والمكتملة",
        icon: CalendarDays,
        tone: "bg-[#e1f3ef] text-[#087f79]",
      },
      {
        href: "/messages",
        label: "الرسائل والمحادثات",
        desc: "تواصلك مع مقدمي الخدمة",
        icon: MessageCircle,
        tone: "bg-[#e0effe] text-[#0284c7]",
      },
      {
        href: "/favorites",
        label: "المفضلة والمحفوظات",
        desc: "الخدمات والمحترفون المفضلون لديك",
        icon: Heart,
        tone: "bg-[#fce7f3] text-[#db2777]",
      },
      {
        href: "/notifications",
        label: "الإشعارات والتنبيهات",
        desc: "تحديثات الحجز والعروض الجديدة",
        icon: Bell,
        tone: "bg-[#fef3c7] text-[#d97706]",
      },
    ],
  },
  {
    title: "الحساب والأمان",
    items: [
      {
        href: "/forgot-password",
        label: "الأمان وكلمة المرور",
        desc: "إدارة الحماية وجلسات تسجيل الدخول",
        icon: ShieldCheck,
        tone: "bg-[#f3e8ff] text-[#9333ea]",
      },
      {
        href: "/faq",
        label: "مركز المساعدة والدعم",
        desc: "الأسئلة الشائعة وتواصل مع فريق جسر",
        icon: CircleHelp,
        tone: "bg-[#f1f5f9] text-[#475569]",
      },
    ],
  },
];

export default async function ProfilePage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
          {result.error || "تعذر تحميل الملف الشخصي"}
        </div>
      </main>
    );
  }

  const profile = result.profile;
  const roleLabel = profile.role === "STAFF" ? "مقدم خدمة" : profile.role === "ADMIN" ? "مدير نظام" : "عضو معتمد";

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 space-y-7">
      {/* 🪪 Digital Member Card */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#065559] via-[#087f79] to-[#0ba59d] p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-[10%] h-60 w-60 rounded-full bg-[#ffc985]/15 blur-xl" />

        <div className="relative flex flex-col justify-between min-h-[160px] sm:min-h-[180px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black text-white shadow-inner backdrop-blur-md">
                {profile.full_name?.slice(0, 1) || "ج"}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-black sm:text-2xl">
                    {profile.full_name || "مستخدم جسر"}
                  </h1>
                  <ShieldCheck className="h-4 w-4 text-[#73eedc]" />
                </div>
                <p className="text-xs text-[#c9eee8] mt-0.5" dir="ltr">
                  {profile.phone || profile.email}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black text-[#ffc985] backdrop-blur-md">
              <Sparkles size={12} />
              {roleLabel}
            </span>
          </div>

          <div className="flex items-end justify-between border-t border-white/15 pt-4 text-[10px] sm:text-xs text-white/80">
            <div>
              <span className="block opacity-75">رقم العضوية</span>
              <strong className="font-mono tracking-wider text-white">
                #JISR-{profile.id.slice(0, 6).toUpperCase()}
              </strong>
            </div>

            <div>
              <span className="block opacity-75">حالة الحساب</span>
              <strong className="text-[#73eedc] font-black">نشط وموثق ✓</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <ProfileClient initialProfile={result.profile} />
          <AccountActions />
        </div>

        {/* 📱 iOS-Style Settings Groups */}
        <aside className="space-y-6">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2.5 ps-2 text-[11px] font-black text-brand tracking-wide">
                {group.title}
              </p>

              <div className="surface-card overflow-hidden !rounded-3xl">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3.5 border-b border-theme/60 p-3.5 sm:p-4 transition last:border-b-0 hover:bg-surface-muted active:scale-[0.99]"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.tone} shadow-sm`}
                      >
                        <Icon size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs font-black sm:text-sm">
                          {item.label}
                        </strong>
                        <span className="mt-0.5 block truncate text-[10px] text-muted">
                          {item.desc}
                        </span>
                      </div>

                      <ChevronLeft size={16} className="text-muted shrink-0 opacity-60" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}