const PRACTICE = [
{ name: 'Разминка: скобки и операторы', code: `data = {"a": [1, 2, 3], "b": (4, 5), "c": {6, 7}}
x = (data["a"][0] + data["b"][1]) * 2 - 3 / 4
ok = x >= 10 and x != 12 or not data
pairs = [(k, v) for k, v in data.items() if v]
print(f"{x:.1f} -> {ok!r} | {len(pairs)}")
mask = 0b1010 | 0b0101 & ~0b0011 ^ 0xff
print(mask << 2, mask >> 1, mask % 7, -mask // 3)` },
{ name: 'Стек и очередь', code: `from collections import deque


def balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack


q = deque([1, 2, 3])
q.append(4)
q.appendleft(0)
print(q.popleft(), q.pop(), list(q))
print(balanced("{[()()]}"), balanced("([)]"))` },
{ name: 'Наследование', code: `class Shape:
    def __init__(self, name):
        self.name = name

    def area(self):
        raise NotImplementedError

    def __str__(self):
        return f"{self.name}: {self.area():.2f}"


class Circle(Shape):
    def __init__(self, r):
        super().__init__("circle")
        self.r = r

    def area(self):
        return 3.14159 * self.r ** 2


class Rect(Shape):
    def __init__(self, w, h):
        super().__init__("rect")
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h


for s in sorted([Circle(2), Rect(3, 4), Circle(1)], key=lambda s: s.area()):
    print(s)` },
{ name: 'Counter и сортировки', code: `from collections import Counter

text = "to be or not to be that is the question"
words = text.split()
c = Counter(words)
print(c.most_common(3))

people = [("Ann", 31), ("Bob", 25), ("Cid", 31), ("Dan", 19)]
by_age = sorted(people, key=lambda p: (-p[1], p[0]))
print(by_age)

names = list(map(str.upper, (p[0] for p in people)))
adults = list(filter(lambda p: p[1] >= 21, people))
print(names, len(adults))
print(max(people, key=lambda p: p[1])[0])` },
{ name: 'Матрицы', code: `def transpose(m):
    return [list(row) for row in zip(*m)]


def multiply(a, b):
    bt = transpose(b)
    return [[sum(x * y for x, y in zip(r, c)) for c in bt] for r in a]


def identity(n):
    return [[int(i == j) for j in range(n)] for i in range(n)]


a = [[1, 2], [3, 4]]
b = [[5, 6], [7, 8]]
print(transpose(a))
print(multiply(a, b))
print(multiply(a, identity(2)) == a)` },
{ name: 'Работа с файлами', code: `import json

users = [{"name": "Ann", "score": 91}, {"name": "Bob", "score": 78}]

with open("users.json", "w") as f:
    json.dump(users, f, indent=2)

with open("users.json") as f:
    loaded = json.load(f)

best = max(loaded, key=lambda u: u["score"])
print(best["name"], best["score"])

with open("log.txt", "a") as f:
    for u in loaded:
        f.write(f"{u['name']};{u['score']}\\n")

with open("log.txt") as f:
    print(f.read().splitlines())` },
{ name: 'Даты и время', code: `from datetime import date, datetime, timedelta

today = date(2026, 10, 11)
deadline = today + timedelta(days=45)
print(deadline, deadline.strftime("%d.%m.%Y"))
print((deadline - today).days, "days left")

stamp = datetime(2026, 10, 11, 18, 30)
print(stamp.isoformat(), stamp.weekday())

week = [today + timedelta(days=i) for i in range(7)]
print([d.strftime("%a") for d in week])` },
{ name: 'Свои исключения', code: `class ValidationError(Exception):
    def __init__(self, field, msg):
        super().__init__(f"{field}: {msg}")
        self.field = field


def validate(user):
    if not user.get("name"):
        raise ValidationError("name", "required")
    if not 0 < user.get("age", 0) < 130:
        raise ValidationError("age", "out of range")
    return True


for u in [{"name": "Ann", "age": 30}, {"age": 5}, {"name": "Old", "age": 200}]:
    try:
        validate(u)
        print("ok", u["name"])
    except ValidationError as e:
        print("bad", e.field, "->", e)` }
]

const EMO = ['🔥', '👏', '😮', '💪']

function drawChart(cv, d) {
  const W = cv.getBoundingClientRect().width, H = 220, dp = devicePixelRatio || 1
  if (!W) return
  cv.width = W * dp; cv.height = H * dp
  const x = cv.getContext('2d'); x.scale(dp, dp)
  const cs = getComputedStyle(document.body), c = v => cs.getPropertyValue(v).trim()
  x.font = '600 11px Rubik, sans-serif'; x.fillStyle = c('--mu')
  if (d.length < 2) { x.fillText(t('Сделай хотя бы пару заходов, и тут появится график'), 8, H / 2); return }
  const pL = 30, pR = 36, pT = 10, pB = 12, mx = Math.max(20, ...d.map(v => v.w)) * 1.15
  const X = i => pL + i * (W - pL - pR) / (d.length - 1), Y = (v, m) => pT + (1 - v / m) * (H - pT - pB)
  x.strokeStyle = c('--line'); x.lineWidth = 1.5
  for (let i = 0; i <= 4; i++) {
    const yy = pT + i * (H - pT - pB) / 4
    x.beginPath(); x.moveTo(pL, yy); x.lineTo(W - pR, yy); x.stroke()
    x.fillText(Math.round(mx * (1 - i / 4)), 2, yy + 4); x.fillText((100 - i * 25) + '%', W - pR + 5, yy + 4)
  }
  const line = (k, m, col, w) => {
    x.beginPath()
    d.forEach((v, i) => i ? x.lineTo(X(i), Y(v[k], m)) : x.moveTo(X(i), Y(v[k], m)))
    x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke()
  }
  line('a', 100, c('--b'), 2.5)
  line('w', mx, c('--y'), 3.5)
  x.fillStyle = c('--y')
  d.forEach((v, i) => { x.beginPath(); x.arc(X(i), Y(v.w, mx), 3.5, 0, 7); x.fill() })
}

function evText(e) {
  const d = e.data || {}
  switch (e.kind) {
    case 'task': return `${t('прошёл задание')} <b>«${esc(t(d.t))}»</b> ${starsH(d.s || 1)}`
    case 'task3': return `${t('взял три звезды в задании')} <b>«${esc(t(d.t))}»</b>`
    case 'cup': return `${t('получил кубок лиги')} <b>${esc(d.i)} ${esc(t(d.n))}</b>`
    case 'record': return `${t('поставил личный рекорд:')} <b>${esc(t('{0} слов в минуту', d.w))}</b>`
    case 'level': return `${t('дошёл до')} <b>${esc(t('{0} уровня', d.l))}</b>`
    case 'duel': return !d.w ? `${t('выиграл дуэль у')} <b>${esc(d.o || '?')}</b>, ${esc(t('соперник не дошёл до финиша'))}` : d.o ? `${t('выиграл дуэль у')} <b>${esc(d.o)}</b> ${esc(t('со скоростью {0} слов в минуту', d.w))}` : esc(t('выиграл дуэль со скоростью {0} слов в минуту', d.w))
    case 'ach': return `${t('открыл достижение')} <b>${esc(d.i)} ${esc(t(d.t))}</b>`
    case 'buy': return `${t('купил в магазине')} <b>${d.k === 'avatar' ? esc(d.v) + ' ' : ''}${esc(t(d.n))}</b>`
    case 'tourn': return `${esc(t('занял {0} место в турнире недели', d.p))} <b>«${esc(t(d.t))}»</b> ${['🥇', '🥈', '🥉'][d.p - 1] || ''}`
    case 'join': return t('теперь с нами. Поздоровайся в чате')
    default: return esc(e.kind)
  }
}

