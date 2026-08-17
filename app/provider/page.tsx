import { getProviderBookingsAction } from "@/lib/actions/provider-bookings";
import ProviderBookingsClient from "./_components/provider-bookings-client";

export const metadata = {
  title: "الطلبات الحالية والحجوزات | بوابة المزودين",
};

export default async function ProviderDashboardPage() {
  const result = await getProviderBookingsAction();

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر تحميل طلبات بوابة المزودين"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة الطلبات الموكلة بالحرفيين</h1>
        <p className="text-gray-600 text-sm">متابعة طلبات الحجز الواردة وتحديث حالة التنفيذ فورياً</p>
      </div>

      <ProviderBookingsClient initialBookings={result.bookings || []} />
    </div>
  );
}