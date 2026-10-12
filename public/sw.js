const V = 'pytype-v5'
const SHELL = ['/', '/css/app.css', '/js/i18n.js', '/js/i18n-dict.js', '/js/core.js', '/js/trainer.js', '/js/pages.js', '/js/kinds.js', '/js/stats.js', '/js/tourn.js', '/js/insights.js', '/js/duel.js', '/js/push.js', '/js/admin.js', '/js/ext.js', '/socket.io/socket.io.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== location.origin) return
  if (u.pathname.startsWith('/api/') || (u.pathname.startsWith('/socket.io/') && !u.pathname.endsWith('.js')) || u.pathname === '/healthz') return
  const key = r.mode === 'navigate' ? '/' : u.pathname
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(key)
    const net = fetch(r).then(res => { if (res.ok && SHELL.includes(key)) c.put(key, res.clone()); return res }).catch(() => hit)
    if (hit) { e.waitUntil(net.catch(() => {})); return hit }
    return net
  }))
})

self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch (er) { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'pytype', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || '/' }
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => new URL(x.url).origin === location.origin)
    if (c) { c.postMessage({ nav: url }); return c.focus() }
    return self.clients.openWindow(url)
  }))
})
