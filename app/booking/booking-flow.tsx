"use client";

import React, { useState, useMemo } from "react";

interface Service {
  id: string;
  title: string;
  price?: number;
}

const SERVICES: Service[] = [
  { id: "1", title: "صيانة الكهرباء", price: 25 },
  { id: "2", title: "صيانة السباكة", price: 20 },
];

interface BookingFlowProps {
  initialServiceId?: string;
}

export default function BookingFlow({ initialServiceId }: BookingFlowProps) {
  // تهيئة الخدمة المحددة مباشرة من Props دون الحاجة لـ useEffect
  const [selectedService, setSelectedService] = useState<Service | null>(() => {
    if (initialServiceId) {
      return SERVICES.find((s) => s.id === initialServiceId) || null;
    }
    return null;
  });

  const [bookingDate, setBookingDate] = useState<string>("");

  // حساب التواريخ المتاحة مشتقاً (Derived State) بـ useMemo لمنع الـ Cascading Renders
  const availableDates = useMemo(() => {
    const today = new Date();
    const datesList = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      datesList.push({
        fullDate: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("ar-JO", { weekday: "short", day: "numeric" }),
      });
    }
    return datesList;
  }, []);

  const activeDate = bookingDate || (availableDates.length > 0 ? availableDates[0].fullDate : "");

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h2 className="text-xl font-bold mb-4">احجز خدمتك مع &quot;جسر&quot;</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-slate-700">اختر الخدمة</label>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedService(service)}
              className={`p-3 text-right rounded-lg border transition-all ${
                selectedService?.id === service.id
                  ? "border-sky-600 bg-sky-50 text-sky-900 font-semibold"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {service.title}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-slate-700">اختر التاريخ</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableDates.map((d) => (
            <button
              key={d.fullDate}
              type="button"
              onClick={() => setBookingDate(d.fullDate)}
              className={`p-3 min-w-[80px] text-center rounded-lg border text-sm transition-all ${
                activeDate === d.fullDate
                  ? "border-sky-600 bg-sky-600 text-white font-medium"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}