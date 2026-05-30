const CACHE_VERSION = 'pie-acreplast-nr10-v1.0.0';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => !key.startsWith(CACHE_VERSION))
        .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isFirebaseRequest(url) {
  return url.hostname.includes('firebaseio.com')
    || url.hostname.includes('firebaseapp.com')
    || url.hostname.includes('firebasestorage.googleapis.com')
    || url.hostname.includes('googleapis.com')
    || url.hostname.includes('gstatic.com');
}

function isStaticAsset(request) {
  return request.destination === 'script'
    || request.destination === 'style'
    || request.destination === 'image'
    || request.destination === 'font'
    || request.destination === 'manifest';
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match('/offline.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Não intercepta chamadas do Firebase/Google. Elas precisam trabalhar online com autenticação e tokens atuais.
  if (isFirebaseRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match('/index.html')) || (await caches.match('/offline.html'));
        })
    );
    return;
  }

  if (url.origin === self.location.origin && isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});
