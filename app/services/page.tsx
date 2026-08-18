import { getServicesAction } from "@/lib/actions/services";
import ServicesClient from "./_components/services-client";

export const metadata = {
  title: "الخدمات | جسر الأردن",
  description: "تصفح واحجز خدمات الصيانة المنزلية الاحترافية في الأردن",
};

export default async function ServicesPage() {
  const result = await getServicesAction();
  const initialServices = result.services || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">خدمات الصيانة المنزلية</h1>
        <p className="text-sm text-gray-500 mt-1">
          تصفح الخدمات المتاحة واحجز ما يناسبك بأسعار شفافة وجودة مضمونة
        </p>
      </div>

      <ServicesClient initialServices={initialServices} />
    </div>
  );
}
