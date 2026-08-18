"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBookingAction } from "@/lib/actions/create-booking";
import { TIME_SLOTS } from "@/lib/constants";

interface ServiceOption {
  id: string;
  title: string;
  price: number;
}

interface BookingFlowProps {
  services: ServiceOption[];
}

/** Convert Arabic time slot "08:00 صباحًا" to 24h "08:00" */
function slotTo24h(slot: string): string {
  const match = slot.match(/(\d{1,2}):(\d{2})\s*(صباحًا|مساءً)/);
  if (!match) return slot;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3];
  if (period === "مساءً" && h !== 12) h += 12;
  if (period === "صباحًا" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

export default function BookingFlow({ services }: BookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("serviceId");

  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedId || "");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const availableDates = useMemo(() => {
    const today = new Date();
    const dates: { value: string; label: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("ar-JO", { weekday: "short", day: "numeric", month: "short" }),
      });
    }
    return dates;
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const canSubmit = selectedServiceId && bookingDate && selectedSlot && phone.match(/^(077|078|079)\d{7}$/) && address.length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError("");

    const startTime = slotTo24h(selectedSlot);
    const [sh, sm] = startTime.split(":").map(Number);
    const endMinutes = sh * 60 + sm + 60; // 1 hour duration
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    const result = await createBookingAction({
      serviceId: selectedServiceId,
      bookingDate,
      startTime,
      endTime,
      phone,
      address,
      notes: notes || undefined,
      idempotencyKey: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
    });

    if (result.success && result.data) {
      router.push(`/booking/success?id=${result.data.bookingId}`);
    } else {
      setError(result.error || "حدث خطأ غير متوقع");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-slate-900">احجز خدمتك مع جسر</h2>

      {/* Service Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700">اختر الخدمة</label>
        <div className="grid grid-cols-2 gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedServiceId(service.id)}
              className={`p-3 text-right rounded-lg border transition-all text-sm ${
                selectedServiceId === service.id
                  ? "border-sky-600 bg-sky-50 text-sky-900 font-semibold"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>{service.title}</div>
              <div className="text-xs text-slate-500 mt-1">{service.price} د.أ</div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700">اختر التاريخ</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableDates.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setBookingDate(d.value)}
              className={`p-2.5 min-w-[90px] text-center rounded-lg border text-xs transition-all ${
                bookingDate === d.value
                  ? "border-sky-600 bg-sky-600 text-white font-medium"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-700">اختر الوقت</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`py-2 px-1 text-xs rounded-lg border transition-all ${
                selectedSlot === slot
                  ? "border-sky-600 bg-sky-600 text-white font-medium"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="booking-phone" className="block text-sm font-medium mb-1 text-slate-700">رقم الهاتف</label>
        <input
          id="booking-phone"
          type="tel"
          dir="ltr"
          placeholder="0791234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-right"
        />
        {phone && !phone.match(/^(077|078|079)\d{7}$/) && (
          <p className="text-xs text-rose-600 mt-1">يرجى إدخال رقم هاتف أردني صحيح (077/078/079)</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="booking-address" className="block text-sm font-medium mb-1 text-slate-700">العنوان</label>
        <input
          id="booking-address"
          type="text"
          placeholder="المدينة، الحي، الشارع، رقم المبنى"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
        {address && address.length < 5 && (
          <p className="text-xs text-rose-600 mt-1">العنوان يجب أن يتكون من 5 حروف على الأقل</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="booking-notes" className="block text-sm font-medium mb-1 text-slate-700">ملاحظات إضافية (اختياري)</label>
        <textarea
          id="booking-notes"
          rows={2}
          maxLength={500}
          placeholder="أي تفاصيل إضافية عن الخدمة المطلوبة..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
        />
      </div>

      {/* Summary + Submit */}
      {selectedService && (
        <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm text-slate-600">المبلغ المتوقع</span>
          <span className="text-lg font-bold text-slate-900">{selectedService.price} د.أ</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {submitting ? "جاري تأكيد الحجز..." : "تأكيد الحجز"}
      </button>
    </form>
  );
}
