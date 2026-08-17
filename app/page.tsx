import Link from "next/link";
import { searchServicesAction } from "@/lib/actions/services-search";
import { getPublicMetricsAction } from "@/lib/actions/public-metrics";

export default async function HomePage() {
  const [servicesResult, metricsResult] = await Promise.all([
    searchServicesAction(),
    getPublicMetricsAction(),
  ]);

  const featuredServices = (servicesResult.services || []).slice(0, 3);
  const metrics = metricsResult.metrics;

  return (
    <div className="space-y-12 pb-16 dir-rtl text-right">
      {/* القسم الرئيسي (Hero Section) */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 text-white py-16 px-4 md:px-8">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-blue-400/30">
            منصة الصيانة والخدمات المركزية في الأردن
          </span>

          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
            احجز أفضل الفنيين المعتمدين لخدمتك في دقائق
          </h1>

          <p className="text-gray-300 text-xs md:text-base max-w-2xl mx-auto leading-relaxed">
            من أعمال الكهرباء والسباكة إلى التكييف والتنظيف الشامل، نربطك بكوادر احترافية مع ضمان شفافية الأسعار ودقة المواعيد.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/services"
              className="w-full sm:w-auto bg-white text-gray-900 font-bold px-7 py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm shadow-sm text-center"
            >
              استعراض كافة الخدمات
            </Link>
            <Link
              href="/bookings"
              className="w-full sm:w-auto bg-gray-800 text-white font-medium px-7 py-3 rounded-xl hover:bg-gray-700 transition-colors text-sm border border-gray-700 text-center"
            >
              متابعة حجوزاتي
            </Link>
          </div>
        </div>
      </section>

      {/* مؤشرات الأداء الحقيقية (Dynamic System Metrics) */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-3 md:gap-6 bg-white border rounded-2xl p-4 md:p-6 shadow-sm text-center">
          <div>
            <p className="text-2xl md:text-4xl font-black text-gray-900">
              {metrics.completedBookingsCount}
            </p>
            <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-1">طلب مكتمل بنجاح</p>
          </div>
          <div className="border-r border-l px-2">
            <p className="text-2xl md:text-4xl font-black text-blue-600">
              {metrics.activeServicesCount}
            </p>
            <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-1">خدمة متخصصة متاحة</p>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-black text-green-600">
              {metrics.activeProvidersCount}
            </p>
            <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-1">فني ومزود خدمة معتمد</p>
          </div>
        </div>
      </section>

      {/* قسم الفئات المتاحة */}
      <section className="container mx-auto px-4 space-y-4">
        <div className="text-right">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">تصنيفات الخدمات</h2>
          <p className="text-gray-500 text-xs">اختر الفئة المناسبة لبدء الحجز المباشر</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: "كهرباء", icon: "⚡", cat: "ELECTRICITY" },
            { title: "سباكة", icon: "🚰", cat: "PLUMBING" },
            { title: "تكييف وتبريد", icon: "❄️", cat: "HVAC" },
            { title: "تنظيف شامل", icon: "🧹", cat: "CLEANING" },
          ].map((c) => (
            <Link
              key={c.cat}
              href={`/services?category=${c.cat}`}
              className="p-5 bg-white border rounded-xl text-center shadow-sm hover:border-black transition-all space-y-2 block"
            >
              <div className="text-2xl md:text-3xl">{c.icon}</div>
              <h3 className="font-bold text-xs md:text-sm text-gray-900">{c.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* قسم أبرز الخدمات المميزة */}
      {featuredServices.length > 0 && (
        <section className="container mx-auto px-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">أحدث الخدمات</h2>
              <p className="text-gray-500 text-xs">خدمات جاهزة للحجز الفوري</p>
            </div>
            <Link href="/services" className="text-xs text-blue-600 font-bold hover:underline">
              عرض الكل ←
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featuredServices.map((srv) => (
              <div
                key={srv.id}
                className="bg-white border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {srv.category || "عام"}
                  </span>
                  <h3 className="font-bold text-base text-gray-900">{srv.title}</h3>
                  {srv.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {srv.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-base font-black text-green-700">{srv.price} د.أ</span>
                  <Link
                    href={`/services/${srv.id}`}
                    className="bg-black text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                  >
                    التفاصيل والحجز
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}