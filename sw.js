/* Service worker : rend le jeu jouable hors ligne après une première visite.
   - code (HTML, JS, CSS) : réseau d'abord, toujours revérifié auprès du serveur (sinon le navigateur peut
     mélanger des fichiers de l'ancienne et de la nouvelle version juste après une mise à jour) ;
   - images, sons, polices : cache d'abord, ils changent rarement.
   Si vous remplacez une image ou un son en gardant le même nom, augmentez VERSION. */
const VERSION = 'v11';
const CACHE = 'clash-of-cabs-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isMedia = /\/(assets|icons)\//.test(url.pathname) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (isMedia) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  } else if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))));
  }
});
