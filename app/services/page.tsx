import { searchServicesAction } from "@/lib/actions/services-search";
import ServicesClient from "./_components/services-client";

export const metadata = {
  title: "دليل الخدمات والصيانة | جسر الأردن",
};

export default async function ServicesPage() {
  const result = await searchServicesAction();

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">دليل الخدمات والأعمال</h1>
        <p className="text-gray-600 text-sm">استعرض خدمات الصيانة المنزلية والاحترافية المتاحة واحجز موعدك فوراً</p>
      </div>

      <ServicesClient initialServices={result.services || []} />
    </div>
  );
}