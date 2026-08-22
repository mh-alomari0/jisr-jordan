"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[68vh] max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full border-t border-theme pt-8 sm:pt-10">
        <p className="text-sm font-bold text-[rgb(var(--danger))]">صار معنا خلل</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          الصفحة ما كملت تحميل
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
          جرّب مرة ثانية. إذا ظل الخطأ موجود، ارجع للرئيسية وافتح الصفحة من جديد.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-muted">
            مرجع الخطأ: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="brand-button gap-2">
            <RefreshCw size={15} />
            حاول مرة ثانية
          </button>
          <Link href="/" className="secondary-button gap-2">
            <Home size={15} />
            الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
