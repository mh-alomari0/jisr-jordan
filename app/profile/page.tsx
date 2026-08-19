import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  Heart,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getUserProfileAction } from "@/lib/actions/profile";
import ProfileClient from "./_components/profile-client";

export const metadata = {
  title: "الملف الشخصي | جسر الأردن",
};

const links = [
  ["/bookings", "حجوزاتي", "طلباتك الحالية والسابقة", CalendarDays],
  ["/messages", "الرسائل", "محادثاتك مع مقدمي الخدمة", MessageCircle],
  ["/favorites", "المفضلة", "الخدمات والأشخاص المحفوظون", Heart],
  ["/notifications", "الإشعارات", "التحديثات وتنبيهات الهاتف", Bell],
  ["/forgot-password", "الأمان والخصوصية", "إدارة كلمة المرور والحماية", ShieldCheck],
  ["/faq", "المساعدة", "الأسئلة الشائعة والدعم", CircleHelp],
] as const;

export default async function ProfilePage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-[rgb(var(--danger))]">
          {result.error || "تعذر تحميل الملف الشخصي"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative flex items-end gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <UserRound size={25} />
          </span>

          <div>
            <p className="text-[10px] font-bold text-[#c9eee8]">
              حسابك على جسر
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
              خلي حسابك
              <span className="text-[#ffc985]"> يشبهك.</span>
            </h1>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <ProfileClient initialProfile={result.profile} />

        <aside>
          <div className="mb-4">
            <p className="text-[10px] font-bold text-brand">
              اختصارات الحساب
            </p>
            <h2 className="mt-1 text-xl font-bold">
              كل شيء قريب منك
            </h2>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
            {links.map(([href, label, description, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-20 items-center gap-3 border-b border-theme px-4 transition last:border-b-0 hover:bg-surface-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                  <Icon size={18} />
                </span>

                <span className="min-w-0">
                  <strong className="block text-sm">
                    {label}
                  </strong>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
