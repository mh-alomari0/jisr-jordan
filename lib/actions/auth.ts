"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { getPublicAppOrigin } from "@/lib/app-url";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});
const RegisterSchema = LoginSchema.extend({ fullName: z.string().trim().min(2).max(100) });

async function requestNetworkKey() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-vercel-forwarded-for")
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || "unknown-network";
}

function authRateKey(network: string, email: string) {
  return createHash("sha256").update(`${network}:${email}`).digest("hex");
}

export async function loginAction(input: { email: string; password: string }) {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "بيانات الدخول غير صحيحة. يرجى التحقق والمحاولة مجدداً." };

  const networkKey = await requestNetworkKey();
  const rateLimit = await checkRateLimit(`auth:login:${authRateKey(networkKey, parsed.data.email)}`, {
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!rateLimit.success) return { success: false, error: rateLimit.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { success: false, error: "بيانات الدخول غير صحيحة. يرجى التحقق والمحاولة مجدداً." };
  return { success: true };
}

export async function registerAction(input: { fullName: string; email: string; password: string }) {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "تعذر إكمال التسجيل. تحقق من البيانات وحاول مجدداً." };
  const rateLimit = await checkRateLimit(`auth:register:${authRateKey(await requestNetworkKey(), parsed.data.email)}`, {
    limit: 3, windowMs: 60 * 60_000,
  });
  if (!rateLimit.success) return { success: false, error: rateLimit.error };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/`,
    },
  });
  if (error) return { success: false, error: "تعذر إكمال التسجيل. تحقق من البيانات أو حاول تسجيل الدخول إن كان لديك حساب." };
  return { success: true, requiresEmailConfirmation: !data.session };
}

export async function requestPasswordResetAction(email: string) {
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(email);
  if (!parsed.success) return { success: true };
  const rateLimit = await checkRateLimit(`auth:password-reset:${authRateKey(await requestNetworkKey(), parsed.data)}`, {
    limit: 3, windowMs: 60 * 60_000,
  });
  if (!rateLimit.success) return { success: false, error: rateLimit.error };
  const redirectTo = `${getPublicAppOrigin()}/auth/callback?next=/reset-password`;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo });
  if (error) logger.warn("Password reset provider request failed", { context: "Auth", metadata: { code: error.code } });
  // Identical response for existing, unknown, and provider-side failures.
  return { success: true };
}

const OtpRequestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), mode: z.enum(["login", "signup"]).default("login") });
const OtpVerifySchema = OtpRequestSchema.extend({ token: z.string().regex(/^\d{6}$/) });

export async function requestEmailOtpAction(input: z.input<typeof OtpRequestSchema>) {
  const parsed = OtpRequestSchema.safeParse(input);
  if (!parsed.success) return { success: true as const };
  const limit = await checkRateLimit(`auth:email-otp:${authRateKey(await requestNetworkKey(), parsed.data.email)}`, { limit: 3, windowMs: 15 * 60_000 });
  if (!limit.success) return { success: false as const, error: limit.error };
  const supabase = await createServerSupabaseClient();
  const { error } = parsed.data.mode === "signup"
    ? await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/` } })
    : await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { shouldCreateUser: false, emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/` } });
  if (error) logger.warn("Email OTP provider request failed", { context: "Auth", metadata: { code: error.code, mode: parsed.data.mode } });
  // The same response is returned for existing and unknown accounts.
  return { success: true as const };
}

export async function verifyEmailOtpAction(input: z.input<typeof OtpVerifySchema>) {
  const parsed = OtpVerifySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "الرمز غير صالح أو انتهت صلاحيته" };
  const limit = await checkRateLimit(`auth:email-otp-verify:${authRateKey(await requestNetworkKey(), parsed.data.email)}`, { limit: 8, windowMs: 15 * 60_000 });
  if (!limit.success) return { success: false as const, error: limit.error };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: parsed.data.mode === "signup" ? "signup" : "email" });
  if (error) return { success: false as const, error: "الرمز غير صالح أو انتهت صلاحيته" };
  return { success: true as const };
}
