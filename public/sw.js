self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// تمرير جميع الطلبات للشبكة فوراً لمنع أخطاء Load failed
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});