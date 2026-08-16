import { getProviderBookingsAction } from "@/lib/actions/provider";
import ProviderBookingCard from "./_components/provider-booking-card";

export const metadata = {
  title: "بوابة مزودي الخدمة | جسر الأردن",
};

export default async function ProviderDashboardPage() {
  const result = await getProviderBookingsAction();

  if (!result.success || !result.bookings) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{result.error || "تعذر تحميل لوحة تحكم المزود"}</p>
      </div>
    );
  }

  const bookings = result.bookings;

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">بوابة مزودي الخدمة</h1>
        <p className="text-gray-600 text-sm">إدارة الطلبات الموكلة وتحديث حالة الأعمال الحالية</p>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
          لا توجد حجوزات موكلة إليك حالياً.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking: any) => (
            <ProviderBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}