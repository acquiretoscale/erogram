const CACHE_NAME = 'erogram-v2-cache-v2';
const STATIC_CACHE = 'erogram-static-v2';
const API_CACHE = 'erogram-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/assets/placeholder-no-image.png',
  '/manifest.json'
];

// API endpoints to cache (with short TTL)
const API_ENDPOINTS = [
  '/api/site-config',
  '/api/groups?limit=12&sortBy=random'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Only cache GET requests for specific endpoints
    if (request.method === 'GET' && API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint.split('?')[0]))) {
      event.respondWith(
        caches.open(API_CACHE).then((cache) => {
          return cache.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
              // Cache successful responses for 5 minutes
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            });

            return cachedResponse || fetchPromise;
          });
        })
      );
    }
    return;
  }

  // Handle static assets
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((networkResponse) => {
          // Cache static assets
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // For navigation requests: network first, then cache only when offline.
  // This prevents showing a stale/404 cached page briefly before the real page loads.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => null)
        .then((response) => {
          if (response && response.ok) return response;
          return caches.match(request).then((cached) => cached || caches.match('/'));
        })
        .then((response) => response || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
    );
    return;
  }

  // Default - network first for other requests
  event.respondWith(fetch(request));
});