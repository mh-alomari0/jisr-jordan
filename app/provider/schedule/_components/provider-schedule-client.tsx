"use client";

import { useState } from "react";
import { updateProviderScheduleAction, ScheduleSlot } from "@/lib/actions/provider-schedule";

const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function ProviderScheduleClient({
  initialSchedule,
}: {
  initialSchedule: ScheduleSlot[];
}) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<ScheduleSlot[]>(() => {
    return DAYS.map((_, index) => {
      const existing = initialSchedule.find((s) => s.day_of_week === index);
      return (
        existing || {
          day_of_week: index,
          start_time: "09:00",
          end_time: "17:00",
          is_active: index !== 5, // الجمعة مغلق إفتراضياً
        }
      );
    });
  });

  const handleToggle = (dayIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleTimeChange = (dayIndex: number, field: "start_time" | "end_time", value: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await updateProviderScheduleAction(slots);
    if (res.success) {
      alert("تم حفظ جدول أوقات العمل بنجاح");
    } else {
      alert(res.error || "حدث خطأ أثناء الحفظ");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.day_of_week} className="flex flex-wrap items-center justify-between border-b pb-3 gap-4">
            <div className="flex items-center gap-3 w-32">
              <input
                type="checkbox"
                checked={slot.is_active}
                onChange={() => handleToggle(slot.day_of_week)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className={`text-sm font-medium ${slot.is_active ? "text-gray-900" : "text-gray-400"}`}>
                {DAYS[slot.day_of_week]}
              </span>
            </div>

            <div className="flex items-center gap-2 dir-ltr">
              <input
                type="time"
                disabled={!slot.is_active}
                value={slot.start_time}
                onChange={(e) => handleTimeChange(slot.day_of_week, "start_time", e.target.value)}
                className="border rounded p-1 text-sm disabled:bg-gray-100"
              />
              <span className="text-gray-500 text-xs">إلى</span>
              <input
                type="time"
                disabled={!slot.is_active}
                value={slot.end_time}
                onChange={(e) => handleTimeChange(slot.day_of_week, "end_time", e.target.value)}
                className="border rounded p-1 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleSave}
        className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "جاري الحفظ..." : "حفظ الأوقات"}
      </button>
    </div>
  );
}