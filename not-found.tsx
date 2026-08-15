import Link from "next/link";
import { Wrench, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-neutral-surface">
      <div className="w-20 h-20 bg-primary-light text-primary rounded-3xl flex items-center justify-center mb-6 shadow-md">
        <Wrench className="w-10 h-10 stroke-[2.25]" />
      </div>

      <span className="text-xs font-mono font-black text-primary bg-white border border-neutral-border px-3 py-1 rounded-full mb-3">
        404 ERROR
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-neutral-text mb-3">
        الصفحة غير موجودة
      </h1>

      <p className="text-neutral-muted text-xs sm:text-sm max-w-md mb-8 leading-relaxed">
        عذرًا، المسار الذي تحاول الوصول إليه غير موجود أو تم نقله. يمكنك العودة للصفحة الرئيسية واستكشاف الخدمات المتاحة.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="flex-1 bg-primary text-white font-bold py-3.5 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
        <Link
          href="/services"
          className="flex-1 bg-white border border-neutral-border text-neutral-text font-bold py-3.5 rounded-btn hover:bg-neutral-border/50 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span>الخدمات</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}