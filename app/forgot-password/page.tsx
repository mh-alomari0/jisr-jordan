"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError("تعذر إرسال رابط استعادة كلمة المرور. تحقق من البريد وكرر المحاولة.");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-card border border-neutral-border shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-neutral-text">نسيت كلمة المرور؟</h1>
          <p className="text-sm text-neutral-muted mt-2">
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور
          </p>
        </div>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-card text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-lg">تم إرسال الرابط!</h3>
            <p className="text-sm">
              تفقّد بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm mt-2 hover:underline"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لصفحة تسجيل الدخول</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-neutral-text mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pr-11 pl-4 py-3 bg-neutral-surface border border-neutral-border rounded-btn focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
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
          <div className="mt-8 pt-6 border-t border-neutral-border text-center">
            <Link href="/login" className="text-sm text-primary font-bold hover:underline">
              العودة لصفحة تسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}