"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PreferencesSchema = z.object({
  bookings_in_app: z.boolean(), bookings_push: z.boolean(), quotes_in_app: z.boolean(), quotes_push: z.boolean(),
  system_in_app: z.boolean(), system_push: z.boolean(), commissions_in_app: z.boolean(), commissions_push: z.boolean(),
  provider_updates_in_app: z.boolean(), provider_updates_push: z.boolean(),
});
const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(4096), p256dh: z.string().min(20).max(512), auth: z.string().min(8).max(256),
  expirationTime: z.number().int().positive().nullable(), deviceLabel: z.string().trim().max(120).optional(),
});

export type NotificationPreferences = z.infer<typeof PreferencesSchema>;
const defaultNotificationPreferences: NotificationPreferences = {
  bookings_in_app: true, bookings_push: true, quotes_in_app: true, quotes_push: true,
  system_in_app: true, system_push: true, commissions_in_app: true, commissions_push: true,
  provider_updates_in_app: true, provider_updates_push: true,
};

export async function getPushSettingsAction() {
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false as const, error: "يجب تسجيل الدخول", preferences: defaultNotificationPreferences, devices: [] };
  const [{ data: preferences }, { data: devices }] = await Promise.all([
    supabase.from("notification_preferences").select("bookings_in_app, bookings_push, quotes_in_app, quotes_push, system_in_app, system_push, commissions_in_app, commissions_push, provider_updates_in_app, provider_updates_push").eq("user_id", user.id).maybeSingle(),
    supabase.from("push_subscriptions").select("id, device_label, last_seen_at, created_at").eq("user_id", user.id).order("last_seen_at", { ascending: false }),
  ]);
  return { success: true as const, preferences: { ...defaultNotificationPreferences, ...(preferences || {}) }, devices: devices || [], publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null };
}

export async function saveNotificationPreferencesAction(input: NotificationPreferences) {
  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "إعدادات الإشعارات غير صالحة" };
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
  if (error) return { success: false as const, error: "تعذر حفظ إعدادات الإشعارات" };
  revalidatePath("/notifications");
  return { success: true as const };
}

export async function registerPushSubscriptionAction(input: z.input<typeof SubscriptionSchema>) {
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "اشتراك الإشعارات غير صالح" };
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
  const limit = await checkRateLimit(`push:subscribe:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.success) return { success: false as const, error: limit.error };
  const requestHeaders = await headers();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.p256dh, auth_secret: parsed.data.auth,
    expiration_time: parsed.data.expirationTime, device_label: parsed.data.deviceLabel || "هذا الجهاز",
    user_agent: (requestHeaders.get("user-agent") || "").slice(0, 500), last_seen_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return { success: false as const, error: "تعذر حفظ اشتراك هذا الجهاز" };
  revalidatePath("/notifications");
  return { success: true as const };
}

export async function removePushDeviceAction(deviceId: string) {
  if (!z.string().uuid().safeParse(deviceId).success) return { success: false as const, error: "الجهاز غير صالح" };
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { success: false as const, error: "يجب تسجيل الدخول" };
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", deviceId).eq("user_id", user.id);
  if (error) return { success: false as const, error: "تعذر حذف الجهاز" };
  revalidatePath("/notifications");
  return { success: true as const };
}
