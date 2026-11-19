const CACHE = "lipahub-v3";
// Every entry must exist, otherwise cache.addAll() rejects and the worker never installs.
// "./" and "/tools" are used (not index.html / tools.html) because Vercel redirects the .html URLs.
const CORE = ["./", "/tools", "style.css", "script.js", "manifest.json", "tools.css", "tools.js", "assets/lipahub-logo.webp", "assets/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
// Network first, fall back to cache when offline. Same-origin GET only.
self.addEventListener("fetch", e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin) return;
  const isTools = url.pathname.replace(/\/+$/, "") === "/tools";
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match(isTools ? "/tools" : "./")))
  );
});
