const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const h = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild }
const ls = {
  g(k, d) { try { const v = localStorage.getItem('pt_' + k); return v === null ? d : JSON.parse(v) } catch (e) { return d } },
  s(k, v) { try { localStorage.setItem('pt_' + k, JSON.stringify(v)) } catch (e) {} }
}
const fmt = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
const pl = (n, a, b, c) => { const m = n % 10, x = n % 100; return n + ' ' + (m === 1 && x !== 11 ? a : m >= 2 && m <= 4 && (x < 10 || x >= 20) ? b : c) }
const sym = k => k === ' ' ? '␣' : k === '\n' ? '↵' : k
const ago = d => {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'только что'
  if (s < 3600) return pl(Math.floor(s / 60), 'минуту', 'минуты', 'минут') + ' назад'
  if (s < 86400) return pl(Math.floor(s / 3600), 'час', 'часа', 'часов') + ' назад'
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
const lvl = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1
const lvlXp = l => 40 * (l - 1) ** 2

const S = { u: null, cfg: { chat: {}, ai: {} }, ai_left: 0, online: 0, chat: [], unread: 0, page: '', off: null, leagues: null }

async function api(p, b, m) {
  const r = await fetch('/api/' + p, {
    method: m || (b !== undefined ? 'POST' : 'GET'),
    headers: b !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: b !== undefined ? JSON.stringify(b) : undefined,
    credentials: 'same-origin'
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(j.e || 'Ошибка ' + r.status); e.code = r.status; throw e }
  return j
}

function toast(m, t = '') {
  const el = h(`<div class="toast ${t}"></div>`)
  el.textContent = m
  $('#toasts').append(el)
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260) }, t === 'err' ? 4200 : 2800)
}

function modal(html, o = {}) {
  const m = $('#modal')
  m.innerHTML = `<div class="mbg"><div class="mbox ${o.wide ? 'w' : ''}"><button class="ib x" data-x>${I.x}</button>${html}</div></div>`
  const bg = $('.mbg', m), close = () => { m.innerHTML = ''; o.onclose?.() }
  bg.addEventListener('mousedown', e => { if (e.target === bg) close() })
  $('[data-x]', m).onclick = close
  const k = e => { if (e.key === 'Escape') { close(); removeEventListener('keydown', k) } }
  addEventListener('keydown', k)
  return { el: $('.mbox', m), close }
}

function ask(text, ok = 'Да', cls = 'pri') {
  return new Promise(r => {
    const m = modal(`<h2>Точно?</h2><p class="mu" style="margin:6px 0 20px">${esc(text)}</p><div class="row"><span class="sp"></span><button class="btn" data-n>Отмена</button><button class="btn ${cls}" data-y>${esc(ok)}</button></div>`, { onclose: () => r(false) })
    $('[data-n]', m.el).onclick = () => m.close()
    $('[data-y]', m.el).onclick = () => { r(true); $('#modal').innerHTML = '' }
  })
}

