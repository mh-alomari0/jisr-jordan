import Link from "next/link";
import { Compass, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-md p-8 sm:p-10 text-center space-y-6 shadow-lift !rounded-[2.5rem]">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
          <span className="text-3xl font-black">404</span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[rgb(var(--accent-peach))]" />
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black sm:text-3xl">الصفحة غير موجودة</h1>
          <p className="text-xs sm:text-sm text-muted leading-6">
            عذراً، الصفحة التي تحاول الوصول إليها قد تكون نُقلت أو لم تعد متاحة.
          </p>
        </div>

        <div className="pt-2 space-y-2.5">
          <Link
            href="/"
            className="brand-button w-full text-xs font-black shadow-md"
          >
            <Home size={16} /> العودة للصفحة الرئيسية
          </Link>

          <Link
            href="/discover"
            className="secondary-button w-full text-xs font-bold"
          >
            <Compass size={16} /> استكشاف الخدمات
          </Link>
        </div>
      </div>
    </main>
  );
}