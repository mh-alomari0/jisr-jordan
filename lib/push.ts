import "server-only";
import webpush from "web-push";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function dispatchPushOutbox(limit = 50) {
  if (!pushConfigured()) throw new Error("Web Push is not configured");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const admin = createAdminSupabaseClient();
  const now = new Date();
  await admin.from("push_notification_outbox").update({ status: "FAILED", last_error_code: "LEASE_EXPIRED" })
    .eq("status", "PROCESSING").lte("available_at", now.toISOString());
  const { data: outbox, error } = await admin.from("push_notification_outbox")
    .select("id, notification_id, user_id, attempt_count, notifications(type, action_url)")
    .in("status", ["PENDING", "FAILED"]).lte("available_at", new Date().toISOString()).order("created_at").limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error("Unable to read push outbox");
  let sent = 0; let failed = 0;
  for (const item of outbox || []) {
    const leaseUntil = new Date(Date.now() + 5 * 60_000).toISOString();
    const { data: claimed } = await admin.from("push_notification_outbox")
      .update({ status: "PROCESSING", attempt_count: item.attempt_count + 1, available_at: leaseUntil })
      .eq("id", item.id).in("status", ["PENDING", "FAILED"]).select("id").maybeSingle();
    if (!claimed) continue;
    const { data: devices } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth_secret").eq("user_id", item.user_id);
    const notification = Array.isArray(item.notifications) ? item.notifications[0] : item.notifications;
    const safeTitle = notification?.type === "BOOKING" ? "تحديث على حجزك" : notification?.type === "PAYMENT" ? "تحديث مالي" : notification?.type === "MESSAGE" ? "رسالة جديدة في جسر" : "تحديث جديد في جسر الأردن";
    const safeUrl = typeof notification?.action_url === "string" && notification.action_url.startsWith("/") && !notification.action_url.startsWith("//") ? notification.action_url : "/notifications";
    let delivered = 0;
    for (const device of devices || []) {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth_secret } }, JSON.stringify({ title: safeTitle, body: "افتح جسر الأردن لعرض التفاصيل.", url: safeUrl, notificationId: item.notification_id }), { TTL: 3600, urgency: "normal" });
        delivered += 1;
      } catch (cause) {
        const status = typeof cause === "object" && cause && "statusCode" in cause ? Number(cause.statusCode) : 0;
        if ([404, 410].includes(status)) await admin.from("push_subscriptions").delete().eq("id", device.id);
        logger.warn("Push delivery failed", { context: "WebPush", metadata: { status, outboxId: item.id } });
      }
    }
    await admin.from("push_notification_outbox").update({ status: delivered > 0 ? "SENT" : "SKIPPED", processed_at: new Date().toISOString(), last_error_code: delivered > 0 ? null : "NO_ACTIVE_DELIVERY" }).eq("id", item.id);
    if (delivered > 0) sent += 1; else failed += 1;
  }
  return { processed: (outbox || []).length, sent, failed };
}
