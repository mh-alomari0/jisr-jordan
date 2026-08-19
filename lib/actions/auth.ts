"use server";

import { headers } from "next/headers";
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

export async function loginAction(input: { email: string; password: string }) {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "بيانات الدخول غير صحيحة. يرجى التحقق والمحاولة مجدداً." };

  const networkKey = await requestNetworkKey();
  const rateLimit = await checkRateLimit(`auth:login:${networkKey}:${parsed.data.email}`, {
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
  const rateLimit = await checkRateLimit(`auth:register:${await requestNetworkKey()}:${parsed.data.email}`, {
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
  const rateLimit = await checkRateLimit(`auth:password-reset:${await requestNetworkKey()}:${parsed.data}`, {
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
