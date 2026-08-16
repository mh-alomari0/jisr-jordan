import { getProviderScheduleAction } from "@/lib/actions/provider-schedule";
import ProviderScheduleClient from "./_components/provider-schedule-client";

export const metadata = {
  title: "إدارة أوقات العمل | بوابة المزودين",
};

export default async function ProviderSchedulePage() {
  const result = await getProviderScheduleAction();

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة جدول أوقات العمل</h1>
        <p className="text-gray-600 text-sm">حدد الأيام وساعات العمل المتاحة لتلقي طلبات الحجز الجديدة</p>
      </div>

      <ProviderScheduleClient initialSchedule={result.schedule || []} />
    </div>
  );
}