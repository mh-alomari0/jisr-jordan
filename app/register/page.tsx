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
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { registerAction } from "@/lib/actions/auth";

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

  const passwordChecks = [
    ["8 خانات على الأقل", password.length >= 8],
    [
      "كلمتا المرور متطابقتان",
      Boolean(password) && password === confirmPassword,
    ],
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

  return (
    <main className="mx-auto my-4 grid min-h-[700px] max-w-6xl overflow-hidden rounded-[2.5rem] border border-theme bg-surface shadow-lift lg:grid-cols-2">
      {/* Visual Brand Aside */}
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
          <span className="status-pill bg-white/15 text-[#a6f0e7] font-black">
            <Sparkles size={12} className="me-1" /> خطوتك الأولى
          </span>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">
            سجّل حسابك
            <br />
            وخلّي الباقي علينا.
          </h2>
          <p className="text-xs sm:text-sm text-[#d9f3ee] leading-7">
            تصفح مقدمي الخدمة المعتمدين، قارن عروض الأسعار، وتواصل مباشرة بأعلى درجات الأمان.
          </p>

          <div className="pt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
            <span className="rounded-2xl border border-white/15 bg-white/10 p-2.5">حساب موثق</span>
            <span className="rounded-2xl border border-white/15 bg-white/10 p-2.5">بيانات آمنة</span>
            <span className="rounded-2xl border border-white/15 bg-white/10 p-2.5">دفع عند الإنجاز</span>
          </div>
        </div>

        <p className="relative text-[10px] text-white/60">
          منصة جسر الأردن · سوق المهارات والخدمات
        </p>
      </aside>

      {/* Form Section */}
      <section className="flex items-center p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-black lg:hidden">
            <span className="brand-mark h-9 w-9 text-base">ج</span>
            جسر الأردن
          </Link>

          <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand font-black">
            حساب جديد
          </span>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">مرحباً بك في جسر 👋</h1>
          <p className="mt-1 text-xs text-muted leading-6">
            أنشئ حسابك للوصول إلى كافة الخدمات وتتبع طلباتك.
          </p>

          {success ? (
            <div className="mt-6 rounded-3xl border border-[rgb(var(--success)/0.3)] bg-[rgb(var(--success)/0.08)] p-6 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[rgb(var(--success))]" />
              <h2 className="text-lg font-black">تم إنشاء الحساب بنجاح!</h2>
              <p className="text-xs text-muted leading-6">
                {requiresConfirmation
                  ? "أرسلنا رمز تأكيد إلى بريدك الإلكتروني، اضغط أدناه لتأكيد الحساب."
                  : "تم التسجيل، جاري تحويلك لتسجيل الدخول..."}
              </p>

              {requiresConfirmation && (
                <Link
                  href="/login/otp?mode=signup"
                  className="brand-button w-full text-xs font-black mt-2"
                >
                  تأكيد الحساب برمز البريد
                </Link>
              )}
            </div>
          ) : (
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
                <label className="block text-xs font-bold mb-1.5">كيف نناديك؟</label>
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
                <label className="block text-xs font-bold mb-1.5">البريد الإلكتروني</label>
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
                <label className="block text-xs font-bold mb-1.5">كلمة المرور</label>
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
                <label className="block text-xs font-bold mb-1.5">تأكيد كلمة المرور</label>
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

              {/* Password checks */}
              <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                {passwordChecks.map(([label, ok]) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
                      ok ? "bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))] font-bold" : "bg-surface-muted"
                    }`}
                  >
                    {ok && <Check size={12} />} {label}
                  </span>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="brand-button w-full text-xs font-black shadow-md mt-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-theme pt-4 text-center text-xs text-muted">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-black text-brand">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