const WD = { uz: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'], tg: ['Як', 'Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шн'] }

function week(u) {
  const now = new Date(), last = u.can_daily ? -1 : 0
  const days = [-6, -5, -4, -3, -2, -1, 0].map(off => {
    const d = new Date(now); d.setDate(now.getDate() + off)
    const on = off <= last && off > last - (u.streak || 0)
    return `<span class="${on ? 'on' : ''} ${off === 0 ? 'td' : ''}"><i>${on ? '🔥' : off === 0 && u.can_daily ? '🎁' : ''}</i>${esc(off === 0 ? t('сегодня') : WD[LANG]?.[d.getDay()] || d.toLocaleDateString(LOC, { weekday: 'short' }).slice(0, 2))}</span>`
  }).join('')
  return `<div class="wk" ${u.can_daily ? 'data-act="daily" role="button"' : ''}>${days}</div>`
}

function evEl(e) {
  const r = Object.fromEntries((e.r || []).map(x => [x.e, x]))
  return `<div class="ev" data-ev="${e.id}">
    <a href="#/u/${encodeURIComponent(e.u.name)}">${avatar(e.u, 42)}</a>
    <div class="b"><div class="tx"><a href="#/u/${encodeURIComponent(e.u.name)}">${nick(e.u)}</a> ${evText(e)}</div>
      <div class="meta">${ago(e.created_at)}</div>
      <div class="rx">${EMO.map(x => `<button data-re="${x}" class="${r[x]?.mine ? 'on' : ''} ${r[x]?.n ? '' : 'z'}"><i>${x}</i><span>${r[x]?.n || ''}</span></button>`).join('')}<button class="add" data-rxa aria-label="Реакция">${I.smile || '☺'}<b>+</b></button></div>
    </div></div>`
}

function feedBox(box, scope) {
  let rows = []
  async function load() {
    box.innerHTML = '<div class="empty">Загружаю...</div>'
    try { rows = (await api('feed?scope=' + scope)).rows } catch (e) { rows = [] }
    box.innerHTML = rows.length ? rows.slice(0, 8).map(evEl).join('') + (rows.length > 8 ? '<button class="btn ghost wide more" data-more>Показать ещё</button>' : '') : `<div class="empty"><b>🌱</b>${scope === 'friends' ? 'Подпишись на кого-нибудь в рейтинге, и тут появятся их успехи' : 'Пока тихо. Пройди задание, и оно появится здесь'}</div>`
  }
  box.addEventListener('click', async e => {
    if (e.target.closest('[data-more]')) { e.target.closest('[data-more]').outerHTML = rows.slice(8).map(evEl).join(''); return }
    const a = e.target.closest('[data-rxa]')
    if (a) { a.parentElement.classList.toggle('open'); return }
    const b = e.target.closest('[data-re]')
    if (!b) return
    if (!S.u) return authBox()
    const id = +b.closest('[data-ev]').dataset.ev
    b.classList.toggle('on')
    b.parentElement.classList.remove('open')
    try {
      const r = await api(`feed/${id}/react`, { e: b.dataset.re })
      b.classList.toggle('on', r.on)
      b.classList.toggle('z', !r.n)
      $('span', b).textContent = r.n || ''
    } catch (er) { b.classList.toggle('on'); toast(er.message, 'err') }
  })
  const off = App.on('feed', d => {
    if (d.t === 'new' && (scope === 'all' || d.e.u.id === S.u?.id)) {
      box.querySelector('.empty')?.remove()
      box.insertAdjacentHTML('afterbegin', evEl(d.e))
    }
    if (d.t === 'react') {
      const b = box.querySelector(`[data-ev="${d.d.id}"] [data-re="${d.d.e}"]`)
      if (b) { $('span', b).textContent = d.d.n || ''; b.classList.toggle('z', !d.d.n) }
    }
  })
  load()
  return off
}

function questCard(box) {
  async function draw() {
    let q
    try { q = await api('quests') } catch (e) { box.innerHTML = ''; return }
    const hrs = Math.ceil(q.ends / 3600000)
    const all = q.list.every(x => x.got)
    box.innerHTML = `<div class="card"><h3>Задания дня<span class="sp"></span><span class="xs mu" style="font-weight:600">новые через ${pl(hrs, 'час', 'часа', 'часов')}</span></h3>
      ${q.list.map(x => `<div class="quest ${x.got ? 'got' : ''}"><div class="qi">${x.i}</div><div style="flex:1;min-width:0"><div class="qt">${esc(x.t)}</div><div class="bar ${x.p >= x.g ? 'g' : ''}"><i style="width:${x.p / x.g * 100}%"></i></div></div>
        ${x.got ? '<span class="tag ok">✓ забрано</span>' : x.p >= x.g ? (S.u ? `<button class="btn sm y" data-cl="${x.k}">+${x.r} 🪙</button>` : '') : `<span class="xs mu" style="font-weight:700;white-space:nowrap">${x.p} / ${x.g}</span>`}</div>`).join('')}
      <div class="chest"><b>${q.opened ? '🎉' : '🎁'}</b><span style="flex:1">${q.opened ? 'Сундук дня открыт. Возвращайся завтра' : `Выполни все три и открой сундук: ещё +${q.chest} 🪙`}</span>${!S.u ? '<button class="btn sm b" data-act="auth">Войти</button>' : all ? '' : ''}</div>
    </div>`
  }
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-cl]')
    if (!b) return
    b.disabled = true
    try {
      const r = await api('quests/claim', { k: b.dataset.cl })
      gain({ u: r.u })
      toast(r.chest ? `🎉 Сундук дня открыт! Всего +${r.gain} 🪙` : `+${r.gain} 🪙 за задание дня`, 'coin')
      if (r.chest) confetti(160)
      draw()
    } catch (er) { toast(er.message, 'err'); b.disabled = false }
  })
  draw()
  return draw
}

App.page('', {
  title: 'Главная',
  async render(v) {
    const u = S.u
    const lg = await api('leagues').catch(() => ({ leagues: [] }))
    const open = lg.leagues.filter(l => l.open).flatMap(l => l.tasks.map(t => ({ ...t, lg: l })))
    const nt = open.find(t => !t.done)
    S.next = nt || null
    const L = u ? lvl(u.xp) : 1, p = u ? (u.xp - lvlXp(L)) / (lvlXp(L + 1) - lvlXp(L)) * 100 : 0
    v.innerHTML = `
      ${u ? `<div class="hello">
          <a href="#/me" class="hav">${avatar(u, 60)}<span class="lv">${L}</span></a>
          <div class="hw">
            <div class="disp hn">Привет, ${esc(u.name)}</div>
            <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="bar" style="flex:1;max-width:280px;height:10px"><i style="width:${p}%"></i></div><span class="xs mu" style="white-space:nowrap">ещё ${lvlXp(L + 1) - u.xp} XP</span></div>
          </div>
          ${week(u)}
        </div>`
      : `<section class="hero"><div>
          <h2>Печатай код на Python быстро и без ошибок</h2>
          <p>Проходи путь из заданий, выигрывай дуэли у живых соперников, собирай кубки лиг и обгоняй друзей в рейтинге.</p>
          <div class="row"><button class="btn y lg" data-act="reg">Начать бесплатно</button><a class="btn lg" href="#/train" style="--c:rgba(255,255,255,.14);--cs:rgba(0,0,0,.18);--kc:#fff">Попробовать без входа</a></div>
        </div>
        <div class="keys3d">${['d', 'e', 'f', '(', ')', ':', 'p', 'r', 'i', 'n', 't', '"', 'h', 'i', '"'].map((k, i) => `<span class="${[1, 6, 12].includes(i) ? 'hot' : ''}">${esc(k)}</span>`).join('')}</div>
      </section>`}

      <div class="home">
        <div class="hm">
      ${nt ? `<a class="cont" href="#/task/${nt.id}" style="--lc:${esc(nt.lg.color)}">
        <div class="lic">${esc(nt.lg.icon)}</div>
        <div style="flex:1;min-width:0"><div class="xs mu" style="font-weight:700">${u ? 'Продолжить путь' : 'Первое задание'}, лига «${esc(nt.lg.name)}»</div><div class="t">${esc(nt.title)}</div></div>
        <span class="btn pri">${I.play}<span class="hide-m">Начать</span></span></a>` : ''}

      ${u?.can_daily ? `<div class="cont" style="--lc:var(--y);background:color-mix(in srgb,var(--y) 14%,var(--card));border-color:var(--ys);box-shadow:0 4px 0 var(--ys)">
        <div class="lic" style="background:var(--y);border-color:var(--ys)">🎁</div>
        <div style="flex:1"><div class="t">Бонус за вход</div><div class="sm mu">${u.streak ? `Огонь горит ${pl(u.streak, 'день', 'дня', 'дней')}. Не дай ему погаснуть` : 'Заходи каждый день, и награда растёт'}</div></div>
        <button class="btn pri" data-act="daily">Забрать</button></div>` : ''}

      <a class="cont" href="#/tourn" data-tn hidden style="--lc:var(--g)"></a>

          <div class="sec">Что происходит<span class="sp"></span>${u ? `<div class="tabs" data-fs><button data-s="all" class="on">Все</button><button data-s="friends">Друзья</button></div>` : ''}</div>
          <div class="card" style="padding:4px 18px" data-feed></div>
        </div>
        <aside class="hs">
          <div data-q></div>
          <div class="modes">
            <a class="tile r" href="#/duel"><b>⚔️</b><strong>Дуэль</strong><span><span data-on>${S.online}</span> онлайн</span></a>
            <a class="tile b" href="#/train"><b>⌨️</b><strong>Тренировка</strong><span>Свой код или файл</span></a>
            <a class="tile y" href="#/lessons"><b>🎬</b><strong>Видеоуроки</strong><span>Смотри и повторяй</span></a>
            <a class="tile g" href="#/top"><b>🏆</b><strong>Рейтинг</strong><span>Кто быстрее всех</span></a>
            <a class="tile v" href="#/ai"><b>✨</b><strong>ИИ-наставник</strong><span>Разберёт любой код</span></a>
            <a class="tile o" href="#/analytics"><b>📊</b><strong>Аналитика</strong><span>Ты и все остальные</span></a>
          </div>
        </aside>
      </div>`
    questCard($('[data-q]', v))
    api('tourn').then(r => {
      const el = $('[data-tn]', v)
      if (!r.t || !el) return
      el.innerHTML = `<div class="lic">🏁</div><div style="flex:1;min-width:0"><div class="xs mu" style="font-weight:700">${t('Турнир недели')} · ${t('до конца {0}', dur(r.ends))}</div>
        <div class="t">${esc(r.t.title)}</div><div class="sm mu">${r.mine ? t('Ты на {0} месте из {1}', r.mine.place, r.total) : t('Участников: {0}. Призы в понедельник', r.total)}</div></div>
        <span class="btn pri">${I.flag}<span class="hide-m">${t('Участвовать')}</span></span>`
      el.hidden = false
    }).catch(() => {})
    let offF = feedBox($('[data-feed]', v), 'all')
    $('[data-fs]', v)?.addEventListener('click', e => {
      const b = e.target.closest('[data-s]')
      if (!b) return
      $$('[data-s]', v).forEach(x => x.classList.toggle('on', x === b))
      offF(); offF = feedBox($('[data-feed]', v), b.dataset.s)
    })
    const offC = App.on('chat', () => { const o = $('[data-on]', v); if (o) o.textContent = S.online })
    return () => { offF(); offC() }
  }
})

