import Link from "next/link";
import { getAdminDashboardStatsAction } from "@/lib/actions/admin-dashboard";

export const metadata = {
  title: "نظرة عامة والتقارير | لوحة التحكم",
};

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStatsAction();

  if (!result.success || !result.stats) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر جلب بيانات لوحة التحكم"}</p>
      </div>
    );
  }

  const { stats } = result;

  return (
    <div className="container mx-auto p-6 space-y-8 dir-rtl text-right">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">نظرة عامة ومؤشرات الأداء</h1>
        <p className="text-gray-600 text-sm">متابعة المبيعات الحالية، نشاط الحجوزات، وأعداد المستخدمين</p>
      </div>

      {/* بطاقات المؤشرات (KPI Cards) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500">إجمالي الإيرادات المكتملة</p>
          <p className="text-3xl font-black text-green-600">{stats.totalRevenue} د.أ</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500">الطلبات النشطة (قيد التنفيذ / الانتظار)</p>
          <p className="text-3xl font-black text-blue-600">{stats.pendingBookingsCount}</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500">الحجوزات المكتملة بنجاح</p>
          <p className="text-3xl font-black text-gray-900">{stats.completedBookingsCount}</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500">إجمالي المستخدمين المسجلين</p>
          <p className="text-3xl font-black text-purple-600">{stats.totalUsersCount}</p>
        </div>
      </div>

      {/* روابط الوصول السريع */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b pb-3">إجراءات سريعة</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/services"
            className="p-4 border rounded-lg hover:border-black transition-colors block text-center font-medium text-sm"
          >
            إدارة الخدمات والأسعار ←
          </Link>
          <Link
            href="/admin/bookings"
            className="p-4 border rounded-lg hover:border-black transition-colors block text-center font-medium text-sm"
          >
            إدارة وتتبع الحجوزات ←
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border rounded-lg hover:border-black transition-colors block text-center font-medium text-sm"
          >
            إدارة الصلاحيات والمستخدمين ←
          </Link>
        </div>
      </div>
    </div>
  );
}