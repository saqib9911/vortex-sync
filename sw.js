const CACHE_NAME = "ghost-v3"; // Version change to force update
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // Purane worker ko foran khatam karo
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
