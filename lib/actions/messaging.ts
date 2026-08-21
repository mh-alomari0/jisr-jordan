"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
} from "@/lib/supabase/server";

const IMAGE_LIMIT = 25 * 1024 * 1024;
const AUDIO_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 500 * 1024 * 1024;
const MAX_MEDIA_LIMIT = VIDEO_LIMIT;

const IdSchema = z.string().uuid();

const MessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "اكتب رسالة أولاً").max(4000),
  replyToMessageId: z.string().uuid().nullable().optional(),
});

const MediaSchema = z.object({
  conversationId: z.string().uuid(),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
  ]),
  sizeBytes: z.number().int().positive().max(MAX_MEDIA_LIMIT),
});

const SendMediaSchema = MediaSchema.extend({
  path: z.string().min(20).max(500),
  caption: z.string().trim().max(1000).optional(),
  replyToMessageId: z.string().uuid().nullable().optional(),
});

export interface ConversationInboxItem {
  conversation_id: string;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar_path: string | null;
  counterpart_avatar_url: string | null;
  counterpart_verified: boolean;
  listing_id: string | null;
  listing_title: string | null;
  booking_id: string | null;
  last_message_type: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  pinned_at: string | null;
  archived_at: string | null;
  muted_until: string | null;
}

export interface MessageReactionSummary {
  reaction: "LIKE" | "LOVE" | "LAUGH" | "WOW" | "SAD";
  count: number;
  reacted_by_me: boolean;
}

export interface ConversationMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type:
    | "TEXT"
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "SYSTEM"
    | "QUOTE"
    | "BOOKING_REFERENCE";
  body: string | null;
  media_path: string | null;
  media_type: string | null;
  media_url: string | null;
  moderation_status: string;
  created_at: string;
  reply_to_message_id: string | null;
  reply_preview: string | null;
  reply_message_type: string | null;
  is_deleted_for_everyone: boolean;
  reactions: MessageReactionSummary[];
}

function publicMarketplaceMediaUrl(path: string | null) {
  if (!path) return null;
  const origin = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `${origin}/storage/v1/object/public/marketplace-public/${safePath}`;
}

function rpcMessage(errorCode?: string) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "يجب تسجيل الدخول",
    OWN_PROFILE: "ما بتقدر تبدأ محادثة مع حسابك",
    PROVIDER_NOT_AVAILABLE: "مقدم الخدمة مش متاح للمراسلة حالياً",
    LISTING_NOT_AVAILABLE: "الخدمة مش متاحة للمراسلة حالياً",
    BOOKING_NOT_AVAILABLE: "الحجز مش متاح لهاي المحادثة",
    CONVERSATION_NOT_FOUND: "المحادثة مش موجودة أو ما بتخص حسابك",
    CONVERSATION_CLOSED: "هاي المحادثة مغلقة",
    CONTACT_NOT_ALLOWED:
      "خلّي التواصل والطلب داخل جسر لحد ما يتم تأكيد الحجز 🤝",
    INVALID_MESSAGE: "الرسالة مش صالحة",
    INVALID_MEDIA_PATH: "مسار الملف مش صالح",
    MEDIA_NOT_FOUND: "الملف مش موجود",
    INVALID_IMAGE: "الصورة غير مدعومة أو أكبر من 25 ميجابايت",
    INVALID_VIDEO: "الفيديو غير مدعوم أو أكبر من 500 ميجابايت",
    INVALID_AUDIO: "التسجيل الصوتي غير مدعوم أو أكبر من 25 ميجابايت",
    MEDIA_TYPE_MISMATCH: "نوع الملف المرفوع ما بطابق الملف اللي اخترته",
  };

  return messages[errorCode || ""] || "صار معنا مشكلة. جرّب مرة ثانية.";
}

