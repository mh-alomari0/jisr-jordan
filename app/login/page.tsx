"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("Login Error:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-neutral-text">
            كلمة المرور
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-primary font-bold hover:underline"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>
        <div className="relative">
          <Lock className="w-5 h-5 text-neutral-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pr-11 pl-11 py-3 bg-neutral-surface border border-neutral-border rounded-btn focus:outline-none focus:border-primary text-sm font-medium"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted hover:text-neutral-text transition-colors"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
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
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول</span>
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-card border border-neutral-border shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-neutral-text">مرحبًا بك مجددًا</h1>
          <p className="text-sm text-neutral-muted mt-2">
            سجّل دخولك لمتابعة حجوزاتك وطلب خدمات الصيانة
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-8 text-neutral-muted">جاري التحميل...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 pt-6 border-t border-neutral-border text-center">
          <p className="text-sm text-neutral-muted">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              أنشئ حسابًا جديدًا
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}