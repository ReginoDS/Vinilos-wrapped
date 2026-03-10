// Service Worker — Vinilos PWA
// ─────────────────────────────────────────────────────────────
// VERSIONING: bump APP_VERSION on every deploy to force cache refresh.
// The app's sync button also triggers a SW update check automatically.
// ─────────────────────────────────────────────────────────────
const APP_VERSION = '2';
const CACHE = 'vinilos-v' + APP_VERSION;

// Assets to pre-cache (fonts excluded — they have their own long-lived cache)
const PRECACHE = ['./manifest.json'];

// ── Install: pre-cache static assets ─────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  // Activate immediately — don't wait for old SW to release clients
  self.skipWaiting();
});

// ── Activate: delete all old caches ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────
// HTML (index.html / root): NETWORK-FIRST
//   → always try to get the latest version from the server
//   → fall back to cache only if offline
// Everything else: CACHE-FIRST (fonts, manifests, etc.)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first for HTML: always fresh, offline fallback
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Clone and cache the fresh response
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for other assets
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

// ── Message: force update check from the app ─────────────────
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
