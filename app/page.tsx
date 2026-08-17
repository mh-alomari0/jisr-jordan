import Link from "next/link";
import { searchServicesAction } from "@/lib/actions/services-search";

export default async function HomePage() {
  const result = await searchServicesAction();
  const featuredServices = (result.services || []).slice(0, 3);

  return (
    <div className="space-y-16 pb-12 dir-rtl text-right">
      {/* القسم الرئيسي (Hero Section) */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <span className="bg-blue-600/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30">
            المنصة المركزية للخدمات والصيانة في الأردن
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            احجز أفضل الفنيين والخدمات المنزلية بسرعة وأمان
          </h1>
          <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto">
            من الكهرباء والسباكة إلى التكييف والتنظيف، نوصلك بأفضل الكوادر المعتمدة مع خيارات دفع إلكتروني آمنة.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/services"
              className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm"
            >
              استعراض جميع الخدمات
            </Link>
            <Link
              href="/bookings"
              className="bg-gray-700/60 text-white font-medium px-8 py-3 rounded-xl hover:bg-gray-700 transition-colors text-sm border border-gray-600"
            >
              متابعة حجوزاتي
            </Link>
          </div>
        </div>
      </section>

      {/* قسم الفئات المتاحة */}
      <section className="container mx-auto px-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">تصفح حسب فئة الخدمة</h2>
          <p className="text-gray-500 text-xs">خدمات متنوعة تغطي كافة احتياجاتك المنزلية</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "كهرباء", icon: "⚡", cat: "ELECTRICITY" },
            { title: "سباكة", icon: "🚰", cat: "PLUMBING" },
            { title: "تكييف وتبريد", icon: "❄️", cat: "HVAC" },
            { title: "تنظيف ونظافة", icon: "🧹", cat: "CLEANING" },
          ].map((c) => (
            <Link
              key={c.cat}
              href={`/services?category=${c.cat}`}
              className="p-6 bg-white border rounded-2xl text-center shadow-sm hover:border-black transition-all space-y-2 block"
            >
              <div className="text-3xl">{c.icon}</div>
              <h3 className="font-bold text-sm text-gray-900">{c.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* قسم الخدمات المميزة */}
      {featuredServices.length > 0 && (
        <section className="container mx-auto px-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">أبرز الخدمات المتاحة</h2>
              <p className="text-gray-500 text-xs mt-0.5">الخدمات الأكثر طلباً وموثوقية</p>
            </div>
            <Link href="/services" className="text-xs text-blue-600 font-semibold hover:underline">
              عرض الكل ←
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredServices.map((srv) => (
              <div key={srv.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {srv.category || "عام"}
                  </span>
                  <h3 className="font-bold text-lg text-gray-900">{srv.title}</h3>
                  {srv.description && <p className="text-xs text-gray-600 line-clamp-2">{srv.description}</p>}
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-lg font-black text-green-700">{srv.price} د.أ</span>
                  <Link
                    href={`/services/${srv.id}`}
                    className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
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