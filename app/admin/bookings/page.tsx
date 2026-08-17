import { getAdminBookingsAction } from "@/lib/actions/admin-bookings";
import AdminBookingsClient from "./_components/admin-bookings-client";

export const metadata = {
  title: "إدارة وتتبع الحجوزات | لوحة التحكم",
};

export default async function AdminBookingsPage() {
  const result = await getAdminBookingsAction();

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر تحميل قائمة الحجوزات"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة الحجوزات والطلبات المركزية</h1>
        <p className="text-gray-600 text-sm">متابعة كافة طلبات المنصة، حالة الدفع، والتحكم المباشر في حالة الحجز</p>
      </div>

      <AdminBookingsClient initialBookings={result.bookings || []} />
    </div>
  );
}