"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

const IdSchema = z.string().uuid();
const MessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "اكتب رسالة أولاً").max(4000),
});
const MediaSchema = z.object({
  conversationId: z.string().uuid(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});
const SendMediaSchema = MediaSchema.extend({
  path: z.string().min(20).max(500),
  caption: z.string().trim().max(1000).optional(),
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
}

export interface ConversationMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: "TEXT" | "IMAGE" | "VIDEO" | "SYSTEM" | "QUOTE" | "BOOKING_REFERENCE";
  body: string | null;
  media_path: string | null;
  media_type: string | null;
  media_url: string | null;
  moderation_status: string;
  created_at: string;
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
    OWN_PROFILE: "لا يمكنك بدء محادثة مع حسابك",
    PROVIDER_NOT_AVAILABLE: "مقدم الخدمة غير متاح للمراسلة حالياً",
    LISTING_NOT_AVAILABLE: "الخدمة غير متاحة للمراسلة حالياً",
    BOOKING_NOT_AVAILABLE: "الحجز غير متاح لهذه المحادثة",
    CONVERSATION_NOT_FOUND: "المحادثة غير موجودة أو لا تخص حسابك",
    CONVERSATION_CLOSED: "هذه المحادثة مغلقة",
    CONTACT_NOT_ALLOWED: "للحفاظ على حقوقك، خلي التواصل والطلب داخل جسر لحد ما يتم تأكيد الحجز 🤝",
    INVALID_MESSAGE: "الرسالة غير صالحة",
    INVALID_MEDIA_PATH: "مسار المرفق غير صالح",
    MEDIA_NOT_FOUND: "المرفق غير موجود",
    INVALID_IMAGE: "الصورة غير مدعومة أو يتجاوز حجمها 8 ميجابايت",
    INVALID_VIDEO: "الفيديو غير مدعوم أو يتجاوز حجمه 25 ميجابايت",
    MEDIA_TYPE_MISMATCH: "نوع الملف المرفوع لا يطابق الملف المختار",
  };
  return messages[errorCode || ""] || "تعذر إتمام العملية حالياً";
}

export async function createConversationAction(input: { providerId: string; listingId?: string | null; bookingId?: string | null }) {
  const parsed = z.object({
    providerId: z.string().uuid(),
    listingId: z.string().uuid().nullable().optional(),
    bookingId: z.string().uuid().nullable().optional(),
  }).safeParse(input);
  if (!parsed.success) return { success: false as const, error: "بيانات المحادثة غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", requiresLogin: true as const };
    const rate = await checkRateLimit(`messages:create:${user.id}`, { limit: 12, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("create_marketplace_conversation", {
      p_provider_id: parsed.data.providerId,
      p_listing_id: parsed.data.listingId || null,
      p_booking_id: parsed.data.bookingId || null,
    });
    if (error || !data?.success) return { success: false as const, error: rpcMessage(data?.error) };
    revalidatePath("/messages");
    return { success: true as const, conversationId: data.conversation_id as string };
  } catch (error) {
    logger.error("Conversation creation failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر بدء المحادثة" };
  }
}

export async function getConversationInboxAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", conversations: [] as ConversationInboxItem[] };
    const { data, error } = await supabase.rpc("get_my_conversation_inbox", { p_limit: 40 });
    if (error) return { success: false as const, error: "تعذر تحميل المحادثات", conversations: [] as ConversationInboxItem[] };
    const conversations = ((data || []) as Omit<ConversationInboxItem, "counterpart_avatar_url">[]).map((item) => ({
      ...item,
      unread_count: Number(item.unread_count || 0),
      counterpart_avatar_url: publicMarketplaceMediaUrl(item.counterpart_avatar_path),
    }));
    return { success: true as const, conversations };
  } catch (error) {
    logger.error("Conversation inbox load failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر تحميل المحادثات", conversations: [] as ConversationInboxItem[] };
  }
}

export async function getConversationAction(conversationId: string, before?: string | null) {
  const parsed = z.object({ conversationId: z.string().uuid(), before: z.string().datetime({ offset: true }).nullable().optional() })
    .safeParse({ conversationId, before });
  if (!parsed.success) return { success: false as const, error: "معرف المحادثة غير صالح", messages: [] as ConversationMessageItem[] };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", messages: [] as ConversationMessageItem[] };
    const { data: context, error: contextError } = await supabase.rpc("get_my_conversation_context", { p_conversation_id: conversationId });
    if (contextError || !context) return { success: false as const, error: "المحادثة غير موجودة أو لا تخص حسابك", messages: [] as ConversationMessageItem[] };
    let query = supabase.from("conversation_messages")
      .select("id, conversation_id, sender_id, message_type, body, media_path, media_type, moderation_status, created_at")
      .eq("conversation_id", conversationId).is("deleted_at", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(31);
    if (parsed.data.before) query = query.lt("created_at", parsed.data.before);
    const { data, error } = await query;
    if (error) return { success: false as const, error: "تعذر تحميل الرسائل", messages: [] as ConversationMessageItem[] };
    const rows = data || [];
    const hasMore = rows.length > 30;
    const pageRows = rows.slice(0, 30);
    const signed = await Promise.all(pageRows.map(async (message) => {
      let mediaUrl: string | null = null;
      if (message.media_path) {
        const { data: url } = await supabase.storage.from("message-private").createSignedUrl(message.media_path, 15 * 60);
        mediaUrl = url?.signedUrl || null;
      }
      return { ...message, media_url: mediaUrl } as ConversationMessageItem;
    }));
    return {
      success: true as const,
      currentUserId: user.id,
      context: { ...(context as Record<string, unknown>), counterpart_avatar_url: publicMarketplaceMediaUrl(String((context as Record<string, unknown>).counterpart_avatar_path || "")) },
      messages: signed.reverse(),
      hasMore,
      nextCursor: hasMore ? String(pageRows[pageRows.length - 1]?.created_at || "") : null,
    };
  } catch (error) {
    logger.error("Conversation load failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر تحميل المحادثة", messages: [] as ConversationMessageItem[] };
  }
}

