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
  User,
  UserPlus,
} from "lucide-react";
import { registerAction } from "@/lib/actions/auth";


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
    ["8 أحرف على الأقل", password.length >= 8],
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

  return (
    <main className="mx-auto my-5 grid min-h-[720px] max-w-6xl overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft lg:grid-cols-2">
      <AuthVisual mode="register" />

      <section className="flex items-center p-5 sm:p-9 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white">ج</span>
            جسر الأردن
          </Link>

          <p className="text-[10px] font-bold text-brand">إنشاء حساب</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.05em]">أهلاً في جسر 👋</h1>
          <p className="mt-2 text-xs leading-6 text-muted">حساب واحد للحجوزات والرسائل والمفضلة وعروض الأسعار.</p>

          {success ? (
            <div className="mt-7 rounded-[1.7rem] border border-[rgb(var(--success)/0.25)] bg-[rgb(var(--success)/0.06)] p-6 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[rgb(var(--success))]" />
              <h2 className="mt-4 text-lg font-bold">تم إنشاء الحساب</h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                {requiresConfirmation
                  ? "تفقد بريدك الإلكتروني. إذا وصلك رمز من 6 أرقام، أكّد حسابك من الشاشة التالية."
                  : "تم التسجيل، وسيتم تحويلك لتسجيل الدخول."}
              </p>
              {requiresConfirmation && (
                <Link href="/login/otp?mode=signup" className="brand-button mt-5 w-full">
                  تأكيد الحساب برمز البريد
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="mt-7 space-y-4">
              {error && (
                <div role="alert" className="flex gap-2 rounded-2xl bg-[rgb(var(--danger)/0.08)] p-4 text-xs text-[rgb(var(--danger))]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <label className="block text-xs font-bold">
                الاسم الكامل
                <div className="relative mt-1.5">
                  <User className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="محمد العمري"
                    className="form-field pe-10"
                  />
                </div>
              </label>

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
                كلمة المرور
                <div className="relative mt-1.5">
                  <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-field px-10"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="block text-xs font-bold">
                تأكيد كلمة المرور
                <div className="relative mt-1.5">
                  <Lock className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    minLength={8}
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-field px-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted">
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="grid gap-1 text-[9px] text-muted">
                {passwordChecks.map(([label, ok]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]" : "bg-surface-muted"}`}>
                      {ok && <Check size={10} />}
                    </span>
                    {label}
                  </span>
                ))}
              </div>

              <button type="submit" disabled={loading} className="brand-button w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={16} />}
                {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-theme pt-5 text-center text-xs text-muted">
            عندك حساب؟{" "}
            <Link href="/login" className="font-bold text-brand">
              سجل دخولك
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
