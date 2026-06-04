const CACHE_NAME = 'keiba-predict-v5';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 全てキャッシュせず直接フェッチ
  e.respondWith(
    fetch(e.request).catch(() => new Response('', { status: 408 }))
  );
});
