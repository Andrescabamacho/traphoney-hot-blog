// Service Worker: cachea el "esqueleto" de la app (HTML/CSS/JS) para que
// OfflineTube se abra y funcione SIN internet. Los vídeos no van aquí: viven
// en IndexedDB. Las llamadas a /api/ nunca se cachean (necesitan red).
const CACHE = 'offline-tube-v1'
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'db.js',
  'app.js',
  'manifest.webmanifest',
  'icon.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === location.origin) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
        .catch(() => cached)
    })
  )
})
