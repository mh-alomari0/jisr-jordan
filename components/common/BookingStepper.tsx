"use client";

import { Check, Clock, UserCheck, Wrench, CheckCircle2, XCircle } from "lucide-react";

interface StepperProps {
  status: string;
}

const STEPS = [
  { key: "pending", label: "تم الاستلام", icon: Clock },
  { key: "accepted", label: "تم القبول", icon: Check },
  { key: "assigned", label: "تعيين فني", icon: UserCheck },
  { key: "in_progress", label: "قيد التنفيذ", icon: Wrench },
  { key: "completed", label: "مكتمل", icon: CheckCircle2 },
];

export default function BookingStepper({ status }: StepperProps) {
  if (status === "cancelled") {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold mt-3">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>تم إلغاء هذا الطلب</span>
      </div>
    );
  }

  const getStepIndex = (st: string) => {
    switch (st) {
      case "pending": return 0;
      case "accepted": return 1;
      case "assigned": return 2;
      case "in_progress": return 3;
      case "completed": return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="pt-4 pb-2">
      <div className="flex items-center justify-between relative">
        {/* خط التوصيل الخلفي */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-neutral-border -translate-y-1/2 z-0" />
        
        {/* خط التوصيل النشط */}
        <div
          className="absolute top-1/2 right-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-white ring-4 ring-primary-light"
                    : "bg-white border-2 border-neutral-border text-neutral-muted"
                } ${isCurrent ? "scale-110 shadow-md" : ""}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold ${isCompleted ? "text-primary" : "text-neutral-muted"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}