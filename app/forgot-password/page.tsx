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
        setError(
          result.error ||
            "تعذر إرسال الطلب حالياً. حاول مرة أخرى لاحقاً.",
        );
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto my-6 grid min-h-[650px] max-w-5xl overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#f8e0d6] p-9 text-[#743b35] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[25px] border-white/35" />
        <Link href="/" className="relative font-bold">جسر الأردن</Link>
        <div className="relative">
          <KeyRound className="h-10 w-10 text-[#0b817a]" />
          <p className="mt-6 text-[10px] font-bold opacity-65">استعادة الحساب</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-.055em]">نسيتها؟<br /><span className="text-[#0b817a]">بتصير.</span></h1>
          <p className="mt-4 text-xs leading-7 opacity-75">أرسل طلب الاستعادة لبريدك، وكمل من الرابط الآمن اللي يوصلك.</p>
        </div>
        <p className="relative text-[9px] opacity-55">لا نعرض إذا كان البريد مسجلاً أو لا، لحماية خصوصية الحسابات.</p>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[10px] font-bold text-brand">كلمة المرور</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">استرجع حسابك</h2>
          <p className="mt-2 text-xs leading-6 text-muted">أدخل بريدك الإلكتروني وسنرسل مسار الاستعادة الآمن.</p>

          {sent ? (
            <div className="mt-7 rounded-[1.7rem] border border-[rgb(var(--success)/0.25)] bg-[rgb(var(--success)/0.06)] p-6 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[rgb(var(--success))]" />
              <h3 className="mt-4 text-lg font-bold">راجع بريدك</h3>
              <p className="mt-2 text-xs leading-6 text-muted">إذا كان البريد مؤهلاً، ستصلك تعليمات استعادة كلمة المرور.</p>
              <Link href="/login" className="secondary-button mt-5 w-full gap-2">
                <ArrowRight size={14} />
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-7 space-y-5">
              {error && (
                <div role="alert" className="flex gap-2 rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs text-[rgb(var(--danger))]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="form-field pe-10"
                  />
                </div>
              </label>

              <button type="submit" disabled={loading} className="brand-button w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={16} />}
                {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </button>
            </form>
          )}

          {!sent && (
            <Link href="/login" className="mt-6 block text-center text-xs font-bold text-brand">
              العودة لتسجيل الدخول
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