const KIND_L = { type: '⌨️ Печать кода', quiz: '❓ Что выведет код', fix: '🔧 Найди ошибку', fill: '✍️ Допиши код', test: '📝 Тест', next: '🔮 Что дальше', trim: '🧹 Убери лишнее' }

async function taskStats(el, tk) {
  let d
  try { d = await api(`tasks/${tk.id}/stats`) } catch (e) { return }
  if (!el.isConnected) return
  const c = [
    `<div><b>${d.tried}</b><span>${esc(t('пробовали'))}</span></div>`,
    `<div><b>${d.rate ?? '—'}${d.rate != null ? '%' : ''}</b><span>${esc(t('дошли до конца'))}</span></div>`,
    tk.kind === 'type' ? `<div><b>${d.avg ?? '—'}</b><span>${esc(t('средняя скорость'))}</span></div>` : `<div><b>${d.first ?? '—'}${d.first != null ? '%' : ''}</b><span>${esc(t('решают с первой попытки'))}</span></div>`,
    tk.kind === 'type' ? `<div><b>${d.top || '—'}</b><span>${esc(t('рекорд задания'))}</span></div>` : ''
  ].join('')
  el.innerHTML = `<div class="card mt ts"><h3>📊 Статистика задания</h3><div class="ts-g">${c}</div>
    ${d.beat != null ? `<div class="ts-me">${esc(t('Твой лучший заход быстрее, чем у {0}% игроков', d.beat))}<div class="bar g"><i style="width:${d.beat}%"></i></div></div>` : ''}</div>`
}

function taskSheet(tk, l, open) {
  const m = modal(`<div class="row" style="gap:12px;margin-bottom:12px"><div class="lg-ic" style="--lc:${esc(l.color)}">${esc(l.icon)}</div><div><div class="xs mu" style="font-weight:700">Лига «${esc(l.name)}»</div><h2 style="margin:0">${esc(tk.title)}</h2></div></div>
    <p class="mu">${esc(tk.descr)}</p>
    ${tk.kind === 'type' ? `<div class="row mt sm"><span class="tag">от ${tk.min_wpm} слов в мин</span><span class="tag">точность от ${tk.min_acc}%</span><span class="tag y">+${tk.coins} 🪙</span><span class="tag">+${tk.xp} XP</span></div>
    ${tk.done ? `<div class="row mt">${starsH(tk.done.stars)}<span class="sm mu">лучший результат ${tk.done.best_wpm} слов в минуту, ${tk.done.best_acc}%</span></div>` : ''}
    <p class="xs mu mt">Две звезды за скорость в полтора раза выше и точность от 95%. Три звезды за двойную скорость и точность от 98%.</p>`
    : `<div class="row mt sm"><span class="tag b">${KIND_L[tk.kind] || esc(tk.kind)}</span><span class="tag y">+${tk.coins} 🪙</span><span class="tag">+${tk.xp} XP</span></div>
    ${tk.done ? `<div class="row mt">${starsH(tk.done.stars)}</div>` : ''}
    <p class="xs mu mt">Три звезды за верный ответ с первой попытки, две со второй, одна потом.</p>`}
    <p class="sm mt" data-st></p>
    ${open ? `<a class="btn pri lg wide mt" href="#/task/${tk.id}">${I.play} ${tk.done ? 'Пройти ещё раз' : 'Начать'}</a>` : `<div class="btn wide mt" style="opacity:.6">${I.lock} Лига закрыта</div>`}`)
  m.el.addEventListener('click', e => { if (e.target.closest('a')) m.close() })
  api(`tasks/${tk.id}/stats`).then(d => {
    const e = $('[data-st]', m.el)
    if (e && d.tried) e.innerHTML = `📊 ${esc(t('Прошли {0}% из {1} пробовавших', d.rate, d.tried))}${d.avg ? ' · ' + esc(t('в среднем {0} сл/мин', d.avg)) : ''}`
  }).catch(() => {})
}

App.page('path', {
  title: 'Путь',
  async render(v) {
    const { leagues } = await api('leagues')
    S.leagues = leagues
    const off = [0, 64, 96, 64, 0, -64, -96, -64]
    let cur = null
    for (const l of leagues) if (l.open && !cur) { const t = l.tasks.find(t => !t.done); if (t) cur = t.id }
    let k = 0
    v.innerHTML = `${!S.u ? `<div class="cont mb"><div class="lic" style="--lc:var(--b)">🔐</div><div style="flex:1"><div class="t">Войди, чтобы шагать дальше</div><div class="sm mu">Без аккаунта открыта первая лига, но кубки и монеты не начисляются</div></div><button class="btn pri" data-act="auth">Войти</button></div>` : ''}
      <div class="path">${leagues.map((l, i) => {
        const got = l.tasks.filter(t => t.done).length, tot = l.tasks.length
        return `<div class="unit ${l.open ? '' : 'lock'}" style="--lc:${esc(l.color)}">
          <div class="ui">${l.open ? esc(l.icon) : '🔒'}</div>
          <div><h2>${esc(l.name)}</h2><div class="us">${l.open ? `${got} из ${tot} пройдено` : `Откроется после кубка лиги «${esc(leagues[i - 1]?.name || '')}»`}</div></div>
          ${l.cup ? `<span class="cupbadge cupb">🏆 Кубок</span>` : l.reward && l.open ? `<span class="cupb">кубок +${l.reward} 🪙</span>` : ''}
        </div>
        ${l.tasks.map(t => {
          const x = off[k++ % off.length]
          const st = !l.open ? 'lock' : t.done ? '' : t.id === cur ? 'cur' : 'todo'
          return `<div class="node-w"><button class="node ${st}" data-t="${t.id}" data-l="${l.id}" style="--lc:${esc(l.color)};transform:translateX(${x}px)" aria-label="${esc(t.title)}">
            ${t.id === cur ? `<span class="bub-start">Начать</span>` : ''}
            ${!l.open ? I.lock.replace('<svg', '<svg style="width:26px;height:26px"') : t.done ? (t.done.stars === 3 ? '👑' : '✔') : t.id === cur ? I.play.replace('<svg', '<svg style="width:30px;height:30px"') : '★'}
            ${t.done ? `<span class="st">${[0, 1, 2].map(j => `<i class="${j < t.done.stars ? 'on' : ''}">★</i>`).join('')}</span>` : ''}
          </button></div>`
        }).join('')}`
      }).join('')}</div>`
    $('.path', v).addEventListener('click', e => {
      const b = e.target.closest('[data-t]')
      if (!b) return
      const l = leagues.find(x => x.id === +b.dataset.l), t = l?.tasks.find(x => x.id === +b.dataset.t)
      if (t) taskSheet(t, l, l.open)
    })
    v.querySelector('.node.cur')?.scrollIntoView({ block: 'center' })
  }
})
App.page('leagues', { title: 'Путь', render: v => App.pages.path.render(v) })