export async function createConversationAction(input: {
  providerId: string;
  listingId?: string | null;
  bookingId?: string | null;
}) {
  const parsed = z
    .object({
      providerId: z.string().uuid(),
      listingId: z.string().uuid().nullable().optional(),
      bookingId: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "بيانات المحادثة مش صالحة" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false as const,
        error: "يجب تسجيل الدخول",
        requiresLogin: true as const,
      };
    }

    const rate = await checkRateLimit(`messages:create:${user.id}`, {
      limit: 12,
      windowMs: 60 * 60_000,
    });

    if (!rate.success) {
      return { success: false as const, error: rate.error };
    }

    const { data, error } = await supabase.rpc(
      "create_marketplace_conversation",
      {
        p_provider_id: parsed.data.providerId,
        p_listing_id: parsed.data.listingId || null,
        p_booking_id: parsed.data.bookingId || null,
      },
    );

    if (error || !data?.success) {
      return {
        success: false as const,
        error: rpcMessage(data?.error),
      };
    }

    revalidatePath("/messages");

    return {
      success: true as const,
      conversationId: data.conversation_id as string,
    };
  } catch (error) {
    logger.error("Conversation creation failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر بدء المحادثة",
    };
  }
}

export async function getConversationInboxAction(input?: {
  archived?: boolean;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false as const,
        error: "يجب تسجيل الدخول",
        conversations: [] as ConversationInboxItem[],
      };
    }

    const { data, error } = await supabase.rpc(
      "get_my_conversation_inbox_v2",
      {
        p_limit: 40,
        p_archived: Boolean(input?.archived),
      },
    );

    if (error) {
      return {
        success: false as const,
        error: "تعذر تحميل المحادثات",
        conversations: [] as ConversationInboxItem[],
      };
    }

    const conversations = (
      (data || []) as Omit<
        ConversationInboxItem,
        "counterpart_avatar_url"
      >[]
    ).map((item) => ({
      ...item,
      unread_count: Number(item.unread_count || 0),
      counterpart_avatar_url: publicMarketplaceMediaUrl(
        item.counterpart_avatar_path,
      ),
    }));

    return { success: true as const, conversations };
  } catch (error) {
    logger.error("Conversation inbox load failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر تحميل المحادثات",
      conversations: [] as ConversationInboxItem[],
    };
  }
}

export async function getConversationAction(
  conversationId: string,
  before?: string | null,
) {
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      before: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .optional(),
    })
    .safeParse({ conversationId, before });

  if (!parsed.success) {
    return {
      success: false as const,
      error: "معرف المحادثة مش صالح",
      messages: [] as ConversationMessageItem[],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false as const,
        error: "يجب تسجيل الدخول",
        messages: [] as ConversationMessageItem[],
      };
    }

    const { data: context, error: contextError } = await supabase.rpc(
      "get_my_conversation_context",
      { p_conversation_id: conversationId },
    );

    if (contextError || !context) {
      return {
        success: false as const,
        error: "المحادثة مش موجودة أو ما بتخص حسابك",
        messages: [] as ConversationMessageItem[],
      };
    }

    let query = supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, sender_id, message_type, body, media_path, media_type, moderation_status, created_at, reply_to_message_id, reply_preview, reply_message_type, is_deleted_for_everyone",
      )
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(31);

    if (parsed.data.before) {
      query = query.lt("created_at", parsed.data.before);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false as const,
        error: "تعذر تحميل الرسائل",
        messages: [] as ConversationMessageItem[],
      };
    }

    const rows = data || [];
    const hasMore = rows.length > 30;
    const pageRows = rows.slice(0, 30);

    const pageIds = pageRows.map((message) => message.id);

    const { data: reactionRows } = pageIds.length
      ? await supabase
          .from("conversation_message_reactions")
          .select("message_id, user_id, reaction")
          .in("message_id", pageIds)
      : { data: [] as { message_id: string; user_id: string; reaction: string }[] };

    const reactionMap = new Map<
      string,
      Map<string, { count: number; reacted_by_me: boolean }>
    >();

    for (const row of reactionRows || []) {
      const perMessage =
        reactionMap.get(row.message_id) ||
        new Map<string, { count: number; reacted_by_me: boolean }>();

      const current = perMessage.get(row.reaction) || {
        count: 0,
        reacted_by_me: false,
      };

      current.count += 1;
      if (row.user_id === user.id) current.reacted_by_me = true;

      perMessage.set(row.reaction, current);
      reactionMap.set(row.message_id, perMessage);
    }

    const signed = await Promise.all(
      pageRows.map(async (message) => {
        let mediaUrl: string | null = null;

        if (message.media_path && !message.is_deleted_for_everyone) {
          const { data: url } = await supabase.storage
            .from("message-private")
            .createSignedUrl(message.media_path, 60 * 60);

          mediaUrl = url?.signedUrl || null;
        }

        const reactions = Array.from(
          reactionMap.get(message.id)?.entries() || [],
        ).map(([reaction, summary]) => ({
          reaction: reaction as MessageReactionSummary["reaction"],
          count: summary.count,
          reacted_by_me: summary.reacted_by_me,
        }));

        return {
          ...message,
          media_url: mediaUrl,
          reactions,
        } as ConversationMessageItem;
      }),
    );

    return {
      success: true as const,
      currentUserId: user.id,
      context: {
        ...(context as Record<string, unknown>),
        counterpart_avatar_url: publicMarketplaceMediaUrl(
          String(
            (context as Record<string, unknown>)
              .counterpart_avatar_path || "",
          ),
        ),
      },
      messages: signed.reverse(),
      hasMore,
      nextCursor: hasMore
        ? String(pageRows[pageRows.length - 1]?.created_at || "")
        : null,
    };
  } catch (error) {
    logger.error("Conversation load failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر تحميل المحادثة",
      messages: [] as ConversationMessageItem[],
    };
  }
}

