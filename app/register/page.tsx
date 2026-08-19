"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (password.length < 8) {
      setError("يجب أن تكون كلمة المرور مكونة من 8 خانات على الأقل.");
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
        setError(result.error || "تعذر إكمال التسجيل. تحقق من البيانات أو حاول تسجيل الدخول إن كان لديك حساب.");
        setLoading(false);
        return;
      }

      setRequiresConfirmation(Boolean(result.requiresEmailConfirmation));
      setSuccess(true);
      setLoading(false);
      if (!result.requiresEmailConfirmation) {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md border-y border-theme bg-surface p-6 sm:rounded-card sm:border sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black">إنشاء حساب جديد</h1>
          <p className="mt-2 text-sm text-muted">
            انضم لمنصة جسر واحجز جميع خدمات صيانة منزلك بسهولة
          </p>
        </div>

        {success ? (
          <div className="space-y-3 border border-[rgb(var(--success)/0.35)] bg-[rgb(var(--success)/0.1)] p-6 text-center text-[rgb(var(--text-main))]">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[rgb(var(--success))]" />
            <h3 className="font-bold text-lg">تم إنشاء الحساب بنجاح!</h3>
            <p className="text-sm">
              {requiresConfirmation
                ? "تفقّد بريدك الإلكتروني واتبع تعليمات التأكيد. إذا وصل رمز من 6 أرقام يمكنك إدخاله هنا."
                : "جاري تحويلك لصفحة تسجيل الدخول..."}
            </p>
            {requiresConfirmation && <Link href="/login/otp?mode=signup" className="secondary-button mt-3 w-full">تأكيد الحساب برمز البريد</Link>}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div role="alert" aria-live="polite" className="flex items-center gap-3 border border-[rgb(var(--danger)/0.35)] bg-[rgb(var(--danger)/0.1)] px-4 py-3 text-sm text-[rgb(var(--danger))]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد العمري"
                  className="form-field pe-11"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="mb-2 block text-sm font-semibold">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="register-password"
                  minLength={8}
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-[rgb(var(--text-main))]"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="register-confirm-password"
                  minLength={8}
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-field px-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-[rgb(var(--text-main))]"
                  aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="brand-button mt-2 w-full gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>إنشاء الحساب</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-theme pt-6 text-center">
          <p className="text-sm text-muted">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              سجّل دخولك الآن
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
