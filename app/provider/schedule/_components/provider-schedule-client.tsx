"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Save,
} from "lucide-react";
import {
  updateProviderScheduleAction,
  type ScheduleSlot,
} from "@/lib/actions/provider-schedule";

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
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<ScheduleSlot[]>(() =>
    DAYS.map((_, index) => {
      const existing = initialSchedule.find(
        (s) => s.day_of_week === index,
      );

      return (
        existing || {
          day_of_week: index,
          start_time: "09:00",
          end_time: "17:00",
          is_active: index !== 5,
        }
      );
    }),
  );

  const activeDays = slots.filter(
    (slot) => slot.is_active,
  ).length;

  const handleToggle = (dayIndex: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.day_of_week === dayIndex
          ? { ...slot, is_active: !slot.is_active }
          : slot,
      ),
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.day_of_week === dayIndex
          ? { ...slot, [field]: value }
          : slot,
      ),
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    const result = await updateProviderScheduleAction(slots);

    setMessage(
      result.success
        ? "تم حفظ جدول أوقات العمل بنجاح."
        : result.error || "حدث خطأ أثناء الحفظ",
    );

    setLoading(false);
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold text-brand">
            أسبوع العمل
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {activeDays} أيام مفعلة
          </h2>
        </div>

        <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-bold text-muted">
          توقيت الأردن
        </span>
      </div>

      <div className="divide-y divide-[rgb(var(--border))]">
        {slots.map((slot) => {
          const active = slot.is_active;

          return (
            <div
              key={slot.day_of_week}
              className={`grid gap-4 p-4 transition sm:grid-cols-[180px_1fr] sm:items-center sm:p-5 ${
                active
                  ? ""
                  : "bg-surface-muted/60 opacity-70"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    handleToggle(slot.day_of_week)
                  }
                />

                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    active
                      ? "bg-[rgb(var(--primary-soft))] text-brand"
                      : "bg-surface-muted text-muted"
                  }`}
                >
                  <Clock3 size={16} />
                </span>

                <span>
                  <strong className="block text-sm">
                    {DAYS[slot.day_of_week]}
                  </strong>
                  <span className="text-[9px] text-muted">
                    {active ? "متاح للحجوزات" : "مغلق"}
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2" dir="ltr">
                <input
                  type="time"
                  disabled={!active}
                  value={slot.start_time}
                  onChange={(e) =>
                    handleTimeChange(
                      slot.day_of_week,
                      "start_time",
                      e.target.value,
                    )
                  }
                  className="form-field text-center"
                />

                <span className="text-[10px] text-muted">
                  إلى
                </span>

                <input
                  type="time"
                  disabled={!active}
                  value={slot.end_time}
                  onChange={(e) =>
                    handleTimeChange(
                      slot.day_of_week,
                      "end_time",
                      e.target.value,
                    )
                  }
                  className="form-field text-center"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-theme p-5 sm:p-6">
        {message && (
          <p className="mb-4 flex items-center gap-2 rounded-2xl bg-[rgb(var(--primary-soft))] p-3 text-xs">
            <CheckCircle2 size={15} className="text-brand" />
            {message}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="brand-button w-full gap-2 sm:w-auto"
        >
          <Save size={15} />
          {loading ? "جاري الحفظ..." : "حفظ أوقات العمل"}
        </button>
      </div>
    </section>
  );
}
