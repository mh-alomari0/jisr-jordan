"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function deleteAccountAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled in middleware
          }
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "يجب تسجيل الدخول لإجراء هذه العملية" };
    }

    // 1. استدعاء دالة التجهيل والحذف من Postgres
    const { error: rpcError } = await supabase.rpc("delete_user_account_securely", {
      p_user_id: user.id,
    });

    if (rpcError) {
      logger.error(`Failed to delete user account: ${rpcError.message}`, {
        context: "DeleteAccount",
        userId: user.id,
      });
      return { success: false, error: "حدث خطأ أثناء مسح البيانات الشخصية" };
    }

    // 2. إغلاق الجلسة وتنظيف الكوكيز
    await supabase.auth.signOut();

    logger.info("User account safely anonymized and deleted", {
      context: "DeleteAccount",
      userId: user.id,
    });

    return { success: true };
  } catch (err) {
    logger.error("Internal error during account deletion", {
      context: "DeleteAccount",
      error: err,
    });
    return { success: false, error: "حدث خطأ غير متوقع في النظام" };
  }
}