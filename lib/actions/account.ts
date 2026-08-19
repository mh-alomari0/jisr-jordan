"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
} from "@/lib/supabase/server";

const DeleteConfirmationSchema = z.literal("حذف حسابي");

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestAccountDeletionAction(
  confirmation: string,
) {
  const parsed = DeleteConfirmationSchema.safeParse(
    confirmation.trim(),
  );

  if (!parsed.success) {
    return {
      success: false as const,
      error: 'اكتب "حذف حسابي" للتأكيد.',
    };
  }

  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return {
      success: false as const,
      error: "يجب تسجيل الدخول أولاً.",
    };
  }

  const { error } = await supabase
    .from("account_deletion_requests")
    .upsert(
      {
        user_id: user.id,
        status: "PENDING",
        requested_at: new Date().toISOString(),
        cancelled_at: null,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return {
      success: false as const,
      error: "تعذر تسجيل طلب حذف الحساب حالياً.",
    };
  }

  revalidatePath("/profile");
  return { success: true as const };
}
