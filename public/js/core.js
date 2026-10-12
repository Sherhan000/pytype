const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const h = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild }
const ls = {
  g(k, d) { try { const v = localStorage.getItem('pt_' + k); return v === null ? d : JSON.parse(v) } catch (e) { return d } },
  s(k, v) { try { localStorage.setItem('pt_' + k, JSON.stringify(v)) } catch (e) {} }
}
const fmt = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
const pl = (n, a, b, c) => {
  if (LANG !== 'ru') return n + ' ' + plx(n, c)
  const m = n % 10, x = n % 100
  return n + ' ' + (m === 1 && x !== 11 ? a : m >= 2 && m <= 4 && (x < 10 || x >= 20) ? b : c)
}
const plw = (n, a, b, c) => pl(n, a, b, c).replace(/^\d+ /, '')
const sym = k => k === ' ' ? '␣' : k === '\n' ? '↵' : k
const ago = d => {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 50) return t('только что')
  if (s < 3600) return t('{0} назад', pl(Math.max(1, Math.round(s / 60)), 'минуту', 'минуты', 'минут'))
  if (s < 86400) return t('{0} назад', pl(Math.floor(s / 3600), 'час', 'часа', 'часов'))
  if (s < 86400 * 2) return t('вчера')
  return new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'short' })
}
const dur = ms => {
  const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60)
  return d ? t('{0} д {1} ч', d, hh) : hh ? t('{0} ч {1} мин', hh, m % 60) : t('{0} мин', m % 60)
}
const lvl = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1
const lvlXp = l => 40 * (l - 1) ** 2

const S = { u: null, cfg: { chat: {}, ai: {} }, ai_left: 0, online: 0, chat: [], unread: 0, notes: 0, page: '', off: null, duel: null, upd: false }

async function api(p, b, m) {
  const r = await fetch('/api/' + p, {
    method: m || (b !== undefined ? 'POST' : 'GET'),
    headers: b !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: b !== undefined ? JSON.stringify(b) : undefined,
    credentials: 'same-origin'
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(t(j.e || t('Сервер ответил ошибкой {0}', r.status))); e.code = r.status; throw e }
  return j
}

function toast(m, t = '', ms) {
  const el = h(`<div class="toast ${t}"></div>`)
  el.textContent = m
  $('#toasts').append(el)
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 230) }, ms || (t === 'err' ? 4200 : 2800))
  return el
}

function modal(html, o = {}) {
  const m = $('#modal')
  m.innerHTML = `<div class="mbg"><div class="mbox ${o.wide ? 'w' : ''}"><div class="grab"></div><button class="ib x" data-x aria-label="Закрыть">${I.x}</button>${html}</div></div>`
  const bg = $('.mbg', m)
  let done = false
  const close = () => { if (done) return; done = true; m.innerHTML = ''; removeEventListener('keydown', k); o.onclose?.() }
  const k = e => { if (e.key === 'Escape') close() }
  bg.addEventListener('mousedown', e => { if (e.target === bg) close() })
  $('[data-x]', m).onclick = close
  addEventListener('keydown', k)
  return { el: $('.mbox', m), close }
}

function ask(text, ok = 'Да', cls = 'pri') {
  return new Promise(r => {
    let v = false
    const m = modal(`<h2>${esc(text)}</h2><div class="row mt"><button class="btn" data-n style="flex:1">Отмена</button><button class="btn ${cls}" data-y style="flex:1">${esc(ok)}</button></div>`, { onclose: () => r(v) })
    $('[data-n]', m.el).onclick = () => m.close()
    $('[data-y]', m.el).onclick = () => { v = true; m.close() }
  })
}

