self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // تجنب اعتراض طلبات تسجيل الدخول أو أي طلبات غير صفحة الويب العادية
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // استثناء طلبات Supabase والـ API من التخزين المؤقت لضمان عمل تسجيل الدخول
  if (url.origin !== location.origin || url.pathname.startsWith("/api")) {
    return;
  }
});