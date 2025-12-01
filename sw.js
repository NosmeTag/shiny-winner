const CACHE_NAME = 'mopi-app-v4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/config/constants.js',

  './js/services/auth.js',
  './js/services/db.js',
  './js/services/email.js',
  './js/ui/charts.js',
  './js/ui/render.js',
  './js/ui/toasts.js',
  './js/utils/date.js',
  './js/utils/helpers.js',
  './manifest.json',
  './imagem/mopi_logo.png'
];

self.addEventListener('install', event => {
  // Force this new service worker to become the active one, bypassing the waiting state
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Claim any clients immediately, so they are controlled by this new service worker
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});