export async function sendTextMessageAction(
  input: z.input<typeof MessageSchema>,
) {
  const parsed = MessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error:
        parsed.error.issues[0]?.message ||
        "الرسالة مش صالحة",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const rate = await checkRateLimit(`messages:send:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });

    if (!rate.success) {
      return { success: false as const, error: rate.error };
    }

    const { data, error } = await supabase.rpc(
      "send_conversation_message_v2",
      {
        p_conversation_id: parsed.data.conversationId,
        p_message_type: "TEXT",
        p_body: parsed.data.body,
        p_media_path: null,
        p_media_type: null,
        p_media_metadata: {},
        p_reply_to_message_id: parsed.data.replyToMessageId || null,
      },
    );

    if (error || !data?.success) {
      return {
        success: false as const,
        error: rpcMessage(data?.error),
        contactBlocked:
          data?.error === "CONTACT_NOT_ALLOWED",
      };
    }

    revalidatePath(
      `/messages/${parsed.data.conversationId}`,
    );
    revalidatePath("/messages");

    return {
      success: true as const,
      messageId: data.message_id as string,
    };
  } catch (error) {
    logger.error("Message send failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر إرسال الرسالة",
    };
  }
}

export async function prepareMessageMediaUploadAction(
  input: z.input<typeof MediaSchema>,
) {
  const parsed = MediaSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "الملف غير مدعوم أو حجمه كبير",
    };
  }

  const isImage =
    parsed.data.mimeType.startsWith("image/");
  const isAudio =
    parsed.data.mimeType.startsWith("audio/");
  const limit = isImage
    ? IMAGE_LIMIT
    : isAudio
      ? AUDIO_LIMIT
      : VIDEO_LIMIT;

  if (parsed.data.sizeBytes > limit) {
    return {
      success: false as const,
      error: isImage
        ? "الصورة لازم تكون أقل من 25 ميجابايت"
        : isAudio
          ? "التسجيل الصوتي لازم يكون أقل من 25 ميجابايت"
          : "الفيديو لازم يكون أقل من 500 ميجابايت",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const rate = await checkRateLimit(`messages:media:${user.id}`, {
      limit: 30,
      windowMs: 60 * 60_000,
    });

    if (!rate.success) {
      return { success: false as const, error: rate.error };
    }

    const { data: context } = await supabase.rpc(
      "get_my_conversation_context",
      { p_conversation_id: parsed.data.conversationId },
    );

    if (!context) {
      return {
        success: false as const,
        error: "المحادثة مش موجودة أو ما بتخص حسابك",
      };
    }

    const extension: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
    };

    const path =
      `${parsed.data.conversationId}/${user.id}/` +
      `${randomUUID()}.${extension[parsed.data.mimeType]}`;

    const { data, error } = await supabase.storage
      .from("message-private")
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      return {
        success: false as const,
        error: "تعذر تجهيز الرفع الآمن",
      };
    }

    return {
      success: true as const,
      bucket: "message-private" as const,
      path: data.path,
      token: data.token,
    };
  } catch (error) {
    logger.error("Message media preparation failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر تجهيز الملف",
    };
  }
}

export async function sendMediaMessageAction(
  input: z.input<typeof SendMediaSchema>,
) {
  const parsed = SendMediaSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "بيانات الملف مش صالحة",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const messageType =
      parsed.data.mimeType.startsWith("image/")
        ? "IMAGE"
        : parsed.data.mimeType.startsWith("audio/")
          ? "AUDIO"
          : "VIDEO";

    const { data, error } = await supabase.rpc(
      "send_conversation_message_v2",
      {
        p_conversation_id: parsed.data.conversationId,
        p_message_type: messageType,
        p_body: parsed.data.caption || null,
        p_media_path: parsed.data.path,
        p_media_type: parsed.data.mimeType,
        p_media_metadata: {
          size: parsed.data.sizeBytes,
        },
        p_reply_to_message_id: parsed.data.replyToMessageId || null,
      },
    );

    if (error || !data?.success) {
      await supabase.storage
        .from("message-private")
        .remove([parsed.data.path]);

      return {
        success: false as const,
        error: rpcMessage(data?.error),
      };
    }

    revalidatePath(
      `/messages/${parsed.data.conversationId}`,
    );
    revalidatePath("/messages");

    return {
      success: true as const,
      messageId: data.message_id as string,
    };
  } catch (error) {
    logger.error("Message media send failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "تعذر إرسال الملف",
    };
  }
}

export async function markConversationReadAction(
  conversationId: string,
) {
  if (!IdSchema.safeParse(conversationId).success) {
    return { success: false as const };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.rpc(
      "mark_conversation_read",
      { p_conversation_id: conversationId },
    );

    return { success: Boolean(data?.success) };
  } catch {
    return { success: false as const };
  }
}

export async function reportMessageAction(
  messageId: string,
  reason:
    | "CONTACT_SHARING"
    | "EXTERNAL_PAYMENT"
    | "SPAM"
    | "HARASSMENT"
    | "UNSAFE_CONTENT"
    | "OTHER",
) {
  if (!IdSchema.safeParse(messageId).success) {
    return {
      success: false as const,
      error: "الرسالة مش صالحة",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const rate = await checkRateLimit(`messages:report:${user.id}`, {
      limit: 10,
      windowMs: 60 * 60_000,
    });

    if (!rate.success) {
      return { success: false as const, error: rate.error };
    }

    const { data, error } = await supabase.rpc(
      "report_marketplace_content",
      {
        p_target_type: "MESSAGE",
        p_target_id: messageId,
        p_reason: reason,
        p_details: null,
      },
    );

    if (error || !data?.success) {
      return {
        success: false as const,
        error: "تعذر إرسال البلاغ",
      };
    }

    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "تعذر إرسال البلاغ",
    };
  }
}


const ReactionSchema = z.enum(["LIKE", "LOVE", "LAUGH", "WOW", "SAD"]);

export async function toggleMessageReactionAction(input: {
  messageId: string;
  reaction: z.infer<typeof ReactionSchema>;
}) {
  const parsed = z
    .object({
      messageId: z.string().uuid(),
      reaction: ReactionSchema,
    })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "التفاعل مش صالح" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const rate = await checkRateLimit(`messages:reaction:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });

    if (!rate.success) {
      return { success: false as const, error: rate.error };
    }

    const { data, error } = await supabase.rpc(
      "toggle_message_reaction",
      {
        p_message_id: parsed.data.messageId,
        p_reaction: parsed.data.reaction,
      },
    );

    if (error || !data?.success) {
      return {
        success: false as const,
        error: "ما قدرنا نحفظ التفاعل",
      };
    }

    return { success: true as const };
  } catch (error) {
    logger.error("Message reaction failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "ما قدرنا نحفظ التفاعل",
    };
  }
}

