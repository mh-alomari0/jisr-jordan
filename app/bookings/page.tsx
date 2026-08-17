import { getCustomerBookingsAction } from "@/lib/actions/customer-bookings";
import CustomerBookingsClient, { CustomerBookingItem } from "./_components/customer-bookings-client";

export const metadata = {
  title: "حجوزاتي | جسر الأردن",
};

export default async function CustomerBookingsPage() {
  const result = await getCustomerBookingsAction();

  if (!result.success || !result.bookings) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl my-6 container mx-auto">
        <p>{result.error || "تعذر تحميل قائمة الحجوزات"}</p>
      </div>
    );
  }

  const typedBookings = result.bookings as unknown as CustomerBookingItem[];

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">سجل الحجوزات والطلبات</h1>
        <p className="text-gray-600 text-sm">متابعة حالة الطلبات المباشرة، المواعيد، وتفاصيل الخدمة</p>
      </div>

      <CustomerBookingsClient initialBookings={typedBookings} />
    </div>
  );
}