const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
const I = {
  home: sv('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  kb: sv('<rect x="2" y="6" width="20" height="13" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10"/>'),
  path: sv('<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M8.3 6.2 15.7 10.8M15.7 13.2 8.3 17.8"/>'),
  swords: sv('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l-2 2M7 17l-3 3M3 19l2 2"/>'),
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  bag: sv('<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9zM9 8V6a3 3 0 0 1 6 0v2"/>'),
  chat: sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  chart: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  news: sv('<path d="M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/>'),
  spark: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  bell: sv('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  play: sv('<path d="M7 4v16l13-8z" fill="currentColor"/>'),
  out: sv('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'),
  gift: sv('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v7h14v-7M12 8v12M12 8S10.5 3 8 4s0 4 4 4zM12 8s1.5-5 4-4 0 4-4 4z"/>'),
  x: sv('<path d="M18 6 6 18M6 6l12 12"/>'),
  send: sv('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
  redo: sv('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>'),
  next: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  prev: sv('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  chev: sv('<path d="m9 6 6 6-6 6"/>'),
  dice: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 16h.01M16 8h.01M8 16h.01M12 12h.01"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  mute: sv('<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>'),
  edit: sv('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  link: sv('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  copy: sv('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  reply: sv('<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v4"/>'),
  more: sv('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  flag: sv('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  smile: sv('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>'),
  globe: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  ghost: sv('<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2zM9.5 10h.01M14.5 10h.01"/>')
}

const avatar = (u, s = 40, on) => `<span class="av ${u?.frame ? 'fr-' + esc(u.frame) : ''}" style="--s:${s}px">${esc(u?.avatar || '🐍')}${on ? '<i class="on"></i>' : ''}</span>`
const nick = u => {
  const c = u?.ncolor
  return `<span class="nm ${c === 'grad' ? 'nc-grad' : ''}" ${c && c !== 'grad' ? `style="color:${esc(c)}"` : ''}>${esc(u?.name || '')}</span>`
}
const roleTag = r => r === 'admin' ? '<span class="role admin">админ</span>' : r === 'mod' ? '<span class="role mod">модератор</span>' : r === 'bot' ? '<span class="role bot">бот</span>' : ''
const starsH = (n, max = 3) => `<span class="stars">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`

function md(t) {
  const parts = String(t || '').split(/```(?:[a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g)
  return parts.map((p, i) => i % 2
    ? `<pre><code>${typeof hlHtml === 'function' ? hlHtml(p.replace(/\n$/, '')) : esc(p)}</code></pre>`
    : esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>')
  ).join('')
}

function confetti(n = 140) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = h('<canvas class="confetti"></canvas>')
  document.body.append(c)
  const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight
  const cols = ['#ffd43b', '#ff9f43', '#4c8dff', '#a98bff', '#36d49a', '#ff6b6b']
  const p = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 7 + 5, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, va: (Math.random() - .5) * .3 }))
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
    { r: 'path', t: 'Путь', i: 'path', m: 1 },
    { r: 'train', t: 'Тренировка', i: 'kb' },
    { r: 'duel', t: 'Дуэли', i: 'swords' },
    { r: 'tourn', t: 'Турнир', i: 'flag' },
    { r: 'top', t: 'Рейтинг', i: 'trophy' },
    { r: 'analytics', t: 'Аналитика', i: 'chart' },
    { r: 'chat', t: 'Чат', i: 'chat', m: 1 },
    { r: 'shop', t: 'Магазин', i: 'bag' },
    { r: 'ai', t: 'ИИ-наставник', i: 'spark' },
    { r: 'news', t: 'Что нового', i: 'news' },
    { r: 'me', t: 'Профиль', i: 'user', m: 1 },
    { r: 'admin', t: 'Админка', i: 'shield', role: ['admin', 'mod'] }
  ],
  page(name, def) { this.pages[name] = def },
  kind(name, def) { this.kinds[name] = def },
  ev: new EventTarget(),
  on(t, f) { const g = e => f(e.detail); this.ev.addEventListener(t, g); return () => this.ev.removeEventListener(t, g) },
  emit(t, d) { this.ev.dispatchEvent(new CustomEvent(t, { detail: d })) }
}

function setTitle(s) { s = t(s); const e = $('#top h1'); if (e) e.textContent = s; document.title = s + ' · ' + (S.cfg.site || 'pytype') }

function shell() {
  const u = S.u, cur = S.page.split('/')[0]
  const on = r => cur === r || (r === 'path' && (cur === 'task' || cur === 'leagues')) || (r === 'me' && (cur === 'notes' || cur === 'stats'))
  const vis = App.nav.filter(n => !n.role || n.role.includes(u?.role))
  $('#side').innerHTML = `
    <a href="#/" class="logo"><i>py</i><b>${esc(S.cfg.site || 'pytype')}</b></a>
    ${vis.map(n => `<a class="nav ${on(n.r) ? 'on' : ''}" href="#/${n.r}">${I[n.i] || ''}<span>${n.t}</span>${n.r === 'chat' && S.unread ? `<span class="bd">${S.unread > 99 ? '99+' : S.unread}</span>` : ''}</a>`).join('')}
    <div class="grow"></div>
    <button class="btn pri lg play" data-act="play">${I.play} Играть</button>
    ${u ? '' : `<button class="btn b" data-act="auth">Войти</button>`}`
  const tb = vis.filter(n => n.m)
  $('#tabbar').innerHTML = tb.slice(0, 2).map(tab).join('') + `<button class="fab" data-act="play" aria-label="Играть">${I.play}</button>` + tb.slice(2).map(tab).join('')
  function tab(n) { return `<a class="${on(n.r) ? 'on' : ''}" href="#/${n.r}">${I[n.i]}<span>${n.t}</span>${n.r === 'chat' && S.unread ? '<i class="bd"></i>' : ''}${n.r === 'me' && S.notes ? '<i class="bd"></i>' : ''}${n.r === '' && u?.can_daily ? '<i class="bd y"></i>' : ''}</a>` }
  const t = $('#top h1')?.textContent || ''
  $('#top').innerHTML = `<a href="#/" class="mlogo">py</a><h1>${esc(t)}</h1><span class="sp"></span>
    ${u ? `${u.can_daily ? `<button class="btn sm y tb-daily" data-act="daily">${I.gift}<span class="hide-m">Бонус</span></button>` : ''}
      <a class="pill fire ${u.can_daily ? 'off' : ''}" href="#/me" title="Дней подряд">🔥 ${u.streak || 0}</a>
      <a class="pill coin" href="#/shop" title="Монеты">🪙 ${u.coins}</a>
      <a class="ib" href="#/notes" title="Уведомления">${I.bell}${S.notes ? `<span class="dotr">${S.notes > 9 ? '9+' : S.notes}</span>` : ''}</a>` : ''}
    <button class="ib ${u ? 'hide-m' : ''}" data-act="lang" title="Язык">${I.globe}</button>
    <button class="ib hide-m" data-act="theme" title="Тема">${document.body.classList.contains('light') ? I.moon : I.sun}</button>
    ${u ? '' : `<button class="btn sm pri" data-act="auth">Войти</button>`}`
}

function theme() {
  const l = !document.body.classList.contains('light')
  document.body.classList.toggle('light', l)
  ls.s('light', l)
  $('meta[name=theme-color]').content = l ? '#eef0fb' : '#161936'
  shell()
  App.emit('theme', l)
}

async function daily() {
  try {
    const r = await api('daily', {})
    S.u.coins = r.coins; S.u.streak = r.streak; S.u.can_daily = false
    toast(`+${r.gain} 🪙 за вход. Огонь горит ${pl(r.streak, 'день', 'дня', 'дней')}`, 'coin')
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
  const A = r.ach || []
  if (A.length) setTimeout(() => { toast(A.length === 1 ? `${A[0].i} Достижение «${A[0].t}», +${A[0].r} 🪙` : `Новые достижения ${A.map(a => a.i).join(' ')}, +${A.reduce((s, a) => s + a.r, 0)} 🪙`, 'coin', 4500); confetti(90) }, 900)
}

function playSheet() {
  const nt = S.next
  const m = modal(`<h2>Во что сыграем?</h2><p class="mu mb">Выбери режим</p>
    <div class="tiles" style="grid-template-columns:1fr 1fr">
      <a class="tile r" href="#/duel"><b>⚔️</b><strong>Дуэль</strong><span>Гонка с живым соперником</span></a>
      <a class="tile b" href="#/train"><b>⌨️</b><strong>Тренировка</strong><span>Свободно, без оценок</span></a>
      <a class="tile y" href="${nt ? '#/task/' + nt.id : '#/path'}"><b>🚩</b><strong>${nt ? 'Продолжить' : 'Путь'}</strong><span>${nt ? esc(nt.title) : 'Задания по лигам'}</span></a>
      <a class="tile g" href="#/tourn"><b>🏁</b><strong>Турнир недели</strong><span>Призы в понедельник</span></a>
      <a class="tile v" href="#/ai"><b>✨</b><strong>ИИ-наставник</strong><span>Спроси про код</span></a>
    </div>`)
  m.el.addEventListener('click', e => { if (e.target.closest('a')) m.close() })
}

function authBox(tab = 'login') {
  if (!S.cfg.reg && tab === 'reg') tab = 'login'
  const m = modal(`
    <div style="text-align:center;margin-bottom:16px"><div class="logo" style="justify-content:center;padding:4px 0 14px"><i>py</i></div>
    <h2 data-at></h2><p class="mu sm">Прогресс, кубки и монеты хранятся в аккаунте</p></div>
    <div class="tabs" style="width:100%;margin-bottom:16px;display:flex"><button data-t="login" style="flex:1">Вход</button><button data-t="reg" style="flex:1">Регистрация</button></div>
    <form class="col" data-af>
      <label class="f">Ник<input class="in" name="name" autocomplete="username" maxlength="20" required autocapitalize="off"></label>
      <label class="f">Пароль<input class="in" name="pass" type="password" autocomplete="current-password" maxlength="100" required></label>
      <button class="btn pri lg wide" type="submit" data-ab></button>
      <p class="mu xs" data-ah style="text-align:center"></p>
    </form>`)
  const f = $('[data-af]', m.el)
  const set = t => {
    tab = t
    $$('[data-t]', m.el).forEach(b => b.classList.toggle('on', b.dataset.t === t))
    $('[data-at]', m.el).textContent = t === 'login' ? 'С возвращением' : 'Новый аккаунт'
    $('[data-ab]', m.el).textContent = t === 'login' ? 'Войти' : 'Создать аккаунт'
    $('[data-ah]', m.el).textContent = t === 'reg' ? (S.cfg.reg ? 'Ник от 3 до 20 символов, пароль от 6. На старт дадим 50 монет' : 'Регистрация сейчас закрыта') : ''
    f.pass.autocomplete = t === 'reg' ? 'new-password' : 'current-password'
  }
  $$('[data-t]', m.el).forEach(b => b.onclick = () => set(b.dataset.t))
  set(tab)
  f.onsubmit = async e => {
    e.preventDefault()
    const b = $('[data-ab]', m.el)
    b.disabled = true
    try {
      const r = await api(tab === 'login' ? 'login' : 'register', { name: f.name.value, pass: f.pass.value })
      m.close()
      setUser(r.u)
      toast(tab === 'login' ? 'Привет, ' + r.u.name + '!' : 'Аккаунт создан, держи 50 монет', 'ok')
      if (tab === 'reg') confetti(90)
      await refresh()
      route()
    } catch (er) { toast(er.message, 'err') }
    b.disabled = false
  }
  if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => f.name.focus(), 50)
}

async function logout() {
  await api('logout', {}).catch(() => {})
  setUser(null)
  location.hash = '#/'
  route()
}

async function refresh() {
  const r = await api('me')
  S.cfg = r.cfg; S.ai_left = r.ai_left; S.notes = r.unread || 0
  S.u = r.u
  shell()
  return r
}

function needAuth(el, what = 'это') {
  el.innerHTML = `<div class="card empty"><b>🔐</b><p style="margin-bottom:18px">Войди, чтобы открыть ${esc(what)}</p><div class="row" style="justify-content:center"><button class="btn pri" data-act="auth">Войти</button><button class="btn" data-act="reg">Создать аккаунт</button></div></div>`
}

async function route() {
  if (S.upd) { location.reload(); return }
  const hs = location.hash.replace(/^#\/?/, '').split('/')
  const name = hs[0] || '', arg = decodeURIComponent(hs.slice(1).join('/'))
  const p = App.pages[name] || App.pages['404']
  try { S.off?.() } catch (e) {}
  S.off = null
  S.page = name + (arg ? '/' + arg : '')
  if (name === 'chat') S.unread = 0
  $('#modal').innerHTML = ''
  const v = $('#view')
  v.innerHTML = ''
  setTitle(p.title || '')
  shell()
  scrollTo(0, 0)
  try {
    const r = await p.render(v, arg)
    if (typeof r === 'function') S.off = r
    App.emit('route', S.page)
  } catch (e) {
    console.error(e)
    v.innerHTML = `<div class="card empty"><b>😵</b>${esc(e.message)}<div class="mt"><a class="btn" href="#/">На главную</a></div></div>`
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
  s.on('feed', e => App.emit('feed', { t: 'new', e }))
  s.on('react', d => App.emit('feed', { t: 'react', d }))
  s.on('note', n => {
    S.notes++
    shell()
    App.emit('note', n)
    const d = n.data || {}
    if (n.kind === 'follow') toast(`${d.name} подписался на тебя`)
    if (n.kind === 'react') toast(`${d.name} поставил ${d.e} на твою запись`)
    if (n.kind === 'tourn') { toast(t('🏁 Турнир недели закончился: {0} место, +{1} 🪙', d.p, d.c), 'coin', 6000); refresh().catch(() => {}) }
  })
  s.on('quest', q => toast(`${q.i} Задание дня выполнено: ${q.t}. Забери награду на главной`, 'ok', 4200))
  s.on('duel:invite', d => {
    const m = modal(`<div style="text-align:center">${avatar(d.u, 80)}<h2 class="mt">${esc(d.u.name)} вызывает на дуэль</h2><p class="mu mb">Кто быстрее напечатает один и тот же код</p>
      <div class="row"><button class="btn" data-n style="flex:1">Не сейчас</button><button class="btn r" data-y style="flex:1;--c:var(--r);--cs:var(--rs);--kc:#fff">Принять</button></div></div>`)
    $('[data-n]', m.el).onclick = () => m.close()
    $('[data-y]', m.el).onclick = () => { m.close(); location.hash = '#/duel/' + d.room }
  })
  s.on('duel:start', d => {
    S.duel = { ...d, local: Date.now() + (d.start - d.now) }
    if (S.page.split('/')[0] !== 'duel' || S.page.includes('/')) location.hash = '#/duel'
    else App.emit('duel', { t: 'start' })
  })
  s.on('duel:opp', d => App.emit('duel', { t: 'opp', d }))
  s.on('duel:end', d => { App.emit('duel', { t: 'end', d }); refresh().catch(() => {}) })
  s.on('duel:bad', d => toast(d.e, 'err'))
  s.io.on('reconnect', () => App.emit('chat', { t: 'hist' }))
}

let wakeT = null, wakeTr = null
function wake() {
  if ($('.wake')) return
  const el = h(`<div class="wake">
    <div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke="var(--card3)" stroke-width="10" fill="none"/><circle cx="50" cy="50" r="44" stroke="var(--y)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="0" data-c/></svg><b data-n>60</b></div>
    <h2>Сервер просыпается</h2>
    <p data-p>Если на сайт долго никто не заходит, сервер засыпает. Проснётся примерно за минуту, сайт откроется сам. А пока можно размять пальцы.</p>
    <div class="mini" data-mini></div>
  </div>`)
  document.body.append(el)
  const t0 = Date.now()
  wakeT = setInterval(() => {
    const s = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000))
    $('[data-n]', el).textContent = s
    $('[data-c]', el).style.strokeDashoffset = 276.5 * (1 - s / 60)
    if (!s) $('[data-p]', el).textContent = 'Ещё чуть-чуть, сервер почти проснулся.'
  }, 500)
  if (typeof Trainer === 'function') {
    const w = ['for i in range(3):\n    print("wake up", i)', 'coffee = ["espresso", "latte"]\nprint(len(coffee))', 'def ready(t):\n    return t > 0\nprint(ready(60))']
    wakeTr = Trainer($('[data-mini]', el), { code: w[Math.random() * w.length | 0], name: 'разминка', mini: true })
  }
}
function unwake() {
  clearInterval(wakeT)
  wakeTr?.destroy()
  const el = $('.wake')
  if (el) { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300) }
}

function langBox() {
  const m = modal(`<h2>Язык</h2><p class="mu mb">Language · Til · Забон</p>
    <div class="col">${Object.entries(LANGS).map(([k, n]) => `<button class="btn ${k === LANG ? 'pri' : ''} lg wide" data-lg="${k}"><span data-notr>${n}</span></button>`).join('')}</div>`)
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-lg]')
    if (!b) return
    ls.s('lang', b.dataset.lg)
    location.reload()
  })
}

const ACT = { auth: () => authBox(), reg: () => authBox('reg'), theme: () => theme(), daily: () => daily(), logout: () => logout(), play: () => playSheet(), lang: () => langBox() }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]')
  if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e) }
})

App.page('404', { title: 'Не найдено', render: v => { v.innerHTML = `<div class="card empty"><b>🧭</b>Такой страницы нет<div class="mt"><a class="btn pri" href="#/">На главную</a></div></div>` } })

addEventListener('hashchange', route)
addEventListener('DOMContentLoaded', async () => {
  if (ls.g('light', false)) { document.body.classList.add('light'); $('meta[name=theme-color]').content = '#eef0fb' }
  document.body.classList.toggle('touch', matchMedia('(pointer:coarse)').matches)
  shell()
  const t = setTimeout(wake, 2500)
  for (let i = 0; ; i++) {
    try { await refresh(); break } catch (e) {
      if (e.code && e.code < 500) break
      if (i === 0) wake()
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  clearTimeout(t)
  unwake()
  sock()
  route()
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    let had = !!navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) S.upd = true; had = true })
  }
})
