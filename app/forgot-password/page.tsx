"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { KeyRound, Mail, AlertCircle, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestPasswordResetAction(email);
      if (!result.success) {
        setError(result.error || "تعذر إرسال الطلب حالياً. حاول مرة أخرى لاحقاً.");
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
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-y border-theme bg-surface p-6 sm:rounded-card sm:border sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black">نسيت كلمة المرور؟</h1>
          <p className="mt-2 text-sm text-muted">
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور
          </p>
        </div>

        {sent ? (
          <div className="space-y-3 border border-[rgb(var(--success)/0.35)] bg-[rgb(var(--success)/0.1)] p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[rgb(var(--success))]" />
            <h3 className="font-bold text-lg">تم إرسال الرابط!</h3>
            <p className="text-sm">
              تفقّد بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لصفحة تسجيل الدخول</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            {error && (
              <div role="alert" aria-live="polite" className="flex items-center gap-3 border border-[rgb(var(--danger)/0.35)] bg-[rgb(var(--danger)/0.1)] px-4 py-3 text-sm text-[rgb(var(--danger))]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="form-field pe-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="brand-button w-full gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  <span>إرسال رابط الاستعادة</span>
                </>
              )}
            </button>
          </form>
        )}

        {!sent && (
          <div className="mt-8 border-t border-theme pt-6 text-center">
            <Link href="/login" className="text-sm font-bold text-brand hover:underline">
              العودة لصفحة تسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
