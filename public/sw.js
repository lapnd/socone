const CACHE = 'soc-assets-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Only handle static.wixstatic.com image requests
  if (!url.includes('static.wixstatic.com') && !url.includes('static.parastorage.com')) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(resp => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          })
          .catch(() => {
            // Try to find a locally-stored variant from our assets
            const local = '/assets/' + new URL(url).hostname + new URL(url).pathname;
            return fetch(local).catch(() => new Response('', {status: 404}));
          });
      })
    )
  );
});
