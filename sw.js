const CACHE_NAME = 'keiba-predict-v3';

self.addEventListener('install', e => {
  // キャッシュせずに即時アクティベート
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // 古いキャッシュを全部削除
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 全てのリクエストをキャッシュせず直接フェッチ
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
