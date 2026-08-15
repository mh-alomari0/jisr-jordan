import { Suspense } from "react";
import BookingFlow from "./booking-flow";

export default function BookingPage() {
  return (
    <div className="py-12 bg-neutral-surface min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="text-center py-20 font-bold text-neutral-muted">
            جاري تحميل نموذج الحجز...
          </div>
        }>
          <BookingFlow />
        </Suspense>
      </div>
    </div>
  );
}