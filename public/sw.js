/* Mess Mates service worker — app-shell cache with network-first updates. */
const CACHE = 'mess-mates-v3'
const SHELL = ['./', './index.html', './manifest.webmanifest', './logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

// Web Push delivery. The payload is produced by the send-push function; the
// notification itself must be shown here, or the browser revokes permission.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Mess Mates'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || 'Open the app to see today’s mess.',
      icon: './logo.png',
      badge: './logo.png',
      tag: payload.tag || 'mess-mates-push',
      data: { url: payload.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || './', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => client.url.startsWith(self.location.origin))
      if (open) return open.focus()
      return self.clients.openWindow(target)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
  if (request.url.includes('/auth/') || request.url.includes('/rest/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only keep real, same-origin 200s; a cached error page would stick
        // around and hide a later deploy.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))),
  )
})
