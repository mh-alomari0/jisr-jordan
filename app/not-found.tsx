import Link from "next/link";
import { Wrench, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-primary-light text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
        <Wrench className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-neutral-text mb-2">404 — الصفحة غير موجودة</h1>
      <p className="text-neutral-muted text-sm max-w-md mb-6">
        عذرًا، الصفحة التي تحاول الوصول إليها غير موجودة أو تم تغيير مسارها.
      </p>
      <Link
        href="/"
        className="bg-primary text-white font-bold px-6 py-3 rounded-btn hover:bg-primary-hover transition-colors inline-flex items-center gap-2 shadow-md"
      >
        <Home className="w-4 h-4" />
        <span>العودة للصفحة الرئيسية</span>
      </Link>
    </div>
  );
}