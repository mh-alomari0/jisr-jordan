import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Star, ArrowRight, ShieldCheck } from "lucide-react";
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
    description: result.service.description || "تفاصيل وحجز الخدمة بسهولة وأمان",
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
  const reviewsCount = reviews.length;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-8 dir-rtl text-right">
      {/* رأس الصفحة وزر العودة */}
      <div className="flex justify-between items-center border-b pb-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
            {service.category || "عام"}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 pt-1">
            {service.title}
          </h1>
        </div>
        <Link
          href="/services"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-black transition-colors bg-slate-100 px-3 py-1.5 rounded-lg"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للخدمات</span>
        </Link>
      </div>

      {/* تفاصيل التكلفة والحجز والضمان */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-xl">
          <p className="text-slate-700 text-sm leading-relaxed">
            {service.description || "نقدم لكم أفضل خدمات الصيانة تحت شعار السرعة والجودة المضمونة في جميع المناطق."}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Star className="w-4 h-4 text-amber-500 fill-current" />
            <span className="font-bold text-slate-800">{averageRating.toFixed(1)}</span>
            <span className="text-slate-400">({reviewsCount} تقييم)</span>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>فنيون معتمدون ومفحوصون أمنياً</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ضمان على جودة التنفيذ وشفافية الأسعار</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center w-full md:w-64 shrink-0 space-y-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">التكلفة الإجمالية</span>
            <span className="text-3xl font-black text-emerald-700">{service.price} د.أ</span>
          </div>

          <Link
            href={`/booking?serviceId=${service.id}`}
            className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors block text-center shadow-sm"
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