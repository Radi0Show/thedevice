

const PREFIX = 'blackknife-';
const CACHE = PREFIX + '1.0.21';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './main.js'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })

        .catch(() => caches.match(e.request).then((m) => {
          if (m) return m;
          const isShell = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
          if (isShell) return caches.match('./index.html');
          return new Response(
            'Offline, and this page is not cached.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } },
          );
        })),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit ?? fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    })),
  );
});
