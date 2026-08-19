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
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = [
    ["8 أحرف على الأقل", password.length >= 8],
    [
      "كلمتا المرور متطابقتان",
      Boolean(password) && password === confirmPassword,
    ],
  ] as const;

  const handleUpdatePassword = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (password.length < 8) {
      setError(
        "يجب أن تكون كلمة المرور مكونة من 8 خانات على الأقل.",
      );
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(
          "تعذر تحديث كلمة المرور. تأكد من صحة رابط الاستعادة أو اطلب رابطاً جديداً.",
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1800);
    } catch {
      setError(
        "حدث خطأ غير متوقع. حاول مرة أخرى.",
      );
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto my-6 grid min-h-[660px] max-w-5xl overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0b817a] p-9 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[25px] border-white/10" />
        <div className="absolute -bottom-24 right-[8%] h-56 w-56 rounded-full bg-[#ffc985]/18" />

        <Link
          href="/"
          className="relative inline-flex items-center gap-2 font-bold"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0b817a]">
            ج
          </span>
          جسر الأردن
        </Link>

        <div className="relative">
          <KeyRound className="h-10 w-10 text-[#ffc985]" />

          <p className="mt-6 text-[10px] font-bold tracking-[.08em] text-[#c9eee8]">
            آخر خطوة
          </p>

          <h1 className="mt-2 text-4xl font-bold leading-[1.15] tracking-[-.055em]">
            كلمة جديدة،
            <br />
            <span className="text-[#ffc985]">
              وحسابك رجع إلك.
            </span>
          </h1>

          <p className="mt-4 max-w-sm text-xs leading-7 text-[#d9f2ee]">
            اختر كلمة مرور جديدة وقوية. رابط الاستعادة
            أنشأ جلسة مؤقتة تسمح بتحديث كلمة المرور لهذا
            الحساب فقط.
          </p>
        </div>

        <span className="relative flex items-center gap-1.5 text-[9px] text-white/65">
          <ShieldCheck size={13} />
          تحديث كلمة المرور عبر جلسة Supabase الآمنة
        </span>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white">
              ج
            </span>
            جسر الأردن
          </Link>

          <p className="text-[10px] font-bold text-brand">
            استعادة الحساب
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">
            عيّن كلمة مرور جديدة
          </h2>

          <p className="mt-2 text-xs leading-6 text-muted">
            استخدم كلمة مرور لا تستعملها في حسابات أخرى.
          </p>

          {success ? (
            <div className="mt-7 rounded-[1.7rem] border border-[rgb(var(--success)/0.25)] bg-[rgb(var(--success)/0.06)] p-6 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[rgb(var(--success))]" />

              <h3 className="mt-4 text-lg font-bold">
                تم تحديث كلمة المرور
              </h3>

              <p className="mt-2 text-xs leading-6 text-muted">
                انتهت العملية بنجاح. سيتم تحويلك إلى تسجيل
                الدخول.
              </p>

              <Link
                href="/login"
                className="brand-button mt-5 w-full"
              >
                تسجيل الدخول الآن
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleUpdatePassword}
              className="mt-7 space-y-5"
            >
              {error && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs leading-6 text-[rgb(var(--danger))]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <label className="block text-xs font-bold">
                كلمة المرور الجديدة
                <div className="relative mt-1.5">
                  <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

                  <input
                    minLength={8}
                    maxLength={128}
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    className="form-field px-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
                    aria-label={
                      showPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <label className="block text-xs font-bold">
                تأكيد كلمة المرور
                <div className="relative mt-1.5">
                  <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

                  <input
                    minLength={8}
                    maxLength={128}
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="••••••••"
                    className="form-field px-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value,
                      )
                    }
                    className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
                    aria-label={
                      showConfirmPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

              <div className="grid gap-1 text-[9px] text-muted">
                {checks.map(([label, ok]) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full ${
                        ok
                          ? "bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]"
                          : "bg-surface-muted"
                      }`}
                    >
                      {ok && <Check size={10} />}
                    </span>
                    {label}
                  </span>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="brand-button w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}

                {loading
                  ? "جارٍ تحديث كلمة المرور..."
                  : "حفظ كلمة المرور الجديدة"}
              </button>

              <Link
                href="/forgot-password"
                className="block text-center text-[10px] font-bold text-brand"
              >
                رابط الاستعادة انتهى؟ اطلب رابطاً جديداً
              </Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
