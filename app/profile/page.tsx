import { getUserProfileAction } from "@/lib/actions/profile";
import ProfileClient from "./_components/profile-client";
import Link from "next/link";
import { Bell, CalendarDays, CircleHelp, Heart, MessageCircle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "الملف الشخصي | جسر الأردن",
};

export default async function ProfilePage() {
  const result = await getUserProfileAction();

  if (!result.success || !result.profile) {
    return (
      <div className="container mx-auto my-6 border border-theme bg-surface p-8 text-center text-[rgb(var(--danger))]">
        <p>{result.error || "تعذر تحميل الملف الشخصي"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-sm text-muted">إدارة معلومات الحساب والعنوان الافتراضي والتواصل</p>
      </div>

      <ProfileClient initialProfile={result.profile} />
      <section aria-labelledby="account-links" className="mx-auto w-full max-w-xl"><h2 id="account-links" className="mb-3 text-lg font-black">حسابي وإعداداتي</h2><div className="grid overflow-hidden rounded-3xl border border-theme bg-surface sm:grid-cols-2">
        {[
          ["/bookings", "حجوزاتي", CalendarDays], ["/messages", "الرسائل", MessageCircle],
          ["/favorites", "المفضلة", Heart], ["/notifications", "الإشعارات", Bell],
          ["/forgot-password", "الأمان والخصوصية", ShieldCheck], ["/faq", "المساعدة والأسئلة", CircleHelp],
        ].map(([href, label, Icon]) => <Link key={String(href)} href={String(href)} className="flex min-h-14 items-center gap-3 border-b border-theme px-4 text-sm font-bold hover:bg-surface-muted sm:border-l"><Icon className="h-5 w-5 text-brand" aria-hidden="true" />{String(label)}</Link>)}
      </div></section>
    </div>
  );
}
