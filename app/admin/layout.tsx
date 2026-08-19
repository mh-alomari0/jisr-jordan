import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const links = [
  ["/admin", "نظرة عامة"],
  ["/admin/categories", "التصنيفات"],
  ["/admin/listings", "عروض المزودين"],
  ["/admin/quotes", "عروض الأسعار"],
  ["/admin/content", "مراجعة المحتوى"],
  ["/admin/commissions", "العمولات"],
  ["/admin/services", "الخدمات المنزلية"],
  ["/admin/users", "المستخدمون والصلاحيات"],
  ["/admin/bookings", "الحجوزات والطلبات"],
  ["/admin/providers", "مقدمو الخدمة"],
  ["/admin/payments", "المدفوعات"],
  ["/admin/audit-logs", "سجلات الأمان"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admin");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) redirect("/");

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <aside className="w-full border-b border-theme bg-surface p-4 md:w-64 md:border-b-0 md:border-l md:p-6">
        <div className="border-b border-theme pb-4">
          <Link href="/admin" className="text-lg font-black"><span className="text-brand">جسر</span> | الإدارة</Link>
          <p className="mt-1 text-xs text-muted">تشغيل السوق والمراجعة</p>
        </div>
        <nav aria-label="لوحة الإدارة" className="mt-4 flex gap-2 overflow-x-auto text-xs font-bold md:flex-col md:gap-1 md:overflow-visible md:text-sm">
          {links.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-lg p-2.5 transition hover:bg-surface-muted hover:text-brand">{label}</Link>)}
          <div className="hidden border-t border-theme pt-4 md:block"><Link href="/" className="secondary-button w-full !px-3">العودة للسوق</Link></div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-x-hidden p-2 md:p-6">{children}</div>
    </div>
  );
}
