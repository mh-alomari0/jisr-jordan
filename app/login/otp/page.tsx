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
  const mode = search.get("mode") === "signup" ? ("signup" as const) : ("login" as const);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function request() {
    setPending(true);
    setMessage("");

    const result = await requestEmailOtpAction({ email, mode });
    setPending(false);

    if (!result.success) {
      setMessage(result.error || "تعذر إرسال الرمز");
      return;
    }

    setSent(true);
    setCountdown(60);
    setMessage("إذا كان البريد مؤهلاً، رح يوصله رمز من 6 أرقام.");
  }

  async function verify() {
    setPending(true);
    setMessage("");

    const result = await verifyEmailOtpAction({ email, token, mode });
    setPending(false);

    if (!result.success) {
      setMessage(result.error || "تعذر التحقق من الرمز");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-[650px] max-w-5xl overflow-hidden border border-theme bg-surface lg:my-8 lg:grid-cols-[.9fr_1.1fr] lg:rounded-[1.75rem]">
      <aside className="hidden bg-[#0b817a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-sm font-bold">جسر الأردن</Link>

        <div className="max-w-sm">
          <KeyRound className="h-9 w-9 text-[#ffc985]" />
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">رمز مؤقت</p>
          <h1 className="mt-2 text-4xl font-bold leading-[1.16] tracking-[-.055em]">
            ست أرقام،
            <br />
            وبنكمّل.
          </h1>
          <p className="mt-4 text-xs leading-7 text-[#d9f2ee]">
            الرمز مدته محدودة. خليه إلك وما تشاركه مع أي حدا.
          </p>
        </div>

        <span className="flex items-center gap-1.5 text-[9px] text-white/65">
          <ShieldCheck size={13} /> دخول محمي
        </span>
      </aside>

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[10px] font-bold text-brand">
            {mode === "signup" ? "تأكيد الحساب" : "دخول برمز"}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">
            شيّك على بريدك
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {mode === "signup"
              ? "استخدم نفس البريد اللي سجلت فيه حتى نأكد حسابك."
              : "اكتب بريدك وبنبعث رمز مؤقت إذا الحساب مؤهل."}
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
                onChange={(event) => setEmail(event.target.value)}
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
              {pending ? "جارٍ الإرسال..." : "ابعث الرمز"}
            </button>
          ) : (
            <div className="mt-6 border-t border-theme pt-6">
              <p className="mb-3 text-[10px] font-bold text-muted">
                أدخل الرمز المكوّن من 6 أرقام
              </p>
              <OtpInput value={token} onChange={setToken} disabled={pending} />

              <button
                type="button"
                onClick={verify}
                disabled={pending || token.length !== 6}
                className="brand-button mt-5 w-full"
              >
                {pending ? "جارٍ التحقق..." : "تأكيد ومتابعة"}
              </button>

              <button
                type="button"
                onClick={request}
                disabled={pending || countdown > 0}
                className="mt-3 w-full text-[10px] font-bold text-brand disabled:text-muted"
              >
                {countdown > 0
                  ? `بتقدر تعيد الإرسال بعد ${countdown} ثانية`
                  : "إعادة إرسال الرمز"}
              </button>
            </div>
          )}

          {message && (
            <p role="status" className="mt-4 border-s-2 border-theme bg-surface-muted px-3 py-2.5 text-[10px] leading-5 text-muted">
              {message}
            </p>
          )}

          <Link href="/login" className="mt-6 block text-center text-xs font-bold text-brand">
            رجوع لتسجيل الدخول
          </Link>
        </div>
      </section>
    </main>
  );
}
