// Service Worker for Systro PWA App - Direct Instant Live Update & Cache Purge
const CACHE_NAME = 'systro-pwa-v' + Date.now();

// Install Event - skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event - PURGE ALL OLD CACHES unconditionally
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - ALWAYS Network-First with cache-busting for HTML & JS
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET, API routes, firestore, and socket connections
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.protocol.startsWith('ws')
  ) {
    return;
  }

  // Network First for all requests
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

