import { getAdminBookingsAction } from "@/lib/actions/admin-bookings";
import AdminBookingsClient from "./_components/admin-bookings-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة وتتبع الحجوزات | لوحة التحكم",
};

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const result = await getAdminBookingsAction(page);

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
      <AdminPagination path="/admin/bookings" page={result.page || page} hasMore={Boolean(result.hasMore)} />
    </div>
  );
}
