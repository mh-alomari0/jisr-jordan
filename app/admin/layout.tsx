import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admin");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row dir-rtl">
      {/* القائمة الجانبية للوحة التحكم */}
      <aside className="w-full md:w-64 bg-white border-l p-6 space-y-6">
        <div className="border-b pb-4">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            جسر | لوحة التحكم
          </Link>
          <p className="text-xs text-gray-500 mt-1">نظام الإدارة المركزية</p>
        </div>

        <nav className="flex flex-col space-y-2 text-sm font-medium">
          <Link
            href="/admin/services"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            إدارة الخدمات والأسعار
          </Link>
          <Link
            href="/admin/users"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            إدارة المستخدمين والصلاحيات
          </Link>
          <Link
            href="/admin/bookings"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            تتبع وإدارة الحجوزات
          </Link>
          <Link
            href="/admin/providers"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            إدارة مقدمي الخدمة
          </Link>
          <Link
            href="/admin/payments"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            سجل المدفوعات
          </Link>
          <Link
            href="/admin/audit-logs"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-red-700"
          >
            سجلات الأحداث والأمان
          </Link>
          <div className="pt-4 border-t">
            <Link
              href="/provider"
              className="p-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors block text-center"
            >
              الانتقال لبوابة المزودين
            </Link>
          </div>
        </nav>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-2 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
