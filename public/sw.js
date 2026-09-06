const CACHE_NAME = 'loveydovey-shell-v1';
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

  // Cache-first for everything else — the app shell (HTML/CSS/JS/fonts/
  // images). First load populates the cache as each asset is fetched, since
  // Vite's hashed build filenames aren't known ahead of time to precache.
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
        .catch(() => {
          // Offline and not cached — for a page navigation, fall back to the
          // cached app shell so the SPA can still boot and route client-side.
          if (request.mode === 'navigate') return caches.match('/');
        });
    })
  );
});
