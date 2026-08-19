"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import OtpInput from "@/components/auth/otp-input";
import { requestEmailOtpAction, verifyEmailOtpAction } from "@/lib/actions/auth";

export default function EmailOtpPage() {
  const router = useRouter(); const search = useSearchParams();
  const mode = search.get("mode") === "signup" ? "signup" as const : "login" as const;
  const [email, setEmail] = useState(""); const [token, setToken] = useState(""); const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { if (countdown <= 0) return; const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000); return () => window.clearTimeout(timer); }, [countdown]);
  async function request() { setPending(true); setMessage(""); const result = await requestEmailOtpAction({ email, mode }); setPending(false); if (!result.success) { setMessage(result.error || "تعذر إرسال الرمز"); return; } setSent(true); setCountdown(60); setMessage("إذا كان البريد مؤهلاً، سيصل إليه رمز من 6 أرقام."); }
  async function verify() { setPending(true); setMessage(""); const result = await verifyEmailOtpAction({ email, token, mode }); setPending(false); if (!result.success) { setMessage(result.error || "تعذر التحقق من الرمز"); return; } router.replace("/"); router.refresh(); }
  return <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10"><section className="w-full border-y border-theme bg-surface py-7 sm:border sm:p-7">
    <p className="text-xs font-bold text-brand">دخول آمن دون كلمة مرور</p><h1 className="mt-2 text-2xl font-black">رمز عبر البريد الإلكتروني</h1><p className="mt-2 text-sm leading-7 text-muted">{mode === "signup" ? "أدخل بريد التسجيل لتأكيد الحساب بالرمز المرسل." : "سنرسل رمزاً مؤقتاً إذا كان الحساب موجوداً ومؤهلاً."}</p>
    <label className="mt-6 block text-sm font-bold">البريد الإلكتروني<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={sent} className="form-field mt-1.5" /></label>
    {!sent ? <button type="button" onClick={request} disabled={pending || !email} className="brand-button mt-4 w-full">{pending ? "جارٍ الإرسال..." : "أرسل رمز الدخول"}</button> : <div className="mt-6"><OtpInput value={token} onChange={setToken} disabled={pending} /><button type="button" onClick={verify} disabled={pending || token.length !== 6} className="brand-button mt-4 w-full">{pending ? "جارٍ التحقق..." : "تحقق وتابع"}</button><button type="button" onClick={request} disabled={pending || countdown > 0} className="mt-3 w-full text-xs font-bold text-brand">{countdown > 0 ? `إعادة الإرسال بعد ${countdown} ثانية` : "إعادة إرسال الرمز"}</button></div>}
    {message && <p role="status" aria-live="polite" className="mt-4 text-xs leading-6 text-muted">{message}</p>}<Link href="/login" className="mt-5 block text-center text-xs font-bold text-brand">العودة إلى كلمة المرور</Link>
  </section></main>;
}
