"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { getPublicAppOrigin } from "@/lib/app-url";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

const RegisterSchema = LoginSchema.extend({
  fullName: z.string().trim().min(2).max(100),
});

async function requestNetworkKey() {
  const requestHeaders = await headers();

  return (
    requestHeaders.get("x-vercel-forwarded-for") ||
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown-network"
  );
}

function authRateKey(network: string, email: string) {
  return createHash("sha256")
    .update(`${network}:${email}`)
    .digest("hex");
}

export async function loginAction(input: {
  email: string;
  password: string;
}) {
  const parsed = LoginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error:
        "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.",
    };
  }

  const networkKey = await requestNetworkKey();

  const rateLimit = await checkRateLimit(
    `auth:login:${authRateKey(
      networkKey,
      parsed.data.email,
    )}`,
    {
      limit: 5,
      windowMs: 15 * 60_000,
    },
  );

  if (!rateLimit.success) {
    return {
      success: false as const,
      error: rateLimit.error,
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } =
    await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return {
      success: false as const,
      error:
        "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.",
    };
  }

  /*
   * IMPORTANT:
   * This guard works together with Supabase Auth -> Confirm email = ON.
   * A password account must not enter Jisr before proving ownership
   * of the email address.
   */
  const provider = String(
    data.user.app_metadata?.provider || "email",
  );

  const passwordAccount = provider === "email";

  if (passwordAccount && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();

    return {
      success: false as const,
      requiresEmailVerification: true as const,
      error:
        "لسا بدنا نتأكد إن البريد إلك. افتح رمز التأكيد اللي بعثنالك.",
    };
  }

  return { success: true as const };
}

export async function registerAction(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  const parsed = RegisterSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error:
        "تعذر إكمال التسجيل. تحقق من البيانات وحاول مرة ثانية.",
    };
  }

  const rateLimit = await checkRateLimit(
    `auth:register:${authRateKey(
      await requestNetworkKey(),
      parsed.data.email,
    )}`,
    {
      limit: 3,
      windowMs: 60 * 60_000,
    },
  );

  if (!rateLimit.success) {
    return {
      success: false as const,
      error: rateLimit.error,
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/`,
    },
  });

  if (error) {
    return {
      success: false as const,
      error:
        "تعذر إكمال التسجيل. إذا عندك حساب جرّب تسجيل الدخول.",
    };
  }

  /*
   * If Confirm email is configured correctly in Supabase,
   * signUp() returns no session until the email is verified.
   *
   * If a session appears because the dashboard setting was
   * accidentally disabled, we immediately remove it so the
   * registration UI does not treat the account as ready.
   */
  if (data.session) {
    await supabase.auth.signOut();

    logger.warn(
      "Signup returned a session before email verification. Check Supabase Confirm email setting.",
      {
        context: "Auth",
        metadata: {
          userId: data.user?.id,
        },
      },
    );
  }

  return {
    success: true as const,
    requiresEmailConfirmation: true as const,
  };
}

export async function requestPasswordResetAction(
  email: string,
) {
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .safeParse(email);

  /*
   * Enumeration-safe behavior:
   * unknown and malformed emails get the same public response.
   */
  if (!parsed.success) {
    return { success: true as const };
  }

  const rateLimit = await checkRateLimit(
    `auth:password-reset:${authRateKey(
      await requestNetworkKey(),
      parsed.data,
    )}`,
    {
      limit: 3,
      windowMs: 60 * 60_000,
    },
  );

  if (!rateLimit.success) {
    return {
      success: false as const,
      error: rateLimit.error,
    };
  }

  const redirectTo =
    `${getPublicAppOrigin()}/auth/callback?next=` +
    encodeURIComponent("/reset-password");

  const supabase = await createServerSupabaseClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      parsed.data,
      { redirectTo },
    );

  if (error) {
    logger.warn(
      "Password reset provider request failed",
      {
        context: "Auth",
        metadata: { code: error.code },
      },
    );
  }

  return { success: true as const };
}

const OtpRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),
  mode: z
    .enum(["login", "signup"])
    .default("login"),
});

const OtpVerifySchema = OtpRequestSchema.extend({
  token: z.string().regex(/^\d{6}$/),
});

export async function requestEmailOtpAction(
  input: z.input<typeof OtpRequestSchema>,
) {
  const parsed = OtpRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { success: true as const };
  }

  const limit = await checkRateLimit(
    `auth:email-otp:${authRateKey(
      await requestNetworkKey(),
      parsed.data.email,
    )}`,
    {
      limit: 3,
      windowMs: 15 * 60_000,
    },
  );

  if (!limit.success) {
    return {
      success: false as const,
      error: limit.error,
    };
  }

  const supabase = await createServerSupabaseClient();

  const { error } =
    parsed.data.mode === "signup"
      ? await supabase.auth.resend({
          type: "signup",
          email: parsed.data.email,
          options: {
            emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/`,
          },
        })
      : await supabase.auth.signInWithOtp({
          email: parsed.data.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${getPublicAppOrigin()}/auth/callback?next=/`,
          },
        });

  if (error) {
    logger.warn("Email OTP provider request failed", {
      context: "Auth",
      metadata: {
        code: error.code,
        mode: parsed.data.mode,
      },
    });
  }

  /*
   * Same public response for existing and unknown accounts.
   * Do not reveal which emails are registered.
   */
  return { success: true as const };
}

export async function verifyEmailOtpAction(
  input: z.input<typeof OtpVerifySchema>,
) {
  const parsed = OtpVerifySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "الرمز غير صالح أو انتهت صلاحيته",
    };
  }

  const limit = await checkRateLimit(
    `auth:email-otp-verify:${authRateKey(
      await requestNetworkKey(),
      parsed.data.email,
    )}`,
    {
      limit: 8,
      windowMs: 15 * 60_000,
    },
  );

  if (!limit.success) {
    return {
      success: false as const,
      error: limit.error,
    };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type:
      parsed.data.mode === "signup"
        ? "signup"
        : "email",
  });

  if (error) {
    return {
      success: false as const,
      error: "الرمز غير صالح أو انتهت صلاحيته",
    };
  }

  return { success: true as const };
}
