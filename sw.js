// Service Worker — Vinilos PWA
// ─────────────────────────────────────────────────────────────
const APP_VERSION = '3';
const CACHE = 'vinilos-v' + APP_VERSION;
const PRECACHE = ['./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/' ||
                 url.pathname.endsWith('/');

  // NFC ?play= URL: send message to all clients, return cached index.html
  if (isHTML && url.searchParams.has('play')) {
    const playId = url.searchParams.get('play');
    e.waitUntil(
      self.clients.matchAll({type:'window'}).then(clients => {
        clients.forEach(client => client.postMessage({type:'NFC_PLAY', playId}));
      })
    );
    // Serve index.html (from cache or network) — strip ?play= so no loop
    const cleanUrl = url.origin + url.pathname;
    e.respondWith(
      caches.match(cleanUrl) ||
      fetch(cleanUrl).then(res => {
        caches.open(CACHE).then(c => c.put(cleanUrl, res.clone()));
        return res;
      })
    );
    return;
  }

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
