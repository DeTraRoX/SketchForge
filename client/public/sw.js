const CACHE = 'sketchforge-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Handle SPA page navigation requests by serving index.html from cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch((err) => {
        console.warn('Network request failed:', e.request.url, err);
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    })
  );
});