export async function deleteMessageForEveryoneAction(
  messageId: string,
) {
  if (!IdSchema.safeParse(messageId).success) {
    return {
      success: false as const,
      error: "الرسالة مش صالحة",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const { data, error } = await supabase.rpc(
      "delete_my_message_for_everyone",
      { p_message_id: messageId },
    );

    if (error || !data?.success) {
      const code = data?.error as string | undefined;

      return {
        success: false as const,
        error:
          code === "DELETE_WINDOW_EXPIRED"
            ? "مر وقت حذف الرسالة للجميع."
            : code === "MESSAGE_NOT_FOUND"
              ? "الرسالة مش موجودة."
              : "ما قدرنا نحذف الرسالة.",
      };
    }

    revalidatePath("/messages");

    return { success: true as const };
  } catch (error) {
    logger.error("Delete message for everyone failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "ما قدرنا نحذف الرسالة.",
    };
  }
}

export async function setConversationTypingAction(
  conversationId: string,
) {
  if (!IdSchema.safeParse(conversationId).success) {
    return { success: false as const };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) return { success: false as const };

    const rate = await checkRateLimit(`messages:typing:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });

    if (!rate.success) return { success: false as const };

    const { data } = await supabase.rpc("set_conversation_typing", {
      p_conversation_id: conversationId,
    });

    return { success: Boolean(data?.success) };
  } catch {
    return { success: false as const };
  }
}


export interface ConversationSearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  body: string | null;
  created_at: string;
}

export async function searchConversationMessagesAction(input: {
  conversationId: string;
  query: string;
}) {
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      query: z.string().trim().min(2).max(80),
    })
    .safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "اكتب كلمتين على الأقل.",
      results: [] as ConversationSearchResult[],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return {
        success: false as const,
        error: "يجب تسجيل الدخول",
        results: [] as ConversationSearchResult[],
      };
    }

    const rate = await checkRateLimit(
      `messages:search:${user.id}`,
      { limit: 30, windowMs: 60_000 },
    );

    if (!rate.success) {
      return {
        success: false as const,
        error: rate.error,
        results: [] as ConversationSearchResult[],
      };
    }

    const { data: context } = await supabase.rpc(
      "get_my_conversation_context",
      { p_conversation_id: parsed.data.conversationId },
    );

    if (!context) {
      return {
        success: false as const,
        error: "المحادثة مش موجودة.",
        results: [] as ConversationSearchResult[],
      };
    }

    const escaped = parsed.data.query
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");

    const { data, error } = await supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, sender_id, message_type, body, created_at",
      )
      .eq("conversation_id", parsed.data.conversationId)
      .eq("is_deleted_for_everyone", false)
      .is("deleted_at", null)
      .ilike("body", `%${escaped}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return {
        success: false as const,
        error: "ما قدرنا نبحث بالمحادثة.",
        results: [] as ConversationSearchResult[],
      };
    }

    return {
      success: true as const,
      results: (data || []) as ConversationSearchResult[],
    };
  } catch (error) {
    logger.error("Conversation search failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "ما قدرنا نبحث بالمحادثة.",
      results: [] as ConversationSearchResult[],
    };
  }
}

export async function updateConversationPreferenceAction(input: {
  conversationId: string;
  action:
    | "PIN"
    | "UNPIN"
    | "ARCHIVE"
    | "UNARCHIVE"
    | "MUTE_8H"
    | "MUTE_7D"
    | "UNMUTE";
}) {
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      action: z.enum([
        "PIN",
        "UNPIN",
        "ARCHIVE",
        "UNARCHIVE",
        "MUTE_8H",
        "MUTE_7D",
        "UNMUTE",
      ]),
    })
    .safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "الطلب مش صالح.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return { success: false as const, error: "يجب تسجيل الدخول" };
    }

    const { data, error } = await supabase.rpc(
      "set_my_conversation_preference",
      {
        p_conversation_id: parsed.data.conversationId,
        p_action: parsed.data.action,
      },
    );

    if (error || !data?.success) {
      return {
        success: false as const,
        error: "ما قدرنا نحفظ التغيير.",
      };
    }

    revalidatePath("/messages");

    return { success: true as const };
  } catch (error) {
    logger.error("Conversation preference update failed", {
      context: "Messaging",
      error,
    });

    return {
      success: false as const,
      error: "ما قدرنا نحفظ التغيير.",
    };
  }
}
