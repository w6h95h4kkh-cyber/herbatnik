// Service worker: cała aplikacja w cache → działa offline.
// Przy każdej zmianie plików aplikacji podbij WERSJA (i window.HERBATNIK_WERSJA w index.html).
const WERSJA = 'herbatnik-0.3.0';
const PLIKI = [
  './',
  'index.html',
  'style.css',
  'fonts.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/db.js',
  'data/seed.json',
  'data/katalog.json',
  'js/wspolne.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/CormorantGaramond-400-latin.woff2',
  'fonts/CormorantGaramond-400-latin-ext.woff2',
  'fonts/CormorantGaramond-400i-latin.woff2',
  'fonts/CormorantGaramond-400i-latin-ext.woff2',
  'fonts/PlayfairDisplay-500-latin.woff2',
  'fonts/PlayfairDisplay-500-latin-ext.woff2',
  'fonts/Syne-500-latin.woff2',
  'fonts/Syne-500-latin-ext.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(WERSJA).then(c => c.addAll(PLIKI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(klucze => Promise.all(klucze.filter(k => k !== WERSJA).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(z => z || fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') return caches.match('index.html');
      return Response.error();
    }))
  );
});
