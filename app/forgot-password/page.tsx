"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
} from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestPasswordResetAction(email);

      if (!result.success) {
        setError(result.error || "تعذر إرسال الطلب حالياً. جرّب بعد شوي.");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError("صار خطأ غير متوقع. جرّب مرة ثانية.");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto my-6 grid min-h-[640px] max-w-5xl overflow-hidden border border-theme bg-surface lg:grid-cols-[.9fr_1.1fr] lg:rounded-[1.75rem]">
      <aside className="hidden bg-[#f4ddd4] p-10 text-[#643c37] lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-sm font-bold">جسر الأردن</Link>

        <div className="max-w-sm">
          <KeyRound className="h-9 w-9 text-[#0b817a]" />
          <p className="mt-6 text-[10px] font-bold opacity-65">استعادة الحساب</p>
          <h1 className="mt-2 text-4xl font-bold leading-[1.16] tracking-[-.055em]">
            نسيتها؟
            <br />
            عادي، بتصير.
          </h1>
          <p className="mt-4 text-xs leading-7 opacity-75">
            حط بريدك، وإذا الحساب مؤهل بنبعثلك رابط ترجع منه تدخل بأمان.
          </p>
        </div>

        <p className="text-[9px] opacity-55">
          ما بنوضح إذا البريد مسجل أو لا، حفاظاً على خصوصية الحسابات.
        </p>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[10px] font-bold text-brand">كلمة المرور</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">رجّع حسابك</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            اكتب بريدك وبنبعثلك تعليمات الاستعادة إذا كان الحساب مؤهلاً.
          </p>

          {sent ? (
            <div className="mt-8 border-t border-theme pt-7 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[rgb(var(--success))]" />
              <h3 className="mt-4 text-lg font-bold">راجع بريدك</h3>
              <p className="mt-2 text-xs leading-6 text-muted">
                إذا كان البريد مؤهلاً، رح توصلك تعليمات استعادة كلمة المرور.
              </p>
              <Link href="/login" className="secondary-button mt-5 w-full gap-2">
                <ArrowRight size={14} />
                رجوع لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-7 space-y-5">
              {error && (
                <div role="alert" className="flex items-start gap-2 border-s-2 border-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.06)] px-4 py-3 text-xs leading-6 text-[rgb(var(--danger))]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <label className="block text-xs font-bold">
                البريد الإلكتروني
                <div className="relative mt-1.5">
                  <Mail className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="form-field pe-10"
                  />
                </div>
              </label>

              <button type="submit" disabled={loading} className="brand-button w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={16} />}
                {loading ? "جارٍ الإرسال..." : "ابعث رابط الاستعادة"}
              </button>
            </form>
          )}

          {!sent && (
            <Link href="/login" className="mt-6 block text-center text-xs font-bold text-brand">
              رجوع لتسجيل الدخول
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
