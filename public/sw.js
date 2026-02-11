const CACHE_NAME = 'teewinek-v1';
const STATIC_CACHE = 'teewinek-static-v1';
const DYNAMIC_CACHE = 'teewinek-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }

          const shouldCache =
            request.url.indexOf('http') === 0 &&
            !request.url.includes('/api/') &&
            !request.url.includes('supabase');

          if (shouldCache) {
            const responseToCache = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return fetchResponse;
        })
      );
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Teewinek';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: 'https://i0.wp.com/www.teewinek.com/wp-content/uploads/2024/05/LOGO-TEEWINEK.png',
    badge: 'https://i0.wp.com/www.teewinek.com/wp-content/uploads/2024/05/LOGO-TEEWINEK.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
