import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[68vh] max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full border-t border-theme pt-8 sm:pt-10">
        <p className="text-sm font-bold text-brand">404</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          هاي الصفحة مش موجودة
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
          ممكن الرابط تغيّر أو الصفحة انشالت. ارجع للرئيسية أو كمّل استكشاف الخدمات.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="brand-button gap-2">
            <Home size={15} />
            الرئيسية
          </Link>
          <Link href="/discover" className="secondary-button gap-2">
            <Compass size={15} />
            استكشف الخدمات
          </Link>
        </div>
      </section>
    </main>
  );
}
