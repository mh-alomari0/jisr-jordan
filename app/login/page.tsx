"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo") || searchParams.get("redirect");
  const authError = searchParams.get("authError");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/";

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
      const result = await loginAction({
        email,
        password,
      });

      if (!result.success) {
        setError(result.error || "بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {authError && (
        <div role="alert" className="border border-[rgb(var(--warning)/0.4)] bg-[rgb(var(--warning)/0.1)] px-4 py-3 text-sm">
          رابط المصادقة غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً وحاول مرة أخرى.
        </div>
      )}
      {error && (
        <div role="alert" aria-live="polite" className="flex items-center gap-3 border border-[rgb(var(--danger)/0.35)] bg-[rgb(var(--danger)/0.1)] px-4 py-3 text-sm text-[rgb(var(--danger))]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm font-semibold">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="form-field pe-11"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="login-password" className="block text-sm font-semibold">
            كلمة المرور
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-brand hover:underline"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="form-field px-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-[rgb(var(--text-main))]"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
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
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول</span>
          </>
        )}
      </button>
      <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-[rgb(var(--border))]" /><span>أو</span><span className="h-px flex-1 bg-[rgb(var(--border))]" /></div>
      <Link href="/login/otp" className="secondary-button w-full">أرسل رمز تسجيل الدخول</Link>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-y border-theme bg-surface p-6 sm:rounded-card sm:border sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black">مرحبًا بك مجددًا</h1>
          <p className="mt-2 text-sm text-muted">
            سجّل دخولك لمتابعة حجوزاتك وطلب خدمات الصيانة
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-8 text-neutral-muted">جاري التحميل...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 border-t border-theme pt-6 text-center">
          <p className="text-sm text-muted">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-bold text-brand hover:underline">
              أنشئ حسابًا جديدًا
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
