"use server";

import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

/** Account deletion stays disabled until a trusted Auth Admin workflow can also delete auth.users. */
export async function deleteAccountAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false, error: "يجب تسجيل الدخول لإجراء هذه العملية" };
  return { success: false, error: "حذف الحساب غير متاح ذاتياً حالياً. يرجى التواصل مع الدعم لتقديم طلب حذف آمن." };
}