App.page('task', {
  title: 'Задание',
  async render(v, id) {
    const { task: tk, league: lg, done } = await api('tasks/' + (+id || 0))
    setTitle(tk.title)
    v.innerHTML = `
      <div class="th">
        <a class="ib" href="#/path" title="К пути">${I.prev}</a>
        <div class="th-m">
          ${lg ? `<div class="xs mu" style="font-weight:700">${esc(lg.icon)} Лига «${esc(lg.name)}»</div>` : ''}
          <h2>${esc(tk.title)}</h2>
          ${tk.descr ? `<p>${esc(tk.descr)}</p>` : ''}
        </div>
        <div class="th-r">${done ? starsH(done.stars) : ''}
          ${tk.kind === 'type' ? `<span class="tag">от ${tk.min_wpm} сл/мин</span><span class="tag">от ${tk.min_acc}%</span>` : `<span class="tag b">${KIND_L[tk.kind] || esc(tk.kind)}</span>`}
          <span class="tag y">+${tk.coins} 🪙</span></div>
      </div>
      <div data-tr></div>
      <div data-ts></div>`
    const box = $('[data-tr]', v)
    const K = App.kinds[tk.kind]
    taskStats($('[data-ts]', v), tk)
    const nextTask = async () => {
      const { leagues } = await api('leagues')
      const all = leagues.filter(l => l.open).flatMap(l => l.tasks)
      const i = all.findIndex(x => x.id === tk.id)
      const n = all.slice(i + 1).find(x => !x.done) || all.find(x => !x.done) || all[i + 1]
      if (n) location.hash = '#/task/' + n.id
      else { toast('Все открытые задания пройдены', 'ok'); location.hash = '#/path' }
    }
    if (tk.kind !== 'type') {
      if (K) return K.render(box, tk, { next: nextTask, done, solved: () => setTimeout(() => taskStats($('[data-ts]', v), tk), 400) })
      box.innerHTML = '<div class="card empty"><b>🧩</b>Этот тип задания скоро появится</div>'
      return
    }
    const tr = Trainer(box, { task: true, taskId: tk.id, code: tk.code, name: tk.title, onNext: nextTask, onResult: () => taskStats($('[data-ts]', v), tk) })
    const GH = [['', 'Призрак'], ...(S.u ? [['me', 'Мой рекорд']] : []), ['top', 'Лучший игрок']]
    let gi = 0
    $('.tr-tools .sp', box)?.insertAdjacentHTML('beforebegin', `<button class="tool" data-gc title="Второй курсор едет в темпе рекорда">👻 <span>${esc(t('Призрак'))}</span></button>`)
    $('[data-gc]', box)?.addEventListener('click', async e => {
      const b = e.currentTarget, n = (gi + 1) % GH.length, who = GH[n][0]
      try {
        const g = who ? await api('ghost/' + tk.id + '?who=' + who) : null
        gi = n
        $('span', b).textContent = t(GH[n][1])
        b.classList.toggle('on', !!who)
        tr.setGhost(g)
        if (g) toast(t('👻 Призрак: {0}, {1} сл/мин. Начни печатать, и он поедет', g.me ? t('мой рекорд') : g.name, g.wpm), 'ok')
        tr.focus()
      } catch (er) {
        if (who === 'me' && GH[n + 1]) { gi = n; toast(er.message, 'err'); b.click() } else toast(er.message, 'err')
      }
    })
    if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => tr.focus(), 100)
    return () => tr.destroy()
  }
})

App.page('train', {
  title: 'Тренировка',
  render(v) {
    const mine = () => ls.g('mine', [])
    let cur = ls.g('tlast', null) || PRACTICE[0]
    v.innerHTML = `
      <div class="row mb">
        <div style="flex:1;min-width:200px"><div class="disp" style="font-size:20px" data-tt></div><div class="sm mu">Свой код, файл или наш. Можно на время и по частям</div></div>
        <button class="btn sm" data-b="prev" title="Предыдущий кусок" hidden>${I.prev}</button>
        <button class="btn sm" data-b="rnd">${I.dice}<span class="hide-m">Случайный</span></button>
        <label class="btn sm y" title="Открой .py, .txt или любой файл с кодом">📂<span>Открыть файл</span><input type="file" hidden data-file accept=".py,.pyw,.txt,.js,.ts,.json,.html,.css,.md,.sql,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.kt,.swift,.sh,.yml,.yaml,.toml,.ini,text/*"></label>
        <button class="btn sm" data-b="own">${I.plus}<span class="hide-m">Свой код</span></button>
        <button class="btn sm b" data-b="run">${I.play}<span class="hide-m">Запустить</span></button>
      </div>
      <div class="scrollx mb" data-lib></div>
      <div data-tr></div>`
    const all = () => [...PRACTICE.map(p => ({ ...p, b: 1 })), ...mine()]
    const tr = Trainer($('[data-tr]', v), {
      onNext: () => { const a = all(), i = a.findIndex(x => x.name === cur.name); pick(a[(i + 1) % a.length]) },
      onLoad: s => { $('[data-b=prev]', v).hidden = s.n < 2 },
      onPaste: t => { cur = { name: 'из буфера', code: t }; ls.s('tlast', cur); $('[data-tt]', v).textContent = cur.name },
      more: () => PRACTICE[Math.random() * PRACTICE.length | 0].code
    })
    function openFile(f) {
      if (!f) return
      if (f.size > 400e3) return toast('Файл слишком большой, максимум 400 КБ', 'err')
      const r = new FileReader()
      r.onload = () => {
        const txt = String(r.result || '')
        if (!prep(txt).trim()) return toast('В файле нет текста', 'err')
        if (/\u0000/.test(txt)) return toast('Это не текстовый файл', 'err')
        const n = txt.split('\n').length
        if (n > 60 && !tr.cfg.chunk && !tr.cfg.time) { tr.cfg.chunk = 25; ls.s('tcfg', tr.cfg); const c = $('[data-chunk]', v); if (c) c.value = '25'; toast(t('В файле {0} строк, разбил на куски по 25. Листай стрелками или Ctrl+Enter', n), 'ok', 5000) }
        const s = { name: f.name, code: txt }
        if (txt.length < 120e3) ls.s('mine', [...mine().filter(x => x.name !== s.name), s].slice(-30))
        pick(s)
      }
      r.readAsText(f)
    }
    $('[data-file]', v).onchange = e => { openFile(e.target.files[0]); e.target.value = '' }
    const dg = {
      dragover: e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); v.classList.add('drop') } },
      dragleave: e => { if (!v.contains(e.relatedTarget)) v.classList.remove('drop') },
      drop: e => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); v.classList.remove('drop'); openFile(e.dataTransfer.files[0]) }
    }
    for (const k in dg) v.addEventListener(k, dg[k])
    function pick(s) {
      cur = s; ls.s('tlast', { name: s.name, code: s.code })
      $('[data-tt]', v).textContent = s.name
      tr.load(s.code, s.name)
      lib()
      if (!matchMedia('(pointer:coarse)').matches) tr.focus()
    }
    function lib() {
      $('[data-lib]', v).innerHTML = all().map((s, i) => `<button class="chip ${s.name === cur.name ? 'on' : ''}" data-i="${i}">${s.b ? '' : '⭐ '}${esc(s.name)}</button>`).join('')
    }
    $('[data-lib]', v).onclick = e => { const b = e.target.closest('[data-i]'); if (b) pick(all()[+b.dataset.i]) }
    $('[data-lib]', v).oncontextmenu = async e => {
      const b = e.target.closest('[data-i]'), s = b && all()[+b.dataset.i]
      if (!s || s.b) return
      e.preventDefault()
      if (await ask(`Удалить «${s.name}» из своих?`, 'Удалить', 'red')) { ls.s('mine', mine().filter(x => x.name !== s.name)); lib() }
    }
    $('[data-b=prev]', v).onclick = () => tr.prev()
    $('[data-b=rnd]', v).onclick = () => { const a = all().filter(x => x.name !== cur.name); pick(a[Math.random() * a.length | 0]) }
    $('[data-b=run]', v).onclick = () => tr.run()
    $('[data-b=own]', v).onclick = () => {
      const m = modal(`<h2>Свой код</h2><p class="mu sm mb">Вставь любой Python или открой файл .py. Сохранённое появится в списке со звёздочкой, удалить можно правым кликом</p>
        <div class="col"><input class="in" data-n placeholder="Название" maxlength="40">
        <textarea class="in code" data-c rows="10" spellcheck="false" placeholder="def hello(name):&#10;    print(f&quot;hi, {name}&quot;)"></textarea>
        <div class="row"><label class="btn sm">Открыть файл<input type="file" accept=".py,.txt" hidden data-f></label><span class="sp"></span>
        <button class="btn" data-go>Печатать</button><button class="btn pri" data-sv>Сохранить</button></div></div>`, { wide: true })
      const c = $('[data-c]', m.el), n = $('[data-n]', m.el)
      c.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); c.setRangeText('    ', c.selectionStart, c.selectionEnd, 'end') } })
      $('[data-f]', m.el).onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { c.value = r.result; if (!n.value) n.value = f.name }; r.readAsText(f) }
      const go = sv => {
        if (!prep(c.value).trim()) return toast('Сначала вставь код', 'err')
        const s = { name: n.value.trim() || 'Мой код ' + new Date().toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' }), code: c.value }
        if (sv) ls.s('mine', [...mine().filter(x => x.name !== s.name), s].slice(-50))
        m.close(); pick(s)
      }
      $('[data-go]', m.el).onclick = () => go(false)
      $('[data-sv]', m.el).onclick = () => go(true)
    }
    pick(cur)
    return () => { tr.destroy(); for (const k in dg) v.removeEventListener(k, dg[k]); v.classList.remove('drop') }
  }
})

