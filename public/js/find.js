const FK = {
  '': 'главная дом home', path: 'лиги задания кубки уровни', puzzles: 'тест квиз задачи загадки вопросы', train: 'печать свой код файл таймер практика',
  lessons: 'видео ютуб уроки обучение', groups: 'группа клуб класс команда друзья', duel: 'соперник бой pvp вызов', tourn: 'неделя призы соревнование', top: 'топ лидеры лучшие игроки',
  analytics: 'статистика графики проценты', chat: 'сообщения общение люди', shop: 'аватар рамка тема монеты покупки', ai: 'ии бот помощь вопрос groq',
  news: 'обновления новости', me: 'профиль настройки ник пароль аккаунт достижения', admin: 'админ управление'
}
const nz = s => String(s || '').toLowerCase().replace(/ё/g, 'е')
let fdIdx = null

async function fdData() {
  if (fdIdx && Date.now() - fdIdx.at < 90e3) return fdIdx
  const [lg, ls2] = await Promise.all([api('leagues').catch(() => ({ leagues: [] })), api('lessons').catch(() => ({ rows: [] }))])
  const KL = typeof KIND_L !== 'undefined' ? KIND_L : {}
  fdIdx = {
    at: Date.now(),
    tasks: lg.leagues.flatMap(l => l.tasks.map(x => ({
      g: l.id ? 'Задания' : 'Головоломки', ic: x.done ? '✅' : l.id ? l.icon : '🧩', n: t(x.title), raw: x.title, h: '#/task/' + x.id,
      s: (l.id ? t('Лига «{0}»', t(l.name)) : t(KL[x.kind] || '')) + (l.open ? '' : ' · 🔒'), k: x.descr || ''
    }))),
    lessons: (ls2.rows || []).map(x => ({ g: 'Видеоуроки', ic: '🎬', n: x.title, h: '#/lesson/' + x.id, s: t('Видеоурок'), k: x.descr || '' }))
  }
  return fdIdx
}

function fdBase() {
  const u = S.u
  const pages = App.nav.filter(n => !n.role || n.role.includes(u?.role)).map(n => ({ g: 'Разделы', svg: I[n.i], n: t(n.t), raw: n.t, h: '#/' + n.r, k: FK[n.r] || '' }))
  const acts = [
    { n: 'Открыть файл с кодом', svg: I.kb, h: '#/train', k: 'файл py загрузить' },
    { n: 'Найти соперника', svg: I.swords, h: '#/duel', k: 'дуэль играть' },
    { n: 'Уведомления', svg: I.bell, h: '#/notes', k: 'колокольчик' },
    { n: document.body.classList.contains('light') ? 'Тёмная тема' : 'Светлая тема', svg: I.sun, f: theme, k: 'тема цвет фон' },
    { n: 'Сменить язык', svg: I.globe, f: langBox, k: 'language til забон english' },
    u?.can_daily && { n: 'Забрать бонус за вход', svg: I.gift, f: daily, k: 'монеты подарок' },
    u ? { n: 'Выйти из аккаунта', svg: I.out, f: logout, k: 'выход logout' } : { n: 'Войти или создать аккаунт', svg: I.user, f: () => authBox(), k: 'регистрация вход login' }
  ].filter(Boolean).map(x => ({ ...x, g: 'Действия', raw: x.n, n: t(x.n) }))
  const adm = ['admin', 'mod'].includes(u?.role) && typeof ATABS !== 'undefined'
    ? ATABS.filter(x => x[2].includes(u.role)).map(x => ({ g: 'Админка', svg: I.shield, n: t('Админка') + ': ' + t(x[1]), raw: x[1], h: '#/admin/' + x[0], k: 'админ' })) : []
  return [...pages, ...acts, ...adm]
}

function fdMatch(list, q, max) {
  const w = nz(q).split(/\s+/).filter(Boolean)
  if (!w.length) return list.slice(0, max)
  const r = []
  for (const x of list) {
    const tl = nz(x.n + ' ' + (x.raw || '')), hay = tl + ' ' + nz(x.k) + ' ' + nz(x.s)
    if (!w.every(y => hay.includes(y))) continue
    r.push([tl.startsWith(w[0]) ? 3 : w.every(y => tl.includes(y)) ? 2 : 1, x])
  }
  return r.sort((a, b) => b[0] - a[0]).slice(0, max).map(a => a[1])
}

