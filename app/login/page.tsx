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


function AuthVisual({ mode }: { mode: "login" | "register" | "otp" | "forgot" }) {
  const content = {
    login: {
      eyebrow: "أهلاً برجعتك",
      title: "ارجع كمّل من وين وقفت.",
      copy: "طلباتك، رسائلك، مقدمو الخدمة والمفضلة — كلها محفوظة بحسابك.",
    },
    register: {
      eyebrow: "أول خطوة على جسر",
      title: "اعمل حسابك وخلّي الباقي علينا.",
      copy: "احجز خدمات، قارن بين مقدمي الخدمة، وتابع كل طلب من مكان واحد.",
    },
    otp: {
      eyebrow: "دخول أسرع",
      title: "رمز واحد، وبتكون جوّا.",
      copy: "بنرسل رمز مؤقت لبريدك حتى تدخل أو تأكد حسابك بدون ما تحتاج كلمة المرور.",
    },
    forgot: {
      eyebrow: "استرجاع آمن",
      title: "ولا يهمك، رجّع حسابك بسهولة.",
      copy: "أدخل بريدك وبنبعثلك رابط استعادة آمن لإعادة تعيين كلمة المرور.",
    },
  }[mode];

  return (
    <aside className="relative hidden overflow-hidden bg-[#0b817a] p-10 text-white lg:flex lg:min-h-[720px] lg:flex-col lg:justify-between">
      <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full border-[30px] border-white/10" />
      <div className="absolute -bottom-32 right-[-20px] h-72 w-72 rounded-full bg-[#ffc985]/18" />
      <div className="absolute right-[18%] top-[42%] h-28 w-28 rounded-full border-[16px] border-[#f7a48e]/20" />
      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0b817a]">ج</span>
          جسر الأردن
        </Link>
      </div>
      <div className="relative max-w-md">
        <p className="text-[10px] font-bold tracking-[.08em] text-[#c9eee8]">{content.eyebrow}</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.15] tracking-[-.06em] xl:text-5xl">{content.title}</h2>
        <p className="mt-5 text-sm leading-8 text-[#d9f2ee]">{content.copy}</p>
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[9px]">
          <span className="rounded-2xl border border-white/15 bg-white/10 px-2 py-3">حساب آمن</span>
          <span className="rounded-2xl border border-white/15 bg-white/10 px-2 py-3">بياناتك محفوظة</span>
          <span className="rounded-2xl border border-white/15 bg-white/10 px-2 py-3">تواصل داخل جسر</span>
        </div>
      </div>
      <p className="relative text-[9px] text-white/55">جسر الأردن · خدمات ومهارات من ناس حقيقيين</p>
    </aside>
  );
}


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect =
    searchParams.get("redirectTo") || searchParams.get("redirect");
  const authError = searchParams.get("authError");

  const redirectTo =
    requestedRedirect?.startsWith("/") &&
    !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction({ email, password });

      if (!result.success) {
        setError(
          result.error ||
            "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.",
        );
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
        <div role="alert" className="rounded-2xl border border-[rgb(var(--warning)/0.35)] bg-[rgb(var(--warning)/0.08)] p-4 text-xs leading-6">
          رابط المصادقة غير صالح أو انتهت صلاحيته. اطلب رابطاً أو رمزاً جديداً.
        </div>
      )}

      {error && (
        <div role="alert" className="flex gap-2 rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs leading-6 text-[rgb(var(--danger))]">
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="form-field pe-10"
          />
        </div>
      </label>

      <label className="block text-xs font-bold">
        <span className="flex items-center justify-between">
          <span>كلمة المرور</span>
          <Link href="/forgot-password" className="text-[10px] font-bold text-brand">
            نسيت كلمة المرور؟
          </Link>
        </span>

        <div className="relative mt-1.5">
          <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-field px-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>

      <button type="submit" disabled={loading} className="brand-button w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn size={16} />}
        {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
      </button>

      <div className="flex items-center gap-3 text-[10px] text-muted">
        <span className="h-px flex-1 bg-[rgb(var(--border))]" />
        أو
        <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      </div>

      <Link href="/login/otp" className="secondary-button w-full">
        دخول برمز عبر البريد
      </Link>

      <p className="flex items-center justify-center gap-1.5 text-[9px] text-muted">
        <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
        نحمي جلسة الدخول ونعيدك للصفحة اللي كنت متجه إلها.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto my-5 grid min-h-[720px] max-w-6xl overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft lg:grid-cols-2">
      <AuthVisual mode="login" />

      <section className="flex items-center p-5 sm:p-10 lg:p-14">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white">ج</span>
            جسر الأردن
          </Link>

          <p className="text-[10px] font-bold text-brand">تسجيل الدخول</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.05em]">مرحباً برجعتك 👋</h1>
          <p className="mt-2 text-xs leading-6 text-muted">ادخل لحسابك وتابع كل شيء من مكان واحد.</p>

          <div className="mt-7">
            <Suspense fallback={<div className="py-10 text-center text-xs text-muted">جارٍ التحميل...</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-7 border-t border-theme pt-5 text-center text-xs text-muted">
            ما عندك حساب؟{" "}
            <Link href="/register" className="font-bold text-brand">
              أنشئ حساب جديد
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