App.page('top', {
  title: 'Рейтинг',
  async render(v) {
    let by = 'xp'
    v.innerHTML = `<div class="scrollx mb"><div class="tabs" data-tabs style="flex-wrap:nowrap">
      <button data-by="xp">Опыт</button><button data-by="wpm">Скорость</button><button data-by="week">Неделя</button><button data-by="duel">Дуэли</button><button data-by="cups">Кубки</button>${S.u ? '<button data-by="friends">Друзья</button>' : ''}</div></div>
      <div data-b></div>
      <div class="sec">Найти игрока</div>
      <input class="in" data-q placeholder="Ник, от двух букв" autocapitalize="off">
      <div class="card mt" style="padding:6px" data-r hidden><div class="lb" data-rl></div></div>`
    const sc = r => by === 'wpm' ? [r.best_wpm, 'сл/мин'] : by === 'cups' ? [r.cups, '🏆'] : by === 'week' ? [r.score, 'XP'] : by === 'duel' ? [r.score, 'побед'] : [r.xp, 'XP']
    async function load() {
      $$('[data-by]', v).forEach(b => b.classList.toggle('on', b.dataset.by === by))
      const b = $('[data-b]', v)
      b.innerHTML = '<div class="empty">Загружаю...</div>'
      const { rows } = await api('top?by=' + by)
      if (!rows.length) { b.innerHTML = `<div class="card empty"><b>🏁</b>${by === 'friends' ? 'Ты пока ни на кого не подписан. Найди игрока ниже' : 'Пока никого. Займи первое место'}</div>`; return }
      const p = [rows[1], rows[0], rows[2]]
      b.innerHTML = `<div class="podium" style="margin-top:14px">${p.map((r, k) => r ? `<a class="pod p${[2, 1, 3][k]}" href="#/u/${encodeURIComponent(r.name)}">
          <span class="pl">${[2, 1, 3][k]}</span>${avatar(r, k === 1 ? 70 : 54)}${nick(r)}
          <div class="sc">${sc(r)[0]} <span class="xs mu">${sc(r)[1]}</span></div></a>` : '<div></div>').join('')}</div>
        ${rows.length > 3 ? `<div class="card" style="padding:6px"><div class="lb">${rows.slice(3).map((r, i) => `
          <a href="#/u/${encodeURIComponent(r.name)}" class="${r.id === S.u?.id ? 'me' : ''}"><span class="n">${i + 4}</span>${avatar(r, 40)}
          <div class="w"><div class="row" style="gap:6px;flex-wrap:nowrap">${nick(r)}${r.lg ? `<span>${r.lg}</span>` : ''}</div>
          <div class="sub">Уровень ${lvl(r.xp)}, ${r.best_wpm} сл/мин</div></div>
          <span class="sc">${sc(r)[0]} <span class="xs mu">${sc(r)[1]}</span></span></a>`).join('')}</div></div>` : ''}`
    }
    $('[data-tabs]', v).onclick = e => { const b = e.target.closest('[data-by]'); if (b) { by = b.dataset.by; load() } }
    let tm
    $('[data-q]', v).oninput = e => {
      clearTimeout(tm)
      tm = setTimeout(async () => {
        const q = e.target.value.trim()
        const box = $('[data-r]', v)
        if (q.length < 2) { box.hidden = true; return }
        const { rows } = await api('users?q=' + encodeURIComponent(q))
        box.hidden = false
        $('[data-rl]', v).innerHTML = rows.map(r => `<a href="#/u/${encodeURIComponent(r.name)}">${avatar(r, 38)}<div class="w">${nick(r)}<div class="sub">Уровень ${lvl(r.xp)}, ${r.best_wpm} сл/мин</div></div><span class="sc">${I.chev.replace('<svg', '<svg style="width:18px;height:18px"')}</span></a>`).join('') || '<div class="empty" style="padding:16px">Никого не нашлось</div>'
      }, 300)
    }
    await load()
  }
})

const KINDS = { avatar: 'Аватары', frame: 'Рамки', title: 'Титулы', theme: 'Темы редактора', color: 'Цвет ника' }
const SLOTV = { avatar: 'avatar', frame: 'frame', title: 'title', theme: 'theme', color: 'ncolor' }

App.page('shop', {
  title: 'Магазин',
  async render(v) {
    let k = 'avatar'
    const d = await api('shop')
    v.innerHTML = `${S.u ? `<div class="cont mb" style="--lc:var(--y)"><div class="lic">🪙</div><div style="flex:1"><div class="t" data-c>${S.u.coins} монет</div><div class="sm mu">Монеты дают за задания, звёзды, кубки, дуэли и задания дня</div></div></div>` : ''}
      <div class="scrollx mb"><div class="tabs" data-k style="flex-wrap:nowrap">${Object.entries(KINDS).map(([a, b]) => `<button data-kk="${a}">${b}</button>`).join('')}</div></div>
      ${S.cfg.shop === false ? '<div class="card mb">🔒 Магазин временно закрыт</div>' : ''}
      <div class="shop" data-g></div>`
    const pv = it => {
      if (it.kind === 'avatar') return `<span class="av" style="--s:64px">${esc(it.value)}</span>`
      if (it.kind === 'frame') return `<span class="av fr-${esc(it.value)}" style="--s:58px">${esc(S.u?.avatar || '🐍')}</span>`
      if (it.kind === 'title') return `<span class="ttl" style="font-size:14px;padding:6px 12px">${esc(it.value)}</span>`
      if (it.kind === 'theme') return `<div class="ed th-${esc(it.value)} themepv" style="box-shadow:none"><span class="t-k">def</span> <span class="t-fn">go</span>():<br>&nbsp;&nbsp;<span class="t-k">return</span> <span class="t-s">"ok"</span><span style="display:inline-block;width:2px;height:12px;background:var(--cur);vertical-align:-2px"></span></div>`
      if (it.kind === 'color') return `<span class="disp" style="font-size:20px">${nick({ name: S.u?.name || 'Ник', ncolor: it.value })}</span>`
      return ''
    }
    function draw() {
      $$('[data-kk]', v).forEach(b => b.classList.toggle('on', b.dataset.kk === k))
      const eq = S.u?.[SLOTV[k]] ?? ''
      const items = d.items.filter(i => i.kind === k)
      $('[data-g]', v).innerHTML = (k !== 'avatar' ? `<div class="item ${!eq ? 'eq' : ''}"><div class="pv"><span class="mu sm">Ничего</span></div><div class="nm">Без украшения</div><div class="pr mu">бесплатно</div>
        ${S.u ? (!eq ? '<button class="btn sm" disabled>Надето</button>' : '<button class="btn sm" data-eq="0">Снять</button>') : ''}</div>` : '') +
        items.map(it => {
          const own = it.price === 0 || d.own.includes(it.id), on = eq === it.value
          return `<div class="item ${on ? 'eq' : ''}"><div class="pv">${pv(it)}</div><div class="nm">${esc(it.name)}</div>
            <div class="pr">${it.price ? it.price + ' 🪙' : 'бесплатно'}</div>
            ${!S.u ? '<button class="btn sm" data-act="auth">Войти</button>'
              : on ? '<button class="btn sm g" disabled>Надето</button>'
              : own ? `<button class="btn sm" data-eq="${it.id}">Надеть</button>`
              : `<button class="btn sm pri" data-buy="${it.id}" ${S.u.coins < it.price ? 'disabled title="Не хватает монет"' : ''}>Купить</button>`}</div>`
        }).join('')
    }
    $('[data-k]', v).onclick = e => { const b = e.target.closest('[data-kk]'); if (b) { k = b.dataset.kk; draw() } }
    $('[data-g]', v).onclick = async e => {
      const b = e.target.closest('[data-buy],[data-eq]')
      if (!b) return
      b.disabled = true
      try {
        if (b.dataset.buy) {
          const it = d.items.find(i => i.id === +b.dataset.buy)
          if (!(await ask(`Купить «${it.name}» за ${it.price} 🪙?`, 'Купить'))) { b.disabled = false; return }
          const r = await api('shop/buy', { id: it.id })
          S.u.coins = r.coins
          d.own.push(it.id)
          const q = await api('shop/equip', { kind: k, id: it.id })
          setUser(q.u)
          toast('Куплено и надето: ' + it.name, 'ok')
          confetti(60)
        } else {
          const q = await api('shop/equip', { kind: k, id: +b.dataset.eq })
          setUser(q.u)
        }
        App.emit('user')
        const c = $('[data-c]', v); if (c) c.textContent = S.u.coins + ' монет'
        draw()
      } catch (er) { toast(er.message, 'err'); b.disabled = false }
    }
    draw()
  }
})

