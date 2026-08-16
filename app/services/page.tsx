"use client";

import React, { useEffect, useState } from "react";
import { getServicesAction, ServiceItem } from "@/lib/actions/services";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadServices() {
      const res = await getServicesAction();
      if (res.success && res.services) {
        setServices(res.services);
      }
      setLoading(false);
    }
    loadServices();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">خدماتنا المتاحة</h1>
        <p className="text-slate-500 mt-2">اختر الخدمة المناسبة واحجز مواعيدك بكل سهولة وأمان</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">جاري تحميل الخدمات...</div>
      ) : services.length === 0 ? (
        <div className="py-12 text-center text-slate-500">لا توجد خدمات متاحة حالياً.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
                <p className="text-sm text-slate-500">{service.description || "خدمة صيانة منزلية احترافية"}</p>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="font-bold text-slate-900">{service.price} د.أ</span>
                <Link
                  href={`/booking?serviceId=${service.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700"
                >
                  احجز الآن
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}