export async function sendTextMessageAction(input: z.input<typeof MessageSchema>) {
  const parsed = MessageSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "الرسالة غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`messages:send:${user.id}`, { limit: 30, windowMs: 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("send_conversation_message", {
      p_conversation_id: parsed.data.conversationId,
      p_message_type: "TEXT",
      p_body: parsed.data.body,
      p_media_path: null,
      p_media_type: null,
      p_media_metadata: {},
    });
    if (error || !data?.success) return { success: false as const, error: rpcMessage(data?.error), contactBlocked: data?.error === "CONTACT_NOT_ALLOWED" };
    revalidatePath(`/messages/${parsed.data.conversationId}`);
    revalidatePath("/messages");
    return { success: true as const, messageId: data.message_id as string };
  } catch (error) {
    logger.error("Message send failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر إرسال الرسالة" };
  }
}

export async function prepareMessageMediaUploadAction(input: z.input<typeof MediaSchema>) {
  const parsed = MediaSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "الملف غير مدعوم أو حجمه كبير" };
  const isImage = parsed.data.mimeType.startsWith("image/");
  if (isImage && parsed.data.sizeBytes > 8 * 1024 * 1024) return { success: false as const, error: "حجم الصورة يجب ألا يتجاوز 8 ميجابايت" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`messages:media:${user.id}`, { limit: 12, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data: context } = await supabase.rpc("get_my_conversation_context", { p_conversation_id: parsed.data.conversationId });
    if (!context) return { success: false as const, error: "المحادثة غير موجودة أو لا تخص حسابك" };
    const extension: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };
    const path = `${parsed.data.conversationId}/${user.id}/${randomUUID()}.${extension[parsed.data.mimeType]}`;
    const { data, error } = await supabase.storage.from("message-private").createSignedUploadUrl(path, { upsert: false });
    if (error || !data) return { success: false as const, error: "تعذر تجهيز الرفع الآمن" };
    return { success: true as const, bucket: "message-private" as const, path: data.path, token: data.token };
  } catch (error) {
    logger.error("Message media preparation failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر تجهيز المرفق" };
  }
}

export async function sendMediaMessageAction(input: z.input<typeof SendMediaSchema>) {
  const parsed = SendMediaSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "بيانات المرفق غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const messageType = parsed.data.mimeType.startsWith("image/") ? "IMAGE" : "VIDEO";
    const { data, error } = await supabase.rpc("send_conversation_message", {
      p_conversation_id: parsed.data.conversationId,
      p_message_type: messageType,
      p_body: parsed.data.caption || null,
      p_media_path: parsed.data.path,
      p_media_type: parsed.data.mimeType,
      p_media_metadata: { size: parsed.data.sizeBytes },
    });
    if (error || !data?.success) {
      await supabase.storage.from("message-private").remove([parsed.data.path]);
      return { success: false as const, error: rpcMessage(data?.error) };
    }
    revalidatePath(`/messages/${parsed.data.conversationId}`);
    revalidatePath("/messages");
    return { success: true as const, messageId: data.message_id as string };
  } catch (error) {
    logger.error("Message media send failed", { context: "Messaging", error });
    return { success: false as const, error: "تعذر إرسال المرفق" };
  }
}

export async function markConversationReadAction(conversationId: string) {
  if (!IdSchema.safeParse(conversationId).success) return { success: false as const };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    return { success: Boolean(data?.success) };
  } catch { return { success: false as const }; }
}

export async function reportMessageAction(messageId: string, reason: "CONTACT_SHARING" | "EXTERNAL_PAYMENT" | "SPAM" | "HARASSMENT" | "UNSAFE_CONTENT" | "OTHER") {
  if (!IdSchema.safeParse(messageId).success) return { success: false as const, error: "الرسالة غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
    const rate = await checkRateLimit(`messages:report:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const { data, error } = await supabase.rpc("report_marketplace_content", { p_target_type: "MESSAGE", p_target_id: messageId, p_reason: reason, p_details: null });
    if (error || !data?.success) return { success: false as const, error: "تعذر إرسال البلاغ" };
    return { success: true as const };
  } catch { return { success: false as const, error: "تعذر إرسال البلاغ" }; }
}
