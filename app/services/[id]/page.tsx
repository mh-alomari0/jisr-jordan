import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceDetailAction } from "@/lib/actions/service-detail";
import { getServiceReviewsAction } from "@/lib/actions/reviews";
import ServiceReviews from "@/components/service-reviews";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getServiceDetailAction(id);
  if (!result.success || !result.service) {
    return { title: "الخدمة غير موجودة | جسر الأردن" };
  }
  return {
    title: `${result.service.title} | جسر الأردن`,
    description: result.service.description || "تفاصيل وحجز الخدمة",
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [serviceRes, reviewsRes] = await Promise.all([
    getServiceDetailAction(id),
    getServiceReviewsAction(id),
  ]);

  if (!serviceRes.success || !serviceRes.service) {
    notFound();
  }

  const service = serviceRes.service;
  const reviews = reviewsRes.reviews || [];
  const averageRating = reviewsRes.averageRating || 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8 dir-rtl text-right">
      {/* رأس الصفحة وزر العودة */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
            {service.category || "عام"}
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{service.title}</h1>
        </div>
        <Link
          href="/services"
          className="text-xs text-gray-600 hover:text-black transition-colors"
        >
          ← العودة لدليل الخدمات
        </Link>
      </div>

      {/* تفاصيل التكلفة والحجز */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <p className="text-gray-700 text-sm leading-relaxed">
            {service.description || "لا يوجد وصف إضافي محدد لهذه الخدمة."}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
            <span>متوسط التقييم العام:</span>
            <span className="text-yellow-500 font-bold">★ {averageRating}</span>
          </div>
        </div>

        <div className="bg-gray-50 border p-5 rounded-xl text-center w-full md:w-64 shrink-0 space-y-3">
          <div>
            <span className="text-xs text-gray-500 block">التكلفة الإجمالية</span>
            <span className="text-3xl font-black text-green-700">{service.price} د.أ</span>
          </div>

          <Link
            href={`/booking?serviceId=${service.id}`}
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors block text-center"
          >
            احجز الموعد الآن
          </Link>
        </div>
      </div>

      {/* قسم التقييمات والمراجعات */}
      <ServiceReviews
        serviceId={service.id}
        initialReviews={reviews}
        initialAverage={averageRating}
      />
    </div>
  );
}