// Service Worker — Vinilos PWA
const APP_VERSION = '4';
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

  if (isHTML) {
    // If app already has a client open, send it a message and serve from cache
    if (url.searchParams.has('play')) {
      const playId = url.searchParams.get('play');
      e.waitUntil(
        self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(clients => {
          if (clients.length > 0) {
            // App already open — message it and serve cached page
            clients.forEach(c => c.postMessage({type: 'NFC_PLAY', playId}));
            return clients[0].focus().catch(() => {});
          }
        })
      );
    }
    // Always serve index.html for HTML requests (with or without ?play=)
    // Keep ?play= in URL so checkNfcParam() can read it on fresh load
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          // Cache without query string as canonical
          const canonical = url.origin + url.pathname;
          caches.open(CACHE).then(c => c.put(canonical, clone));
          return res;
        })
        .catch(() => {
          // Offline: serve cached index.html (without ?play=, that's fine — sessionStorage has it)
          const canonical = url.origin + url.pathname;
          return caches.match(canonical) || caches.match('./index.html');
        })
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
