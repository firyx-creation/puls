// ── Service Worker puls. ──
// Cache pour mode offline + gestion des notifs push (ntfy utilise son propre SW)

const CACHE = "puls-v1";
const ASSETS = ["/", "/index.html", "/css/app.css", "/js/config.js", "/js/app.js", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Gestion des notifs push (si l'on reçoit un push directement)
self.addEventListener("push", e => {
  if (!e.data) return;
  const data = e.data.json().catch(() => ({ title: "puls.", body: e.data.text() }));
  e.waitUntil(
    Promise.resolve(data).then(d => self.registration.showNotification(d.title || "puls.", {
      body: d.body || "",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      vibrate: [200, 100, 200],
      data: { url: "/" },
    }))
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});