// Service Worker — Vinilos PWA
const APP_VERSION = '6';
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

  // NFC tag: #play= in hash
  if (isHTML && url.hash && url.hash.startsWith('#play=')) {
    const playId = url.hash.replace('#play=', '');
    e.respondWith(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const existing = clients.find(c => c.visibilityState === 'visible') || clients[0];
        if (existing) {
          // App already open — send message and focus it
          existing.postMessage({ type: 'NFC_PLAY', playId });
          existing.focus().catch(() => {});
          // Return a redirect to the app without the hash so no reload happens
          return Response.redirect(url.origin + url.pathname, 302);
        }
        // No open client — let it load normally, checkNfcParam will handle the hash
        return fetch(e.request)
          .then(res => { caches.open(CACHE).then(c => c.put(url.origin + url.pathname, res.clone())); return res; })
          .catch(() => caches.match(url.origin + url.pathname) || caches.match('./index.html'));
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
        .catch(() => caches.match(e.request) || caches.match('./index.html'))
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
