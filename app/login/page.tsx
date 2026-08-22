"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { supabase } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.87V7.51H3.05A10 10 0 0 0 2 12c0 1.61.38 3.13 1.05 4.49l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.51l3.35 2.62C7.2 7.77 9.4 6.01 12 6.01Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedRedirect =
    searchParams.get("redirectTo") || searchParams.get("redirect");
  const authError = searchParams.get("authError");
  const redirectTo =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction({ email, password });

      if (!result.success) {
        setError(
          result.error ||
            "بيانات الدخول مش زابطة. تأكد من البريد وكلمة المرور وجرب مرة ثانية.",
        );
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("صار خطأ غير متوقع. جرّب مرة ثانية.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const callback =
        `${window.location.origin}/auth/callback?next=` +
        encodeURIComponent(redirectTo);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback },
      });

      if (oauthError) {
        setError("ما قدرنا نفتح تسجيل الدخول بجوجل. جرّب مرة ثانية.");
        setGoogleLoading(false);
      }
    } catch {
      setError("ما قدرنا نفتح تسجيل الدخول بجوجل.");
      setGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {authError && (
        <div
          role="alert"
          className="border-s-2 border-[rgb(var(--warning))] bg-[rgb(var(--warning)/0.06)] px-4 py-3 text-xs leading-6"
        >
          رابط الدخول انتهت صلاحيته أو مش صالح. اطلب رابط أو رمز جديد.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-s-2 border-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.06)] px-4 py-3 text-xs leading-6 text-[rgb(var(--danger))]"
        >
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

      <label className="block text-xs font-bold">
        <span className="flex items-center justify-between gap-3">
          <span>كلمة المرور</span>
          <Link href="/forgot-password" className="text-[10px] font-bold text-brand">
            نسيتها؟
          </Link>
        </span>

        <div className="relative mt-1.5">
          <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="form-field px-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={loading || googleLoading}
        className="brand-button w-full gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn size={16} />}
        {loading ? "جارٍ تسجيل الدخول..." : "دخول"}
      </button>

      <div className="flex items-center gap-3 text-[10px] text-muted">
        <span className="h-px flex-1 bg-[rgb(var(--border))]" />
        أو
        <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="flex min-h-12 w-full items-center justify-center gap-3 border border-theme bg-surface px-4 text-xs font-bold transition hover:bg-surface-muted active:scale-[.98] disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {googleLoading ? "بنفتح جوجل..." : "المتابعة باستخدام Google"}
      </button>

      <Link href="/login/otp" className="secondary-button w-full">
        دخول برمز على البريد
      </Link>

      <p className="flex items-center justify-center gap-1.5 text-[9px] text-muted">
        <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
        دخولك وبيانات حسابك محمية داخل جسر.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto my-5 grid min-h-[700px] max-w-6xl overflow-hidden border border-theme bg-surface lg:grid-cols-[0.92fr_1.08fr] lg:rounded-[1.75rem]">
      <aside className="hidden bg-[#0b817a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-bold">
          <span className="brand-mark h-10 w-10 text-lg">ج</span>
          جسر الأردن
        </Link>

        <div className="max-w-md">
          <p className="text-[10px] font-bold tracking-[.08em] text-[#c9eee8]">
            رجعت؟ أهلاً فيك
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.16] tracking-[-.055em] xl:text-5xl">
            كمّل من المكان
            <br />
            اللي وقفت عنده.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-8 text-[#d9f2ee]">
            طلباتك ورسائلك وكل اللي حفظته موجود مثل ما تركته.
          </p>
        </div>

        <p className="text-[9px] text-white/55">
          جسر الأردن · خدمات ومهارات من ناس حقيقيين
        </p>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold lg:hidden">
            <span className="brand-mark h-9 w-9 text-base">ج</span>
            جسر الأردن
          </Link>

          <p className="text-[10px] font-bold text-brand">تسجيل الدخول</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.05em]">
            أهلاً برجعتك
          </h1>
          <p className="mt-2 text-xs leading-6 text-muted">
            ادخل على حسابك وكمل من وين وقفت.
          </p>

          <div className="mt-7">
            <Suspense
              fallback={
                <div className="py-10 text-center text-xs text-muted">
                  جارٍ التحميل...
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-7 border-t border-theme pt-5 text-center text-xs text-muted">
            ما عندك حساب؟{" "}
            <Link href="/register" className="font-bold text-brand">
              اعمل حساب
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
