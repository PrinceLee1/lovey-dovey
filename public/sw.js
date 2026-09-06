const CACHE_NAME = 'loveydovey-shell-v2';
const APP_SHELL = ['/', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only GET is cacheable/idempotent — let POST/PUT/DELETE etc. go straight
  // to the network untouched.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-first for API calls: prefer fresh data whenever online, but
  // fall back to the last cached response (if any) when offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for page navigations — the HTML shell decides which
  // hashed JS/CSS bundle the SPA loads next, so it must never be served
  // stale from cache while online. A cache-first shell would leave a
  // PWA already installed to a home screen permanently frozen on
  // whatever bundle was cached at install time, even after new deploys.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Cache-first for everything else — hashed JS/CSS/fonts/images. Safe to
  // cache indefinitely since Vite fingerprints these filenames by content
  // hash, so a given URL's bytes never change.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => {});
    })
  );
});
