"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import OtpInput from "@/components/auth/otp-input";
import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
} from "@/lib/actions/auth";

export default function EmailOtpPage() {
  const router = useRouter();
  const search = useSearchParams();
  const mode =
    search.get("mode") === "signup"
      ? ("signup" as const)
      : ("login" as const);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(
      () => setCountdown((v) => v - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function request() {
    setPending(true);
    setMessage("");

    const result = await requestEmailOtpAction({
      email,
      mode,
    });

    setPending(false);

    if (!result.success) {
      setMessage(result.error || "تعذر إرسال الرمز");
      return;
    }

    setSent(true);
    setCountdown(60);
    setMessage(
      "إذا كان البريد مؤهلاً، سيصل إليه رمز من 6 أرقام.",
    );
  }

  async function verify() {
    setPending(true);
    setMessage("");

    const result = await verifyEmailOtpAction({
      email,
      token,
      mode,
    });

    setPending(false);

    if (!result.success) {
      setMessage(result.error || "تعذر التحقق من الرمز");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-[680px] max-w-5xl overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft lg:my-8 lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0b817a] p-9 text-white lg:block">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[25px] border-white/10" />
        <div className="relative flex h-full flex-col justify-between">
          <Link href="/" className="font-bold">جسر الأردن</Link>
          <div>
            <KeyRound className="h-9 w-9 text-[#ffc985]" />
            <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">دخول آمن</p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-.055em]">رمز مؤقت.<br /><span className="text-[#ffc985]">وخلصنا.</span></h1>
            <p className="mt-4 text-xs leading-7 text-[#d9f2ee]">الرمز صالح لفترة محدودة، وما بنطلب منك تشاركه مع أي شخص.</p>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] text-white/65"><ShieldCheck size={13}/>تسجيل دخول محمي</span>
        </div>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[10px] font-bold text-brand">
            {mode === "signup" ? "تأكيد الحساب" : "دخول برمز"}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">تحقق من بريدك</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {mode === "signup"
              ? "استخدم بريد التسجيل حتى نؤكد حسابك."
              : "سنرسل رمزاً مؤقتاً إذا كان الحساب موجوداً ومؤهلاً."}
          </p>

          <label className="mt-7 block text-xs font-bold">
            البريد الإلكتروني
            <div className="relative mt-1.5">
              <Mail className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sent}
                className="form-field pe-10"
              />
            </div>
          </label>

          {!sent ? (
            <button
              type="button"
              onClick={request}
              disabled={pending || !email}
              className="brand-button mt-4 w-full"
            >
              {pending ? "جارٍ الإرسال..." : "أرسل الرمز"}
            </button>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-[10px] font-bold text-muted">
                أدخل الرمز المكوّن من 6 أرقام
              </p>
              <OtpInput
                value={token}
                onChange={setToken}
                disabled={pending}
              />

              <button
                type="button"
                onClick={verify}
                disabled={pending || token.length !== 6}
                className="brand-button mt-5 w-full"
              >
                {pending ? "جارٍ التحقق..." : "تحقق وتابع"}
              </button>

              <button
                type="button"
                onClick={request}
                disabled={pending || countdown > 0}
                className="mt-3 w-full text-[10px] font-bold text-brand"
              >
                {countdown > 0
                  ? `إعادة الإرسال بعد ${countdown} ثانية`
                  : "إعادة إرسال الرمز"}
              </button>
            </div>
          )}

          {message && (
            <p role="status" className="mt-4 rounded-2xl bg-surface-muted p-3 text-[10px] leading-5 text-muted">
              {message}
            </p>
          )}

          <Link href="/login" className="mt-6 block text-center text-xs font-bold text-brand">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </section>
    </main>
  );
}