App.page('chat', {
  title: 'Общий чат',
  render(v) {
    const can = () => S.chatCan !== false
    v.innerHTML = `<div class="chat">
      <div class="chat-h"><span class="dot"></span><b data-on>${S.online}</b><span class="mu sm">в сети</span><span class="sp" style="flex:1"></span><span class="mu xs" data-rules style="text-align:right"></span></div>
      <div class="msgs" data-m></div>
      <div data-f></div></div>`
    const box = $('[data-m]', v)
    const isMod = () => ['admin', 'mod'].includes(S.u?.role)
    const rules = () => {
      const c = S.cfg.chat || {}
      $('[data-rules]', v).textContent = [c.on === false ? 'чат выключен' : '', c.slow ? `не чаще раза в ${c.slow} с` : '', S.cfg.ai?.on && S.cfg.ai?.chat ? 'начни с /ai, чтобы спросить ИИ' : ''].filter(Boolean).map(x => t(x)).join(', ')
    }
    const foot = () => {
      const f = $('[data-f]', v)
      if (!S.u) { f.innerHTML = `<div class="chat-f" style="justify-content:center;align-items:center"><span class="mu sm">Войди, чтобы писать</span><button class="btn sm pri" data-act="auth">Войти</button></div>`; return }
      f.innerHTML = `<form class="chat-f"><textarea class="in" maxlength="${S.cfg.chat?.len || 300}" placeholder="Сообщение" data-t rows="1"></textarea><button class="btn b" title="Отправить">${I.send}</button></form>`
      const fm = $('form', f), ta = $('[data-t]', f)
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); fm.requestSubmit() } })
      ta.addEventListener('input', () => { ta.style.height = '48px'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px' })
      fm.onsubmit = e => {
        e.preventDefault()
        const tx = ta.value.trim()
        if (!tx) return
        const b = $('button', fm)
        if (b.disabled) return
        b.disabled = true
        S.sock.emit('msg', tx, r => {
          if (r?.e) { toast(t(r.e), 'err'); b.disabled = false; return }
          ta.value = ''; ta.style.height = '48px'
          cool(b, r?.wait || 0)
        })
      }
      function cool(b, s) {
        if (!s) { b.disabled = false; return }
        const ic = b.innerHTML
        let n = s
        b.classList.add('cool'); b.innerHTML = `<b>${n}</b>`
        const iv = setInterval(() => {
          if (!b.isConnected) return clearInterval(iv)
          if (--n <= 0) { clearInterval(iv); b.disabled = false; b.classList.remove('cool'); b.innerHTML = ic }
          else b.innerHTML = `<b>${n}</b>`
        }, 1000)
      }
    }
    const txt = (t, me) => esc(t).replace(/@([A-Za-z0-9_а-яА-ЯёЁ]{3,20})/g, (m, n) => `<span class="mention">@${n}</span>`)
    const el = (m, p) => {
      if (m.sys) return `<div class="sys">${esc(m.sys)}</div>`
      const mine = m.u.id && m.u.id === S.u?.id
      const cont = p && !p.sys && p.u?.id === m.u.id && m.u.id && new Date(m.at) - new Date(p.at) < 180000
      return `<div class="msg ${cont ? 'cont' : 'first'} ${m.bot ? 'bot' : ''} ${mine ? 'mine' : ''}" data-id="${m.id}">
        ${mine ? '' : m.u.id ? `<a href="#/u/${encodeURIComponent(m.u.name)}">${avatar(m.u, 34)}</a>` : avatar(m.u, 34)}
        <div class="b"><div class="h">${nick(m.u)}${roleTag(m.u.role)}${m.u.title && m.u.role !== 'bot' ? `<span class="ttl">${esc(m.u.title)}</span>` : ''}</div>
        <div class="t">${m.bot ? md(m.text) : txt(m.text, S.u?.name)}<time>${new Date(m.at).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })}</time></div></div>
        <div class="act">${!mine && m.u.id && S.u ? `<button class="ib" style="width:32px;height:32px" data-rp="${esc(m.u.name)}" title="Ответить">${I.reply}</button>` : ''}${isMod() ? `<button class="ib" style="width:32px;height:32px" data-del="${m.id}" title="Удалить">${I.trash}</button>${m.u.id && m.u.role === 'user' ? `<button class="ib" style="width:32px;height:32px" data-mute="${m.u.id}" data-n="${esc(m.u.name)}" title="Мут">${I.mute}</button>` : ''}` : ''}</div>
      </div>`
    }
    const all = () => {
      if (!can()) { box.innerHTML = '<div class="empty"><b>🔐</b>Чат видят только вошедшие пользователи</div>'; return }
      box.innerHTML = S.chat.map((m, i) => el(m, S.chat[i - 1])).join('') || '<div class="empty"><b>👋</b>Тут пока пусто. Напиши первым</div>'
      box.scrollTop = box.scrollHeight
    }
    box.onclick = async e => {
      const d = e.target.closest('[data-del]'), mu = e.target.closest('[data-mute]'), rp = e.target.closest('[data-rp]')
      if (rp) { const ta = $('[data-t]', v); if (ta) { ta.value = '@' + rp.dataset.rp + ' ' + ta.value; ta.focus() } }
      if (d) S.sock.emit('del', +d.dataset.del, r => r?.e && toast(r.e, 'err'))
      if (mu) {
        const m = modal(`<h2>Мут для ${esc(mu.dataset.n)}</h2><p class="mu mb">На сколько закрыть доступ к чату?</p><div class="row">${[[10, '10 минут'], [60, '1 час'], [1440, '1 день'], [10080, 'неделя']].map(([a, b]) => `<button class="btn" data-mm="${a}">${b}</button>`).join('')}</div>`)
        m.el.onclick = ev => { const b = ev.target.closest('[data-mm]'); if (b) { S.sock.emit('mute', { uid: +mu.dataset.mute, min: +b.dataset.mm }, r => r?.e ? toast(r.e, 'err') : toast('Готово', 'ok')); m.close() } }
      }
    }
    rules(); foot(); all()
    const off = App.on('chat', d => {
      $('[data-on]', v).textContent = S.online
      if (d.t === 'hist' || d.t === 'hello' || d.t === 'del') return all()
      if (d.t === 'msg') {
        box.querySelector('.empty')?.remove()
        const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160
        box.insertAdjacentHTML('beforeend', el(d.m, S.chat[S.chat.length - 2]))
        if (near || d.m.u?.id === S.u?.id) box.scrollTop = box.scrollHeight
      }
    })
    const off2 = App.on('cfg', () => { rules(); foot() })
    const off3 = App.on('user', () => foot())
    return () => { off(); off2(); off3() }
  }
})

