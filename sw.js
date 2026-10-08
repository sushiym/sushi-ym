// SUSHI YM takip — offline cache
const VER = "sushi-ym-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(()=>{})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k!==VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const cdn = url.hostname === "www.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!same && !cdn) return;                       // Firestore / Auth traffic goes straight to the network
  if (same && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
    // app page: network first (fresh updates), cache when offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(ca => ca.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  if (same && url.pathname.endsWith("data.json")) return;
  // static files and libraries: cache first, refresh in background
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(VER).then(ca => ca.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
