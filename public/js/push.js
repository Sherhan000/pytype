const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function b64u(s) {
  const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, c => c.charCodeAt(0))
}

async function pushSub() {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

async function pushState() {
  if (!PUSH_OK) return { on: false, na: 'nosup', label: 'не поддерживается' }
  if (Notification.permission === 'denied') return { on: false, na: 'denied', label: 'запрещены' }
  const s = await pushSub().catch(() => null)
  return { on: !!s, label: s ? 'включены' : 'выключены' }
}

async function pushPaint() {
  const st = await pushState()
  $$('[data-ps]').forEach(e => {
    if (e.closest('.tag')) return
    e.textContent = t(st.on ? 'Push-уведомления включены' : 'Включить push-уведомления')
  })
  $$('.tag[data-ps]').forEach(e => { e.textContent = t(st.label); e.className = 'tag ' + (st.on ? 'ok' : '') })
}

async function pushToggle() {
  if (!S.u) return authBox()
  const st = await pushState()
  if (st.na === 'nosup') {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent)
    return toast(ios ? 'На iPhone push работает только из установленного приложения: «Поделиться» → «На экран Домой»' : 'Этот браузер не поддерживает push-уведомления', 'err', 6000)
  }
  if (st.na === 'denied') return toast('Уведомления запрещены в настройках браузера. Разреши их для этого сайта', 'err', 6000)
  try {
    const reg = await navigator.serviceWorker.ready
    if (st.on) {
      const s = await reg.pushManager.getSubscription()
      if (s) { await api('push/unsub', { endpoint: s.endpoint }).catch(() => {}); await s.unsubscribe() }
      toast('Push-уведомления выключены')
    } else {
      if (await Notification.requestPermission() !== 'granted') return toast('Без разрешения браузера уведомления не придут', 'err')
      const { key } = await api('push/key')
      if (!key) return toast('Push на сервере не настроен', 'err')
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) })
      await api('push/sub', { sub: s.toJSON(), lang: LANG })
      toast('Push включены: вызовы на дуэль, подписчики, итоги турнира и напоминание о серии', 'ok', 5000)
    }
  } catch (e) { toast(e.message, 'err') }
  pushPaint()
}

ACT.push = () => pushToggle()
App.on('user', () => setTimeout(pushSync, 500))
App.ev.addEventListener('route', pushPaint)

async function pushSync() {
  if (!S.u || !PUSH_OK || Notification.permission !== 'granted') return
  const s = await pushSub().catch(() => null)
  if (s) api('push/sub', { sub: s.toJSON(), lang: LANG }).catch(() => {})
}

if (PUSH_OK) {
  navigator.serviceWorker.addEventListener('message', e => {
    const u = e.data?.nav
    if (typeof u === 'string' && u.startsWith('/#/')) location.hash = u.slice(1)
  })
  addEventListener('load', () => setTimeout(pushSync, 4000))
}