App.page('ai', {
  title: 'ИИ-наставник',
  render(v) {
    if (!S.u) return needAuth(v, 'ИИ-наставника')
    if (!S.cfg.ai?.on) { v.innerHTML = '<div class="card empty"><b>🤖</b>ИИ сейчас выключен</div>'; return }
    let log = ls.g('ai_' + S.u.id, [])
    v.innerHTML = `<div class="ai">
      <div class="chat-h"><span style="font-size:22px">✨</span><b>Наставник по Python</b><span class="sp" style="flex:1"></span><span class="mu xs" data-left></span><button class="btn sm ghost" data-clr>Очистить</button></div>
      <div class="ai-log" data-l></div>
      <div style="padding:10px 12px 0;background:var(--card)" class="scrollx" data-chips>
        ${['Объясни декораторы на простом примере', 'Как печатать код быстрее?', 'Дай задачку на циклы', 'Чем list отличается от tuple?', 'Мои слабые символы'].map(x => `<button class="chip" data-q="${esc(t(x))}">${esc(t(x))}</button>`).join('')}
      </div>
      <form class="chat-f"><textarea class="in" data-t placeholder="Спроси про Python или вставь код с ошибкой" maxlength="4000" rows="1"></textarea><button class="btn v">${I.send}</button></form>
    </div>`
    const L = $('[data-l]', v), ta = $('[data-t]', v), fm = $('form', v)
    const left = () => { $('[data-left]', v).textContent = `осталось ${S.ai_left}` }
    const draw = () => {
      L.innerHTML = log.length ? log.map(m => `<div class="bub ${m.role === 'user' ? 'u' : 'a'}">${m.role === 'user' ? esc(m.content) : md(m.content)}</div>`).join('')
        : `<div class="empty"><b>🤖</b>Помогу разобраться с кодом, объясню ошибку и подскажу, как печатать быстрее. Выбери вопрос ниже или напиши свой</div>`
      L.scrollTop = L.scrollHeight
    }
    let busy = false
    const lock = on => {
      busy = on
      ta.disabled = on; $('button', fm).disabled = on
      $$('[data-q]', v).forEach(b => b.disabled = on)
      ta.placeholder = t(on ? 'ИИ печатает ответ…' : 'Спроси про Python или вставь код с ошибкой')
      if (!on && !matchMedia('(pointer:coarse)').matches) ta.focus()
    }
    async function send(q, mode) {
      if (busy) return
      lock(true)
      if (mode !== 'tips') log.push({ role: 'user', content: q })
      draw()
      L.insertAdjacentHTML('beforeend', '<div class="bub a"><span class="typing"><span></span><span></span><span></span></span></div>')
      L.scrollTop = L.scrollHeight
      try {
        let r
        if (mode === 'tips') {
          const p = await api('u/' + encodeURIComponent(S.u.name))
          const ch = Object.entries(p.u.emap || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => sym(x[0])).join(' ')
          if (!ch) { log.push({ role: 'assistant', content: t('Пока не вижу твоих ошибок. Пройди пару заданий, и я разберу слабые места.') }); draw(); lock(false); return }
          log.push({ role: 'user', content: t('Мои слабые символы') + ': ' + ch })
          r = await api('ai', { mode: 'tips', chars: ch, wpm: S.u.best_wpm, lang: LANG })
        } else r = await api('ai', { mode: 'chat', msgs: log.slice(-12), lang: LANG })
        log.push({ role: 'assistant', content: r.text })
        S.ai_left = r.left
      } catch (e) {
        log.push({ role: 'assistant', content: '⚠️ ' + e.message })
      }
      log = log.slice(-40)
      ls.s('ai_' + S.u.id, log)
      draw(); left()
      lock(false)
    }
    fm.onsubmit = e => { e.preventDefault(); const q = ta.value.trim(); if (!q || busy) return; ta.value = ''; send(q) }
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); fm.requestSubmit() } })
    $('[data-chips]', v).onclick = e => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q, b.dataset.q === t('Мои слабые символы') ? 'tips' : '') }
    $('[data-clr]', v).onclick = () => { log = []; ls.s('ai_' + S.u.id, log); draw() }
    draw(); left()
  }
})