function finder() {
  if ($('.fd')) { $('.fd input')?.focus(); return }
  const el = h(`<div class="fd" role="dialog"><div class="fd-b">
    <label class="fd-i">${I.search}<input placeholder="Раздел, задание, урок или игрок" autocomplete="off" autocapitalize="off" spellcheck="false"><kbd>Esc</kbd></label>
    <div class="fd-l"></div>
    <div class="fd-f">↑ ↓ · Enter · Esc</div></div></div>`)
  document.body.append(el)
  const inp = $('input', el), box = $('.fd-l', el)
  let items = [], sel = 0, users = [], uq = '', tm
  const close = () => { el.remove(); removeEventListener('keydown', key, true) }
  const go = x => {
    close()
    if (!x) return
    if (x.f) x.f()
    else if (location.hash === x.h || (x.h === '#/' && !location.hash.replace(/^#\/?/, ''))) route()
    else location.hash = x.h
  }
  function draw() {
    const q = inp.value.trim(), base = fdBase(), d = fdIdx
    const G = [
      fdMatch(base.filter(x => x.g === 'Разделы'), q, q ? 6 : 16),
      q ? fdMatch(base.filter(x => x.g !== 'Разделы'), q, 5) : [],
      d && q ? fdMatch(d.tasks, q, 8) : [],
      d && q ? fdMatch(d.lessons, q, 5) : [],
      q.length >= 2 && uq === q ? users : []
    ]
    items = G.flat()
    if (sel >= items.length) sel = Math.max(0, items.length - 1)
    let last = '', i = 0
    box.innerHTML = items.map(x => {
      const head = x.g !== last ? `<div class="fd-g">${esc(t(x.g))}</div>` : ''
      last = x.g
      return head + `<a class="fd-r ${i === sel ? 'on' : ''}" data-i="${i++}" href="${esc(x.h || '#')}">
        <span class="fd-ic">${x.svg || (x.av ? avatar(x.av, 30) : esc(x.ic || ''))}</span>
        <span class="fd-t" data-notr><b>${esc(x.n)}</b>${x.s ? `<span>${esc(x.s)}</span>` : ''}</span>${I.chev}</a>`
    }).join('') || `<div class="fd-e">${esc(q ? t('Ничего не нашлось. Попробуй другое слово') : t('Загружаю...'))}</div>`
    box.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
  }
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; draw() } }
    else if (e.key === 'Enter' && document.activeElement === inp) { e.preventDefault(); go(items[sel]) }
  }
  addEventListener('keydown', key, true)
  el.addEventListener('mousedown', e => { if (e.target === el) close() })
  box.addEventListener('click', e => { const a = e.target.closest('[data-i]'); if (a) { e.preventDefault(); go(items[+a.dataset.i]) } })
  box.addEventListener('mousemove', e => { const a = e.target.closest('[data-i]'); if (a && +a.dataset.i !== sel) { sel = +a.dataset.i; $$('.fd-r', box).forEach(x => x.classList.toggle('on', x === a)) } })
  inp.addEventListener('input', () => {
    sel = 0
    draw()
    clearTimeout(tm)
    const q = inp.value.trim()
    if (q.length < 2) return
    tm = setTimeout(async () => {
      try {
        const { rows } = await api('users?q=' + encodeURIComponent(q))
        if (inp.value.trim() !== q || !el.isConnected) return
        uq = q
        users = rows.slice(0, 5).map(r => ({ g: 'Игроки', av: r, n: r.name, h: '#/u/' + encodeURIComponent(r.name), s: t('Уровень {0}, {1} сл/мин', lvl(r.xp), r.best_wpm) }))
        draw()
      } catch (er) {}
    }, 250)
  })
  draw()
  fdData().then(() => el.isConnected && draw())
  setTimeout(() => inp.focus(), 10)
}

async function issuesBox(el) {
  if (!el) return
  let rows
  try { rows = (await api('issues')).rows } catch (e) { return }
  if (!rows.length || !el.isConnected) return
  el.innerHTML = `<details class="iss"><summary>⚠️ ${esc(t('Известные проблемы'))} <span>${rows.length}</span></summary>
    <ul>${rows.map(r => `<li>${esc(t(r.text))}</li>`).join('')}</ul>
    <div class="iss-f">${esc(t('Мы про них знаем и чиним. Нашёл что-то ещё? Напиши в чат'))}</div></details>`
}
