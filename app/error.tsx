"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black text-neutral-text mb-2">حدث خطأ غير متوقع</h1>
      <p className="text-neutral-muted text-sm max-w-md mb-6">
        تعذر تحميل الصفحة المطلوبة حالياً. يرجى محاولة إعادتها من جديد.
      </p>
      <button
        onClick={() => reset()}
        className="bg-primary text-white font-bold px-6 py-3 rounded-btn hover:bg-primary-hover transition-colors inline-flex items-center gap-2 shadow-md"
      >
        <RotateCcw className="w-4 h-4" />
        <span>إعادة المحاولة</span>
      </button>
    </div>
  );
}