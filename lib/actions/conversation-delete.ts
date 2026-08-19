"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
} from "@/lib/supabase/server";

const ConversationIdSchema = z.string().uuid();

export async function deleteConversationAction(
  conversationId: string,
) {
  const parsed = ConversationIdSchema.safeParse(conversationId);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "معرف المحادثة غير صالح.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return {
      success: false as const,
      error: "يجب تسجيل الدخول.",
    };
  }

  const { data, error } = await supabase.rpc(
    "delete_my_conversation",
    { p_conversation_id: parsed.data },
  );

  if (error || !data?.success) {
    return {
      success: false as const,
      error:
        data?.error === "CONVERSATION_NOT_FOUND"
          ? "المحادثة غير موجودة أو لا تخص حسابك."
          : "تعذر حذف المحادثة.",
    };
  }

  revalidatePath("/messages");
  return { success: true as const };
}