async function profile(v, name) {
  const [p, lg] = await Promise.all([api('u/' + encodeURIComponent(name)), api('leagues').catch(() => ({ leagues: [] }))])
  const u = p.u, own = p.own, L = lvl(u.xp), pr = (u.xp - lvlXp(L)) / (lvlXp(L + 1) - lvlXp(L)) * 100
  const got = new Set(p.cups.map(c => c.id))
  const isA = ['admin', 'mod'].includes(S.u?.role)
  setTitle(own ? 'Профиль' : u.name)
  const hrs = p.st.ms / 3600000
  const ach = p.ach || [], have = ach.filter(a => a.at).length
  v.innerHTML = `
    <div class="phead"><div class="cover" style="${u.ncolor && u.ncolor !== 'grad' ? `background:${esc(u.ncolor)}` : ''}"></div>
      <div class="in2">
        <div class="row" style="align-items:flex-end;gap:14px">${avatar(u, 104)}<span class="sp"></span>
          ${own ? `<button class="btn sm" data-ed>${I.edit}Изменить</button>` : S.u ? `<button class="btn sm ${p.isf ? '' : 'b'}" data-fo>${p.isf ? 'Вы подписаны' : 'Подписаться'}</button><button class="btn sm r" data-du>⚔️ Дуэль</button>` : ''}
        </div>
        <div class="row mt" style="gap:8px"><h2>${nick(u)}</h2>${roleTag(u.role)}${u.title ? `<span class="ttl">${esc(u.title)}</span>` : ''}</div>
        <div class="sm mu" style="margin:2px 0 10px">${u.rank} место в рейтинге, с нами с ${new Date(u.created_at).toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' })}${own ? '' : ', был ' + ago(u.seen_at)}</div>
        ${u.bio ? `<p style="margin-bottom:10px">${esc(u.bio)}</p>` : ''}
        <div class="row sm" style="gap:16px;margin-bottom:12px"><span><b data-fans>${p.fl.fans}</b> <span class="mu">${plw(p.fl.fans, 'подписчик', 'подписчика', 'подписчиков')}</span></span><span><b>${p.fl.subs}</b> <span class="mu">${plw(p.fl.subs, 'подписка', 'подписки', 'подписок')}</span></span><span>🔥 <b>${u.streak}</b> <span class="mu">${plw(u.streak, 'день', 'дня', 'дней')} подряд</span></span></div>
        <div class="row" style="max-width:460px;flex-wrap:nowrap"><span class="xs" style="font-weight:800;white-space:nowrap">Уровень ${L}</span><div class="bar" style="flex:1"><i style="width:${pr}%"></i></div><span class="xs mu">${u.xp} XP</span></div>
      </div>
    </div>
    <div class="grid g4 mt">
      <div class="card stat y"><b>${u.best_wpm}</b><span>лучшая скорость</span>${p.fast != null ? `<em class="pct">${esc(t('быстрее {0}% игроков', p.fast))}</em>` : ''}</div>
      <div class="card stat g"><b>${p.st.done}</b><span>заданий, ${p.st.stars} ★</span></div>
      <div class="card stat o"><b>${u.duel_w}<span class="mu" style="font-size:18px"> / ${u.duel_l}</span></b><span>дуэли: победы и поражения</span></div>
      <div class="card stat bl"><b>${hrs >= 1 ? hrs.toFixed(1) + ' ч' : Math.round(hrs * 60) + ' мин'}</b><span>за клавиатурой</span></div>
    </div>
    <div class="sec">Достижения<span class="sp"></span><span class="sm mu" style="font-weight:600">${have} из ${ach.length}</span></div>
    <div class="achs">${ach.map(a => `<div class="achv ${a.at ? '' : 'off'}" title="${esc(a.d)}"><b>${esc(a.i)}</b><strong>${esc(a.t)}</strong><span>${esc(a.d)}</span></div>`).join('')}</div>
    <div class="sec">Кубки лиг</div>
    <div class="cups">${lg.leagues.filter(l => l.id).map(l => `<div class="cup ${got.has(l.id) ? '' : 'off'}" style="--lc:${esc(l.color)}"><b>${esc(l.icon)}</b><span>${esc(l.name)}</span></div>`).join('')}</div>
    <div class="grid g2 mt">
      <div class="card"><h3>Скорость и точность<span class="sp"></span><span class="xs mu" style="font-weight:600"><span style="color:var(--y)">●</span> сл/мин <span style="color:var(--b)">●</span> точность</span></h3><canvas class="chart" data-cv></canvas></div>
      ${own ? `<div class="card"><h3>Слабые символы<span class="sp"></span>${S.cfg.ai?.on ? '<a class="btn sm v" href="#/ai">Совет от ИИ</a>' : ''}</h3><div class="weak" data-wk></div></div>`
        : `<div class="card"><h3>Всего напечатано</h3><div class="disp" style="font-size:38px">${p.st.chars.toLocaleString(LOC)}</div><div class="mu">символов кода за ${pl(p.st.runs, 'заход', 'захода', 'заходов')}</div></div>`}
    </div>
    <div data-stats></div>
    <div class="sec">Последние заходы</div>
    <div class="card" style="padding:6px 16px">${p.recent.slice(0, 12).map(r => `<div class="ev" style="align-items:center"><div style="flex:1;min-width:0"><b>${esc(r.title || 'Тренировка')}</b><div class="meta">${ago(r.created_at)}, точность ${r.acc}%, ${fmt(r.ms)}</div></div>
      <div style="text-align:right"><b class="disp" style="font-size:20px">${r.wpm}</b><div class="xs mu">сл/мин</div></div>${r.title ? (r.passed ? '<span class="tag ok">✓</span>' : '<span class="tag no">✗</span>') : ''}</div>`).join('') || '<div class="empty">Пока ничего</div>'}</div>
    ${own ? `<div class="sec">Ещё</div><div class="card menu" style="padding:4px 16px">
      <a href="#/duel" class="hide-d"><b>⚔️</b>Дуэли<span class="sp"></span>${I.chev}</a>
      <a href="#/top" class="hide-d"><b>🏆</b>Рейтинг и поиск друзей<span class="sp"></span>${I.chev}</a>
      <a href="#/shop" class="hide-d"><b>🛍</b>Магазин<span class="sp"></span>${I.chev}</a>
      <a href="#/train" class="hide-d"><b>⌨️</b>Тренировка<span class="sp"></span>${I.chev}</a>
      <a href="#/ai" class="hide-d"><b>✨</b>ИИ-наставник<span class="sp"></span>${I.chev}</a>
      <a href="#/notes"><b>🔔</b>Уведомления${S.notes ? ` <span class="tag no">${S.notes}</span>` : ''}<span class="sp"></span>${I.chev}</a>
      <a href="#" data-act="push"><b>📲</b><span data-pl>Push-уведомления</span><span class="sp"></span><span class="tag" data-ps>…</span></a>
      <a href="#" data-act="lang"><b>🌐</b>Язык<span class="sp"></span><span class="tag" data-notr>${LANGS[LANG]}</span></a>
      <a href="#" data-act="theme"><b>${document.body.classList.contains('light') ? '🌙' : '☀️'}</b>${document.body.classList.contains('light') ? 'Тёмная тема' : 'Светлая тема'}<span class="sp"></span>${I.chev}</a>
      ${isA ? `<a href="#/admin" class="hide-d"><b>🛡</b>Админка<span class="sp"></span>${I.chev}</a>` : ''}
      <a href="#" data-act="logout" style="color:var(--r)"><b>🚪</b>Выйти<span class="sp"></span></a>
    </div>` : ''}`
  const offSt = statsBox($('[data-stats]', v), u, own)
  const d = p.recent.slice().reverse().map(r => ({ w: r.wpm, a: r.acc }))
  const cv = $('[data-cv]', v)
  drawChart(cv, d)
  $('[data-fo]', v)?.addEventListener('click', async e => {
    const b = e.currentTarget
    try {
      const r = await api('follow/' + u.id, {})
      b.textContent = r.on ? 'Вы подписаны' : 'Подписаться'
      b.classList.toggle('b', !r.on)
      $('[data-fans]', v).textContent = r.fans
      if (r.on) toast('Теперь ты видишь успехи ' + u.name + ' в ленте друзей', 'ok')
    } catch (er) { toast(er.message, 'err') }
  })
  $('[data-du]', v)?.addEventListener('click', () => {
    S.sock?.emit('duel:invite', { uid: u.id }, r => {
      if (r?.e) return toast(r.e, 'err')
      S.duelWait = { id: r.id, who: u }
      location.hash = '#/duel'
    })
  })
  if (own) {
    const g = Object.entries(u.emap || {}).sort((a, b) => b[1] - a[1]).slice(0, 20), mx = g[0]?.[1] || 1
    $('[data-wk]', v).innerHTML = g.length ? g.map(([k, n]) => `<div class="wc" style="--p:${(n / mx).toFixed(2)}"><b>${esc(sym(k))}</b><span>${n}</span></div>`).join('') : '<div class="mu sm">Ошибок пока нет</div>'
    $('[data-ed]', v).onclick = () => {
      const m = modal(`<h2>Профиль</h2><div class="col mt">
        <label class="f">Ник<input class="in" data-nm maxlength="20" value="${esc(u.name)}" autocapitalize="off"></label>
        <label class="f">О себе<textarea class="in" data-bio maxlength="160">${esc(u.bio)}</textarea></label>
        <button class="btn pri" data-sb>Сохранить</button>
        <div style="height:2px;background:var(--line);margin:10px 0"></div>
        <b>Сменить пароль</b>
        <input class="in" type="password" data-o placeholder="Старый пароль (пусто, если входил через Google или GitHub)" autocomplete="current-password">
        <input class="in" type="password" data-n placeholder="Новый пароль" autocomplete="new-password">
        <button class="btn" data-sp>Сменить пароль</button>
        <a class="btn" href="#/shop">Сменить аватар, рамку или титул</a><div class="col" data-lk></div></div>`)
      $('[data-sb]', m.el).onclick = async () => {
        try {
          const r = await api('me', { bio: $('[data-bio]', m.el).value, name: $('[data-nm]', m.el).value.trim() }, 'PATCH')
          S.u.name = r.name; m.close(); toast('Сохранено', 'ok'); shell(); route()
        } catch (e) { toast(e.message, 'err') }
      }
      api('me/links').then(r => {
        const box = $('[data-lk]', m.el)
        if (!box || (!r.on.google && !r.on.github)) return
        box.innerHTML = `<div style="height:2px;background:var(--line);margin:10px 0"></div><b>Вход через сервисы</b>
          ${['google', 'github'].filter(k => r.on[k]).map(k => r.have.includes(k) ? `<div class="tag ok" style="align-self:flex-start">✓ ${k === 'google' ? 'Google' : 'GitHub'} ${esc(t('привязан'))}</div>` : `<a class="btn wide ${k === 'google' ? 'oa-g' : 'oa-h'}" href="/auth/${k}">${k === 'google' ? GLOGO : GHLOGO}<span>${esc(t('Привязать {0}', k === 'google' ? 'Google' : 'GitHub'))}</span></a>`).join('')}`
      }).catch(() => {})
      $('[data-sp]', m.el).onclick = async () => { try { await api('me/pass', { old: $('[data-o]', m.el).value, pass: $('[data-n]', m.el).value }); m.close(); toast('Пароль изменён', 'ok') } catch (e) { toast(e.message, 'err') } }
      m.el.addEventListener('click', e => { if (e.target.closest('a')) m.close() })
    }
  }
  const rs = () => drawChart(cv, d)
  addEventListener('resize', rs)
  const ot = App.on('theme', () => { rs(); if (own) route() })
  return () => { removeEventListener('resize', rs); ot(); offSt?.() }
}

App.page('me', { title: 'Профиль', render: v => S.u ? profile(v, S.u.name) : needAuth(v, 'профиль') })
App.page('u', { title: 'Профиль', render: (v, n) => profile(v, n) })

App.page('notes', {
  title: 'Уведомления',
  async render(v) {
    if (!S.u) return needAuth(v, 'уведомления')
    const { rows } = await api('notes')
    const ic = { follow: '👤', react: '💬', ach: '🏅', duel: '⚔️', tourn: '🏁' }
    const tx = n => {
      const d = n.data || {}
      if (n.kind === 'follow') return `<a href="#/u/${encodeURIComponent(d.name)}"><b>${esc(d.name)}</b></a> подписался на тебя`
      if (n.kind === 'react') return `<b>${esc(d.name)}</b> поставил ${esc(d.e)} на твою запись в ленте`
      if (n.kind === 'ach') return `Новое достижение <b>${esc(d.t)}</b> <span class="nw">+${d.r} 🪙</span>`
      if (n.kind === 'duel') return `<b>${esc(d.name)}</b> вызвал тебя на дуэль`
      if (n.kind === 'tourn') return esc(t('Турнир недели «{0}» закончился: {1} место из {2}, +{3} 🪙', d.t, d.p, d.n, d.c))
      return esc(n.kind)
    }
    v.innerHTML = `<div class="row mb"><span class="sp"></span><button class="btn sm" data-act="push">📲 <span data-ps>Push-уведомления</span></button></div><div class="card" style="padding:8px">${rows.map(n => `<div class="note ${n.read ? '' : 'new'}"><span class="ni">${n.kind === 'ach' && n.data?.i ? esc(n.data.i) : n.kind === 'react' && n.data?.e ? esc(n.data.e) : ic[n.kind] || '🔔'}</span><div class="b">${tx(n)}<div class="xs mu">${ago(n.created_at)}</div></div>
      ${n.kind === 'duel' && Date.now() - new Date(n.created_at) < 300000 ? `<a class="btn sm r" href="#/duel/${esc(n.data.room)}">Принять</a>` : ''}</div>`).join('') || '<div class="empty"><b>🔔</b>Пока ничего нового</div>'}</div>`
    if (S.notes) { api('notes/read', {}).catch(() => {}); S.notes = 0; shell() }
  }
})
