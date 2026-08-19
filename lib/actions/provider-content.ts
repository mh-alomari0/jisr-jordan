"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PostSchema = z.object({
  content: z.string().trim().min(3, "أضف محتوى واضحاً للمنشور").max(3000),
  postType: z.enum(["TEXT", "IMAGE", "BEFORE_AFTER", "PORTFOLIO", "TIP", "PROMOTION"]),
  listingId: z.string().uuid().nullable(),
});
const IdSchema = z.string().uuid();

async function requireProvider() {
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { supabase, user: null };
  const { data } = await supabase.from("provider_profiles").select("application_status, is_verified")
    .eq("user_id", user.id).maybeSingle();
  return { supabase, user: data?.application_status === "APPROVED" && data.is_verified ? user : null };
}

export async function getProviderPostsAction() {
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "يتطلب الوصول حساب مقدم خدمة معتمداً", posts: [] };
    const { data, error } = await supabase.from("provider_posts")
      .select("id, provider_id, listing_id, content, post_type, status, moderation_notes, published_at, created_at, updated_at, service_listings(id, slug, title)")
      .eq("provider_id", user.id).order("updated_at", { ascending: false }).limit(100);
    if (error) return { success: false as const, error: "تعذر تحميل المحتوى", posts: [] };
    return { success: true as const, posts: data || [] };
  } catch {
    return { success: false as const, error: "تعذر تحميل المحتوى", posts: [] };
  }
}

export async function createProviderPostAction(input: z.input<typeof PostSchema>) {
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات المنشور غير صالحة" };
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
    const rate = await checkRateLimit(`post:create:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    if (parsed.data.listingId) {
      const { data: listing } = await supabase.from("service_listings").select("id")
        .eq("id", parsed.data.listingId).eq("provider_id", user.id).maybeSingle();
      if (!listing) return { success: false as const, error: "عرض الخدمة المرتبط لا يخص حسابك" };
    }
    const { data, error } = await supabase.from("provider_posts").insert({
      provider_id: user.id,
      listing_id: parsed.data.listingId,
      content: parsed.data.content,
      post_type: parsed.data.postType,
      status: "DRAFT",
    }).select("id").single();
    if (error || !data) return { success: false as const, error: "تعذر إنشاء المنشور" };
    revalidatePath("/provider/posts");
    return { success: true as const, postId: data.id as string };
  } catch {
    return { success: false as const, error: "تعذر إنشاء المنشور" };
  }
}

export async function setProviderPostPublicationAction(postId: string, publish: boolean) {
  if (!IdSchema.safeParse(postId).success) return { success: false as const, error: "معرف المنشور غير صالح" };
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
    const { data, error } = await supabase.rpc("set_provider_post_publication", { p_post_id: postId, p_publish: publish });
    if (error || !data?.success) {
      const messages: Record<string, string> = {
        POST_NOT_FOUND: "المنشور غير موجود أو لا يخص حسابك",
        LISTING_NOT_PUBLISHED: "يجب نشر عرض الخدمة المرتبط أولاً",
        INVALID_STATUS: "لا يمكن تغيير حالة المنشور حالياً",
      };
      return { success: false as const, error: messages[data?.error] || "تعذر تغيير حالة المنشور" };
    }
    revalidatePath("/provider/posts");
    revalidatePath("/");
    return { success: true as const, status: data.status as string };
  } catch {
    return { success: false as const, error: "تعذر تغيير حالة المنشور" };
  }
}

export async function deleteProviderPostAction(postId: string) {
  if (!IdSchema.safeParse(postId).success) return { success: false as const, error: "معرف المنشور غير صالح" };
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
    const { error } = await supabase.from("provider_posts").delete().eq("id", postId).eq("provider_id", user.id);
    if (error) return { success: false as const, error: "يمكن حذف المسودات فقط؛ أوقف المنشور للاحتفاظ بسجل المراجعة" };
    revalidatePath("/provider/posts");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر حذف المنشور" };
  }
}

const UploadSchema = z.object({
  listingId: z.string().uuid().nullable(),
  postId: z.string().uuid().nullable(),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
}).refine((value) => Number(Boolean(value.listingId)) + Number(Boolean(value.postId)) === 1, "اربط الصورة بعرض أو منشور واحد");

export async function prepareMarketplaceImageUploadAction(input: z.input<typeof UploadSchema>) {
  const parsed = UploadSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "ملف الصورة غير صالح" };
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
    const rate = await checkRateLimit(`media:prepare:${user.id}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const extension = parsed.data.mimeType === "image/jpeg" ? "jpg" : parsed.data.mimeType === "image/png" ? "png" : "webp";
    const kind = parsed.data.listingId ? "listings" : "posts";
    const ownerTarget = parsed.data.listingId || parsed.data.postId;
    const storagePath = `${user.id}/${kind}/${ownerTarget}/${randomUUID()}.${extension}`;
    const { data: media, error: registerError } = await supabase.from("provider_media").insert({
      owner_id: user.id,
      listing_id: parsed.data.listingId,
      post_id: parsed.data.postId,
      media_kind: "IMAGE",
      storage_bucket: "marketplace-public",
      storage_path: storagePath,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
      status: "PENDING_UPLOAD",
    }).select("id").single();
    if (registerError || !media) return { success: false as const, error: "تعذر تجهيز رفع الصورة" };
    const { data: signed, error: signError } = await supabase.storage.from("marketplace-public")
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (signError || !signed) {
      await supabase.from("provider_media").delete().eq("id", media.id).eq("owner_id", user.id);
      return { success: false as const, error: "تعذر تجهيز رابط الرفع الآمن" };
    }
    return {
      success: true as const,
      mediaId: media.id as string,
      path: signed.path,
      token: signed.token,
      bucket: "marketplace-public" as const,
    };
  } catch {
    return { success: false as const, error: "تعذر تجهيز رفع الصورة" };
  }
}

export async function confirmMarketplaceImageUploadAction(mediaId: string) {
  if (!IdSchema.safeParse(mediaId).success) return { success: false as const, error: "معرف الوسائط غير صالح" };
  try {
    const { supabase, user } = await requireProvider();
    if (!user) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
    const { data: media } = await supabase.from("provider_media")
      .select("id, storage_path, mime_type, size_bytes, status")
      .eq("id", mediaId).eq("owner_id", user.id).maybeSingle();
    if (!media || media.status !== "PENDING_UPLOAD") return { success: false as const, error: "طلب الرفع غير موجود" };
    const separator = media.storage_path.lastIndexOf("/");
    const folder = media.storage_path.slice(0, separator);
    const fileName = media.storage_path.slice(separator + 1);
    const { data: objects, error: listError } = await supabase.storage.from("marketplace-public")
      .list(folder, { limit: 2, search: fileName });
    const object = objects?.find((item) => item.name === fileName);
    const actualSize = Number(object?.metadata?.size || 0);
    const actualMime = String(object?.metadata?.mimetype || object?.metadata?.contentType || "");
    if (listError || !object || actualSize <= 0 || actualSize > 5 * 1024 * 1024
      || actualSize !== Number(media.size_bytes) || actualMime !== media.mime_type) {
      return { success: false as const, error: "تعذر التحقق من الصورة المرفوعة" };
    }
    const { error } = await supabase.from("provider_media").update({ status: "ACTIVE" })
      .eq("id", mediaId).eq("owner_id", user.id).eq("status", "PENDING_UPLOAD");
    if (error) return { success: false as const, error: "تعذر اعتماد الصورة" };
    revalidatePath("/provider/listings");
    revalidatePath("/provider/posts");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر اعتماد الصورة" };
  }
}

