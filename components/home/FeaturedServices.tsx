"use client";

import React, { useEffect, useState } from "react";
import { getServicesAction, ServiceItem } from "@/lib/actions/services";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FeaturedServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadServices() {
      const res = await getServicesAction();
      if (res.success && res.services) {
        setServices(res.services.slice(0, 3));
      }
      setLoading(false);
    }
    loadServices();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-slate-400">جاري تحميل أحدث الخدمات...</div>;
  }

  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">الخدمات الأكثر طلباً</h2>
            <p className="text-sm text-slate-500 mt-1">خدمات معتمدة ومضمونة مع أفضل الفنيين في الأردن</p>
          </div>
          <Link href="/services" className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            عرض الكل <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">{service.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{service.description || "خدمة ممتازة ومضمونة"}</p>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-slate-900">{service.price} د.أ</span>
                <Link
                  href={`/booking?serviceId=${service.id}`}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  حجز مباشر
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}