const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
const I = {
  home: sv('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  kb: sv('<rect x="2" y="6" width="20" height="13" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10"/>'),
  flag: sv('<path d="M5 21V4M5 4h12l-2.5 4.5L17 13H5"/>'),
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  bag: sv('<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9zM9 8V6a3 3 0 0 1 6 0v2"/>'),
  chat: sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  spark: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  play: sv('<path d="M7 4v16l13-8z"/>'),
  out: sv('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'),
  gift: sv('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v7h14v-7M12 8v12M12 8S10.5 3 8 4s0 4 4 4zM12 8s1.5-5 4-4 0 4-4 4z"/>'),
  x: sv('<path d="M18 6 6 18M6 6l12 12"/>'),
  send: sv('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
  redo: sv('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>'),
  next: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  prev: sv('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  dice: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 16h.01M16 8h.01M8 16h.01M12 12h.01"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  mute: sv('<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>'),
  edit: sv('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>')
}

const avatar = (u, s = 40) => `<span class="av ${u?.frame ? 'fr-' + esc(u.frame) : ''}" style="--s:${s}px">${esc(u?.avatar || '🐍')}</span>`
const nick = u => {
  const c = u?.ncolor
  return `<span class="nm ${c === 'grad' ? 'nc-grad' : ''}" ${c && c !== 'grad' ? `style="color:${esc(c)}"` : ''}>${esc(u?.name || '')}</span>`
}
const roleTag = r => r === 'admin' ? '<span class="role admin">админ</span>' : r === 'mod' ? '<span class="role mod">мод</span>' : r === 'bot' ? '<span class="role bot">бот</span>' : ''
const starsH = (n, max = 3) => `<span class="stars">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`

function md(t) {
  const parts = String(t || '').split(/```(?:[a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g)
  return parts.map((p, i) => i % 2
    ? `<pre><code>${typeof hlHtml === 'function' ? hlHtml(p.replace(/\n$/, '')) : esc(p)}</code></pre>`
    : esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>')
  ).join('')
}

function confetti(n = 140) {
  const c = h('<canvas class="confetti"></canvas>')
  document.body.append(c)
  const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight
  const cols = ['#ffd43b', '#ff8a3d', '#4b8bff', '#9b6bff', '#3ddc97', '#ff5fa2']
  const p = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H / 2 - 40, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 4, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, va: (Math.random() - .5) * .3 }))
  let f = 0
  ;(function loop() {
    x.clearRect(0, 0, W, H)
    for (const q of p) {
      q.vy += .42; q.vx *= .99; q.x += q.vx; q.y += q.vy; q.a += q.va
      x.save(); x.translate(q.x, q.y); x.rotate(q.a); x.fillStyle = q.c; x.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2); x.restore()
    }
    if (++f < 160) requestAnimationFrame(loop); else c.remove()
  })()
}

const App = {
  pages: {},
  kinds: {},
  nav: [
    { r: '', t: 'Главная', i: 'home', m: 1 },
    { r: 'train', t: 'Тренировка', i: 'kb', m: 1 },
    { r: 'leagues', t: 'Задания', i: 'flag', m: 1 },
    { r: 'top', t: 'Рейтинг', i: 'trophy', m: 1 },
    { r: 'shop', t: 'Магазин', i: 'bag' },
    { r: 'chat', t: 'Чат', i: 'chat', m: 1 },
    { r: 'ai', t: 'ИИ-наставник', i: 'spark' },
    { r: 'me', t: 'Профиль', i: 'user', m: 1 },
    { r: 'admin', t: 'Админка', i: 'shield', role: ['admin', 'mod'] }
  ],
  page(name, def) { this.pages[name] = def },
  kind(name, def) { this.kinds[name] = def },
  ev: new EventTarget(),
  on(t, f) { const g = e => f(e.detail); this.ev.addEventListener(t, g); return () => this.ev.removeEventListener(t, g) },
  emit(t, d) { this.ev.dispatchEvent(new CustomEvent(t, { detail: d })) }
}

function setTitle(t) { const e = $('#top h1'); if (e) e.textContent = t; document.title = t + ' · ' + (S.cfg.site || 'pytype') }

function shell() {
  const u = S.u, cur = S.page
  const vis = App.nav.filter(n => !n.role || n.role.includes(u?.role))
  $('#side').innerHTML = `
    <a href="#/" class="logo"><i>py</i><b>${esc(S.cfg.site || 'pytype').replace(/^py/, '<span>py</span>')}</b></a>
    ${vis.map(n => `<a class="nav ${cur === n.r ? 'on' : ''}" href="#/${n.r}">${I[n.i] || ''}<span>${n.t}</span>${n.r === 'chat' && S.unread ? `<span class="bd">${S.unread > 99 ? '99+' : S.unread}</span>` : ''}</a>`).join('')}
    <div class="grow"></div>
    ${u ? `<a class="me-card" href="#/me">${avatar(u, 38)}<div style="min-width:0"><div class="n">${nick(u)}</div><div class="s">Уровень ${lvl(u.xp)} · ${u.xp} XP</div></div></a>`
        : `<button class="btn pri" data-act="auth">Войти или создать аккаунт</button>`}`
  $('#tabbar').innerHTML = vis.filter(n => n.m).map(n => `<a class="${cur === n.r ? 'on' : ''}" href="#/${n.r}">${I[n.i]}<span>${n.t.split(' ')[0]}</span>${n.r === 'chat' && S.unread ? '<i class="bd"></i>' : ''}</a>`).join('')
  const t = $('#top h1')?.textContent || ''
  const L = u ? lvl(u.xp) : 0
  $('#top').innerHTML = `<h1>${esc(t)}</h1><span class="sp"></span>
    ${u && u.can_daily ? `<button class="btn sm pri" data-act="daily">${I.gift}<span class="hide-m">Бонус дня</span></button>` : ''}
    ${u ? `<a class="pill coin" href="#/shop" title="Монеты">🪙 <b>${u.coins}</b></a>
      <a class="pill hide-m" href="#/me" title="${u.xp} XP"><span class="lvl">LV ${L}</span><span class="bar" style="width:70px;height:6px"><i style="width:${Math.min(100, (u.xp - lvlXp(L)) / (lvlXp(L + 1) - lvlXp(L)) * 100)}%"></i></span></a>` : ''}
    <button class="ib" data-act="theme" title="Тема">${document.body.classList.contains('light') ? I.moon : I.sun}</button>
    ${u ? `<a href="#/me" title="Профиль">${avatar(u, 36)}</a>` : `<button class="btn sm pri" data-act="auth">Войти</button>`}`
}

function theme() {
  const l = !document.body.classList.contains('light')
  document.body.classList.toggle('light', l)
  ls.s('light', l)
  shell()
  App.emit('theme', l)
}

async function daily() {
  try {
    const r = await api('daily', {})
    S.u.coins = r.coins; S.u.streak = r.streak; S.u.can_daily = false
    toast(`+${r.gain} 🪙 за вход. Серия ${pl(r.streak, 'день', 'дня', 'дней')} подряд`, 'coin')
    confetti(80)
    shell()
    App.emit('user')
  } catch (e) { toast(e.message, 'err') }
}

function setUser(u) {
  const was = S.u?.id
  S.u = u
  shell()
  if (was !== u?.id) {
    S.sock?.disconnect().connect()
    App.emit('user')
  }
}

function gain(r) {
  if (r.u) { S.u = r.u; shell() }
  const p = []
  if (r.coins) p.push(`+${r.coins} 🪙`)
  if (r.xp) p.push(`+${r.xp} XP`)
  if (p.length) toast(p.join('   '), 'coin')
}

function authBox(tab = 'login') {
  if (!S.cfg.reg && tab === 'reg') tab = 'login'
  const m = modal(`
    <div style="text-align:center;margin-bottom:18px"><div class="logo" style="justify-content:center;padding:0 0 10px"><i>py</i></div>
    <h2 id="at">${tab === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h2><p class="mu sm">Прогресс, кубки и монеты сохраняются в аккаунте</p></div>
    <div class="tabs" style="width:100%;margin-bottom:16px"><button data-t="login" style="flex:1">Вход</button><button data-t="reg" style="flex:1">Регистрация</button></div>
    <form class="col" id="af">
      <label class="f">Ник<input class="in" name="name" autocomplete="username" maxlength="20" required></label>
      <label class="f">Пароль<input class="in" name="pass" type="password" autocomplete="current-password" maxlength="100" required></label>
      <button class="btn pri lg" type="submit" id="ab">Войти</button>
      <p class="mu xs" id="ah" style="text-align:center"></p>
    </form>`)
  const f = $('#af', m.el)
  const set = t => {
    tab = t
    $$('[data-t]', m.el).forEach(b => b.classList.toggle('on', b.dataset.t === t))
    $('#at', m.el).textContent = t === 'login' ? 'С возвращением' : 'Создать аккаунт'
    $('#ab', m.el).textContent = t === 'login' ? 'Войти' : 'Зарегистрироваться'
    $('#ah', m.el).textContent = t === 'reg' ? (S.cfg.reg ? 'Ник: 3-20 символов. Пароль от 6 символов. За регистрацию +50 🪙' : 'Регистрация сейчас закрыта') : ''
    f.pass.autocomplete = t === 'reg' ? 'new-password' : 'current-password'
  }
  $$('[data-t]', m.el).forEach(b => b.onclick = () => set(b.dataset.t))
  set(tab)
  f.onsubmit = async e => {
    e.preventDefault()
    const b = $('#ab', m.el)
    b.disabled = true
    try {
      const r = await api(tab === 'login' ? 'login' : 'register', { name: f.name.value, pass: f.pass.value })
      m.close()
      setUser(r.u)
      toast(tab === 'login' ? 'Привет, ' + r.u.name + '!' : 'Аккаунт создан. Держи 50 монет на старт', 'ok')
      if (tab === 'reg') confetti(90)
      refresh()
      route()
    } catch (er) { toast(er.message, 'err') }
    b.disabled = false
  }
  setTimeout(() => f.name.focus(), 50)
}

async function logout() {
  await api('logout', {}).catch(() => {})
  setUser(null)
  location.hash = '#/'
  route()
}

async function refresh() {
  try {
    const r = await api('me')
    S.cfg = r.cfg; S.ai_left = r.ai_left
    S.u = r.u
    shell()
  } catch (e) {}
}

function needAuth(el, what = 'это') {
  el.innerHTML = `<div class="card empty"><b>🔐</b><p style="margin-bottom:16px">Войди, чтобы открыть ${esc(what)}</p><button class="btn pri" data-act="auth">Войти</button> <button class="btn" data-act="reg">Регистрация</button></div>`
}

async function route() {
  const hs = location.hash.replace(/^#\/?/, '').split('/')
  const name = hs[0] || '', arg = decodeURIComponent(hs.slice(1).join('/'))
  const p = App.pages[name] || App.pages['404']
  try { S.off?.() } catch (e) {}
  S.off = null
  S.page = name
  if (name === 'chat') S.unread = 0
  const v = $('#view')
  v.innerHTML = ''
  v.style.animation = 'none'; v.offsetHeight; v.style.animation = ''
  setTitle(p.title || '')
  shell()
  scrollTo(0, 0)
  try {
    const r = await p.render(v, arg)
    if (typeof r === 'function') S.off = r
  } catch (e) {
    console.error(e)
    v.innerHTML = `<div class="card empty"><b>😵</b>${esc(e.message)}</div>`
  }
}

function sock() {
  if (typeof io !== 'function') return
  const s = S.sock = io({ withCredentials: true, transports: ['websocket', 'polling'] })
  s.on('hello', d => { S.online = d.online; S.chatCan = d.can; App.emit('chat', { t: 'hello' }) })
  s.on('hist', a => { S.chat = a; App.emit('chat', { t: 'hist' }) })
  s.on('msg', m => {
    S.chat.push(m)
    if (S.chat.length > 300) S.chat.splice(0, S.chat.length - 300)
    if (S.page !== 'chat' && m.u?.id !== S.u?.id) { S.unread++; shell() }
    App.emit('chat', { t: 'msg', m })
  })
  s.on('del', id => { S.chat = S.chat.filter(m => m.id !== id); App.emit('chat', { t: 'del', id }) })
  s.on('clear', () => { S.chat = []; App.emit('chat', { t: 'hist' }) })
  s.on('sys', t => { S.chat.push({ sys: t, id: 'sys' + Date.now() }); App.emit('chat', { t: 'msg', m: S.chat[S.chat.length - 1] }) })
  s.on('online', n => { S.online = n; App.emit('chat', { t: 'online' }) })
  s.on('cfg', c => { S.cfg = c; App.emit('cfg') })
}

App.page('404', { title: 'Не найдено', render: v => { v.innerHTML = `<div class="card empty"><b>🧭</b>Такой страницы нет. <a href="#/" style="color:var(--y)">На главную</a></div>` } })

const ACT = { auth: () => authBox(), reg: () => authBox('reg'), theme: () => theme(), daily: () => daily(), logout: () => logout() }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]')
  if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e) }
})

addEventListener('hashchange', route)
addEventListener('DOMContentLoaded', async () => {
  if (ls.g('light', false)) document.body.classList.add('light')
  shell()
  await refresh()
  sock()
  route()
})
