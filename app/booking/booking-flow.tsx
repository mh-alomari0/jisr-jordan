"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getServicesAction, ServiceItem } from "@/lib/actions/services";

interface BookingFlowProps {
  initialServiceId?: string;
}

export default function BookingFlow({ initialServiceId }: BookingFlowProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [bookingDate, setBookingDate] = useState<string>("");

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      const res = await getServicesAction();
      if (res.success && res.services) {
        setServices(res.services);
        if (initialServiceId) {
          const match = res.services.find((s) => s.id === initialServiceId);
          if (match) setSelectedService(match);
        }
      }
      setLoading(false);
    }
    loadServices();
  }, [initialServiceId]);

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
        {loading ? (
          <div className="p-4 text-center text-sm text-slate-500">جاري جلب الخدمات المتاحة...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
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
                <div>{service.title}</div>
                <div className="text-xs text-slate-500 mt-1">{service.price} دينار</div>
              </button>
            ))}
          </div>
        )}
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