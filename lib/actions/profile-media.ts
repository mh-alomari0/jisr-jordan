"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PrepareSchema = z.object({ kind: z.enum(["AVATAR", "COVER"]), audience: z.enum(["CUSTOMER", "PROVIDER"]), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(5 * 1024 * 1024) });
const ConfirmSchema = z.object({ kind: z.enum(["AVATAR", "COVER"]), audience: z.enum(["CUSTOMER", "PROVIDER"]), path: z.string().min(20).max(500), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(5 * 1024 * 1024) });

export async function prepareProfileMediaUploadAction(input: z.input<typeof PrepareSchema>) {
  const parsed = PrepareSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "ملف الصورة غير صالح" };
  const supabase = await createServerSupabaseClient(); const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
  const limit = await checkRateLimit(`profile-media:${user.id}`, { limit: 12, windowMs: 60 * 60_000 });
  if (!limit.success) return { success: false as const, error: limit.error };
  if (parsed.data.audience === "PROVIDER") {
    const { data } = await supabase.from("provider_profiles").select("application_status, is_verified").eq("user_id", user.id).maybeSingle();
    if (data?.application_status !== "APPROVED" || !data.is_verified) return { success: false as const, error: "حساب مقدم الخدمة غير معتمد" };
  }
  const extension = parsed.data.mimeType === "image/jpeg" ? "jpg" : parsed.data.mimeType === "image/png" ? "png" : "webp";
  const bucket = parsed.data.audience === "PROVIDER" ? "marketplace-public" : "profile-private";
  const path = `${user.id}/profile/${parsed.data.kind.toLowerCase()}/${randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return { success: false as const, error: "تعذر تجهيز رابط رفع الصورة" };
  return { success: true as const, bucket, path: data.path, token: data.token };
}

export async function confirmProfileMediaUploadAction(input: z.input<typeof ConfirmSchema>) {
  const parsed = ConfirmSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "بيانات الصورة غير صالحة" };
  const supabase = await createServerSupabaseClient(); const user = await getAuthenticatedUser(supabase);
  if (!user || !parsed.data.path.startsWith(`${user.id}/profile/${parsed.data.kind.toLowerCase()}/`)) return { success: false as const, error: "غير مصرح" };
  const bucket = parsed.data.audience === "PROVIDER" ? "marketplace-public" : "profile-private";
  const separator = parsed.data.path.lastIndexOf("/"); const folder = parsed.data.path.slice(0, separator); const name = parsed.data.path.slice(separator + 1);
  const { data: objects, error: listError } = await supabase.storage.from(bucket).list(folder, { limit: 2, search: name });
  const object = objects?.find((item) => item.name === name); const actualSize = Number(object?.metadata?.size || 0); const actualMime = String(object?.metadata?.mimetype || object?.metadata?.contentType || "");
  if (listError || !object || actualSize !== parsed.data.sizeBytes || actualMime !== parsed.data.mimeType) return { success: false as const, error: "تعذر التحقق من الصورة المرفوعة" };
  const column = parsed.data.kind === "AVATAR" ? "avatar_path" : "cover_path";
  const target = parsed.data.audience === "PROVIDER" ? "provider_profiles" : "users";
  const key = parsed.data.audience === "PROVIDER" ? "user_id" : "id";
  const { error } = await supabase.from(target).update({ [column]: parsed.data.path }).eq(key, user.id);
  if (error) return { success: false as const, error: "تعذر حفظ صورة الملف" };
  revalidatePath(parsed.data.audience === "PROVIDER" ? "/provider/profile" : "/profile"); revalidatePath(`/providers/${user.id}`);
  return { success: true as const };
}
