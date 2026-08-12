const CACHE_NAME = 'systro-pwa-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache completely for Firestore / Firebase or local Express API routes to ensure pure real-time sync
  if (
    url.pathname.startsWith('/api') || 
    url.hostname.includes('firestore') || 
    url.hostname.includes('firebase') ||
    event.request.method !== 'GET'
  ) {
    return; // Let the browser handle standard real-time network request
  }

  // Network-First Strategy: try network first, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache the freshly fetched asset for future offline fallback
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: Fallback to cache if available
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigating, try the cached root index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
