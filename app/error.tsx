"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Home,
  RefreshCw,
} from "lucide-react";

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
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-[2rem] border border-theme bg-surface p-7 text-center shadow-soft sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))]">
          <AlertTriangle size={24} />
        </span>

        <p className="mt-6 text-[10px] font-bold text-[rgb(var(--danger))]">
          صار خطأ غير متوقع
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-[-.04em] sm:text-3xl">
          الصفحة ما قدرت تكمل التحميل
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-muted">
          جرّب إعادة تحميل الجزء الحالي. إذا استمرت المشكلة، ارجع للرئيسية
          وجرب المسار مرة ثانية.
        </p>

        {error.digest && (
          <p className="mt-3 text-[9px] text-muted">
            مرجع الخطأ: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="brand-button gap-2"
          >
            <RefreshCw size={14} />
            حاول مرة ثانية
          </button>

          <Link
            href="/"
            className="secondary-button gap-2"
          >
            <Home size={14} />
            الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
