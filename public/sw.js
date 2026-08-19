/* Jisr Jordan push-only service worker. Deliberately no fetch cache: deployments stay fresh. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" ? payload.title : "جسر الأردن";
  const body = typeof payload.body === "string" ? payload.body : "لديك تحديث جديد";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/notifications";
  event.waitUntil(self.registration.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", dir: "rtl", lang: "ar", data: { url }, tag: payload.notificationId || undefined }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    for (const client of windows) { if (client.url === target && "focus" in client) return client.focus(); }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
