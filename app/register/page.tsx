"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { registerAction } from "@/lib/actions/auth";
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

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordChecks = [
    ["8 خانات على الأقل", password.length >= 8],
    ["كلمتا المرور متطابقتان", Boolean(password) && password === confirmPassword],
  ] as const;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (password.length < 8) {
      setError("يجب أن تكون كلمة المرور من 8 خانات على الأقل.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerAction({
        fullName,
        email,
        password,
      });

      if (!result.success) {
        setError(result.error || "تعذر إكمال التسجيل.");
        setLoading(false);
        return;
      }

      setRequiresConfirmation(Boolean(result.requiresEmailConfirmation));
      setSuccess(true);
      setLoading(false);

      if (!result.requiresEmailConfirmation) {
        setTimeout(() => router.push("/login"), 1800);
      }
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const callback =
        `${window.location.origin}/auth/callback?next=` +
        encodeURIComponent("/");

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback,
          scopes: "openid email profile",
        },
      });

      if (oauthError) {
        setError(
          "تعذر فتح التسجيل بجوجل. تأكد أن Google مفعّل داخل Supabase.",
        );
        setGoogleLoading(false);
      }
    } catch {
      setError("تعذر فتح التسجيل بجوجل.");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="mx-auto my-4 grid min-h-[700px] max-w-6xl overflow-hidden rounded-[2.5rem] border border-theme bg-surface shadow-lift lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#065053] via-[#087f79] to-[#0ba59d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full border-[30px] border-white/10" />
        <div className="absolute -bottom-32 right-[-20px] h-72 w-72 rounded-full bg-[#ffc985]/18" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5 text-base font-black">
            <span className="brand-mark h-10 w-10 text-lg">ج</span>
            جسر الأردن
          </Link>
        </div>

        <div className="relative max-w-md space-y-3">
          <span className="status-pill bg-white/15 font-black text-[#a6f0e7]">
            <Sparkles size={12} className="me-1" /> خطوتك الأولى
          </span>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">
            سجّل حسابك
            <br />
            وخلّي الباقي علينا.
          </h2>
          <p className="text-xs leading-7 text-[#d9f3ee] sm:text-sm">
            تصفح مقدمي الخدمة، قارن الخيارات، واحكي مباشرة داخل جسر.
          </p>
        </div>

        <p className="relative text-[10px] text-white/60">
          منصة جسر الأردن · سوق المهارات والخدمات
        </p>
      </aside>

      <section className="flex items-center p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-black lg:hidden">
            <span className="brand-mark h-9 w-9 text-base">ج</span>
            جسر الأردن
          </Link>

          <span className="status-pill bg-[rgb(var(--primary-soft))] font-black text-brand">
            حساب جديد
          </span>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            مرحباً بك في جسر 👋
          </h1>
          <p className="mt-1 text-xs leading-6 text-muted">
            أنشئ حسابك وابدأ من مكان واحد.
          </p>

          {success ? (
            <div className="mt-6 space-y-3 rounded-3xl border border-[rgb(var(--success)/0.3)] bg-[rgb(var(--success)/0.08)] p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[rgb(var(--success))]" />
              <h2 className="text-lg font-black">تم إنشاء الحساب!</h2>
              <p className="text-xs leading-6 text-muted">
                {requiresConfirmation
                  ? "بعثنالك رسالة تأكيد على بريدك. أكد البريد وبعدها ادخل على جسر."
                  : "تم التسجيل، جاري تحويلك لتسجيل الدخول..."}
              </p>

              {requiresConfirmation && (
                <Link
                  href="/login/otp?mode=signup"
                  className="brand-button mt-2 w-full text-xs font-black"
                >
                  تأكيد الحساب برمز البريد
                </Link>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs font-bold text-[rgb(var(--danger))]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    كيف نناديك؟
                  </label>
                  <div className="relative">
                    <User className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="اكتب اسمك"
                      className="form-field pe-10 !rounded-2xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="form-field pe-10 !rounded-2xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-field px-10 !rounded-2xl text-xs"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      minLength={8}
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-field px-10 !rounded-2xl text-xs"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                  {passwordChecks.map(([label, ok]) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
                        ok
                          ? "bg-[rgb(var(--success)/0.1)] font-bold text-[rgb(var(--success))]"
                          : "bg-surface-muted"
                      }`}
                    >
                      {ok && <Check size={12} />} {label}
                    </span>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="brand-button mt-2 w-full text-xs font-black shadow-md"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[10px] text-muted">
                <span className="h-px flex-1 bg-[rgb(var(--border))]" />
                أو
                <span className="h-px flex-1 bg-[rgb(var(--border))]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-theme bg-white px-4 text-xs font-bold text-[#222] shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft active:scale-[.98] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                {googleLoading
                  ? "بنفتح جوجل..."
                  : "المتابعة باستخدام Google"}
              </button>
            </>
          )}

          <p className="mt-6 border-t border-theme pt-4 text-center text-xs text-muted">
            عندك حساب؟{" "}
            <Link href="/login" className="font-black text-brand">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
