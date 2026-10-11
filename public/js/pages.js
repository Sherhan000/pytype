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

function drawChart(cv, d, keys) {
  const W = cv.getBoundingClientRect().width, H = 220, dp = devicePixelRatio || 1
  if (!W) return
  cv.width = W * dp; cv.height = H * dp
  const x = cv.getContext('2d'); x.scale(dp, dp)
  const cs = getComputedStyle(document.body), c = v => cs.getPropertyValue(v).trim()
  x.font = '11px "JetBrains Mono", monospace'; x.fillStyle = c('--mu')
  if (d.length < 2) { x.fillText('Пройди хотя бы пару заходов, и тут появится график', 8, H / 2); return }
  const pL = 34, pR = 38, pT = 10, pB = 12, mx = Math.max(20, ...d.map(v => v.w)) * 1.15
  const X = i => pL + i * (W - pL - pR) / (d.length - 1), Y = (v, m) => pT + (1 - v / m) * (H - pT - pB)
  x.strokeStyle = c('--ln'); x.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const yy = pT + i * (H - pT - pB) / 4
    x.beginPath(); x.moveTo(pL, yy); x.lineTo(W - pR, yy); x.stroke()
    x.fillText(Math.round(mx * (1 - i / 4)), 2, yy + 4); x.fillText((100 - i * 25) + '%', W - pR + 6, yy + 4)
  }
  const line = (k, m, col, fill) => {
    x.beginPath()
    d.forEach((v, i) => i ? x.lineTo(X(i), Y(v[k], m)) : x.moveTo(X(i), Y(v[k], m)))
    if (fill) {
      const g = x.createLinearGradient(0, pT, 0, H)
      g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00')
      x.save(); x.lineTo(X(d.length - 1), H - pB); x.lineTo(X(0), H - pB); x.closePath(); x.fillStyle = g; x.fill(); x.restore()
      x.beginPath(); d.forEach((v, i) => i ? x.lineTo(X(i), Y(v[k], m)) : x.moveTo(X(i), Y(v[k], m)))
    }
    x.strokeStyle = col; x.lineWidth = 2.5; x.lineJoin = 'round'; x.stroke()
  }
  line('a', 100, '#4b8bff')
  line('w', mx, '#ffb43b', true)
}

App.page('', {
  title: 'Главная',
  async render(v) {
    const u = S.u
    const [lg, top] = await Promise.all([api('leagues').catch(() => ({ leagues: [] })), api('top?by=xp').catch(() => ({ rows: [] }))])
    S.leagues = lg.leagues
    const open = lg.leagues.filter(l => l.open).flatMap(l => l.tasks.map(t => ({ ...t, lg: l })))
    const nextT = open.find(t => !t.done)
    const day = open.length ? open[Math.floor(Date.now() / 864e5) % open.length] : null
    const cups = lg.leagues.filter(l => l.cup).length
    const L = u ? lvl(u.xp) : 1, p = u ? (u.xp - lvlXp(L)) / (lvlXp(L + 1) - lvlXp(L)) * 100 : 0
    v.innerHTML = `
    <section class="hero">
      <div style="position:relative;z-index:2">
        ${u ? `<div class="row mb">${avatar(u, 44)}<div><div class="mu sm">Привет,</div><div class="disp" style="font-size:18px">${nick(u)}</div></div></div>` : ''}
        <h2>${u ? 'Пиши код <em>быстрее</em>, чем думаешь' : 'Печатай код на Python <em>быстрее всех</em>'}</h2>
        <p>${u ? `Уровень ${L}. До следующего ${lvlXp(L + 1) - u.xp} XP. Проходи задания, собирай кубки лиг и поднимайся в рейтинге.` : 'Тренажёр скорости для программистов: настоящий код с подсветкой, лиги и кубки, монеты, магазин, общий чат и ИИ-наставник.'}</p>
        ${u ? `<div class="bar" style="max-width:420px;margin:-6px 0 22px"><i style="width:${p}%"></i></div>` : ''}
        <div class="row">
          ${nextT ? `<a class="btn pri lg" href="#/task/${nextT.id}">${I.play} ${u ? 'Продолжить' : 'Начать'}: ${esc(nextT.title)}</a>` : `<a class="btn pri lg" href="#/leagues">${I.flag} К заданиям</a>`}
          <a class="btn lg" href="#/train">${I.kb} Свободная тренировка</a>
          ${u ? '' : `<button class="btn lg blue" data-act="reg">Создать аккаунт</button>`}
        </div>
      </div>
      <div class="code-float"><span class="t-k">def</span> <span class="t-fn">fast</span>(<span class="t-p">you</span>):
    <span class="t-k">return</span> <span class="t-s">"🔥"</span> <span class="t-op">*</span> <span class="t-p">you</span>.<span class="t-call">wpm</span><span class="cr"></span></div>
    </section>

    ${u ? `<div class="grid g4 mt">
      <div class="card stat y"><b>${u.coins}</b><span>монет 🪙</span></div>
      <div class="card stat bl"><b>${u.best_wpm}</b><span>лучший WPM</span></div>
      <div class="card stat"><b>${cups}</b><span>${pl(cups, 'кубок', 'кубка', 'кубков').replace(/^\d+ /, '')} лиг</span></div>
      <div class="card stat"><b>${u.streak || 0}🔥</b><span>дней подряд</span></div>
    </div>` : ''}

    <div class="grid g3 mt">
      ${u?.can_daily ? `<div class="card" style="border-color:rgba(255,212,59,.35);background:linear-gradient(160deg,rgba(255,212,59,.12),transparent 60%),var(--card)">
        <h3>🎁 Бонус дня</h3><p class="mu sm mb">Заходи каждый день: серия увеличивает награду</p>
        <button class="btn pri" data-act="daily">Забрать ${S.cfg.daily || 25}+ 🪙</button></div>` : ''}
      ${day ? `<a class="card hov" href="#/task/${day.id}" style="--lc:${esc(day.lg.color)}">
        <h3>⚡ Задание дня<span class="sp"></span><span class="cupbadge" style="--lc:${esc(day.lg.color)}">${esc(day.lg.icon)} ${esc(day.lg.name)}</span></h3>
        <div class="disp" style="font-size:17px;margin-bottom:6px">${esc(day.title)}</div>
        <p class="mu sm mb">${esc(day.descr)}</p>
        <div class="row sm"><span class="tag">≥ ${day.min_wpm} WPM</span><span class="tag">≥ ${day.min_acc}%</span><span class="tag ok">+${day.coins} 🪙</span>${day.done ? starsH(day.done.stars) : ''}</div></a>` : ''}
      <div class="card">
        <h3>🏆 Лучшие<span class="sp"></span><a class="btn sm ghost" href="#/top">Весь рейтинг</a></h3>
        <div class="lb">${top.rows.slice(0, 5).map((r, i) => `<a href="#/u/${encodeURIComponent(r.name)}" class="${r.id === u?.id ? 'me' : ''}"><span class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</span>${avatar(r, 32)}<div>${nick(r)}<div class="sub">${r.lg || ''} ${r.best_wpm} WPM</div></div><span class="sc">${r.xp}</span></a>`).join('') || '<div class="empty">Пока пусто. Стань первым!</div>'}</div>
      </div>
      <a class="card hov" href="#/chat">
        <h3>💬 Общий чат<span class="sp"></span><span class="row xs mu"><span class="dot"></span> <span data-on>${S.online}</span> онлайн</span></h3>
        <div class="col sm" data-cp>${chatPreview()}</div>
      </a>
      <a class="card hov" href="#/ai" style="background:linear-gradient(160deg,rgba(75,139,255,.12),transparent 60%),var(--card)">
        <h3>✨ ИИ-наставник</h3>
        <p class="mu sm">Объяснит непонятный код, разберёт ошибку, даст совет как печатать быстрее и придумает задачку под твой уровень.</p>
        <div class="btn blue mt">Спросить</div>
      </a>
      <a class="card hov" href="#/shop">
        <h3>🛍 Магазин</h3>
        <p class="mu sm">Аватары, анимированные рамки, титулы, темы редактора и цветные ники. Монеты дают за задания, кубки и ежедневный вход.</p>
        <div class="row mt" style="font-size:28px;gap:6px">🦊 🐉 👾 🦄 👑</div>
      </a>
    </div>`
    return App.on('chat', () => {
      const e = $('[data-cp]', v); if (e) e.innerHTML = chatPreview()
      const o = $('[data-on]', v); if (o) o.textContent = S.online
    })
  }
})

function chatPreview() {
  const a = S.chat.filter(m => !m.sys).slice(-4)
  if (!a.length) return '<span class="mu">Тут пока тихо. Напиши первым!</span>'
  return a.map(m => `<div class="row" style="flex-wrap:nowrap;gap:8px">${avatar(m.u, 24)}<div style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b class="xs">${esc(m.u.name)}</b> <span class="mu">${esc(m.text)}</span></div></div>`).join('')
}

App.page('train', {
  title: 'Тренировка',
  render(v) {
    const mine = () => ls.g('mine', [])
    let cur = ls.g('tlast', null) || PRACTICE[0]
    v.innerHTML = `
      <div class="row mb">
        <div><div class="disp" style="font-size:18px" data-tt></div><div class="mu sm">Свободная тренировка. За неё тоже капают XP и немного монет</div></div>
        <span class="sp"></span>
        <button class="btn" data-b="prev" title="Предыдущий кусок" hidden>${I.prev}</button>
        <button class="btn" data-b="rnd">${I.dice} Случайный</button>
        <button class="btn" data-b="own">${I.plus} Свой код</button>
        <button class="btn blue" data-b="run">${I.play} Запустить</button>
      </div>
      <div data-tr></div>
      <div class="card mt">
        <h3>📚 Библиотека для тренировки<span class="sp"></span><span class="mu xs" style="font-family:Inter">Задания с наградами во вкладке «Задания»</span></h3>
        <div class="lib" data-lib></div>
      </div>`
    const all = () => [...PRACTICE.map(p => ({ ...p, b: 1 })), ...mine()]
    const tr = Trainer($('[data-tr]', v), {
      onNext: () => { const a = all(), i = a.findIndex(x => x.name === cur.name); pick(a[(i + 1) % a.length]) },
      onLoad: s => { $('[data-b=prev]', v).hidden = s.n < 2 },
      onPaste: t => { cur = { name: 'из буфера', code: t }; ls.s('tlast', cur); $('[data-tt]', v).textContent = cur.name }
    })
    function pick(s) {
      cur = s; ls.s('tlast', { name: s.name, code: s.code })
      $('[data-tt]', v).textContent = s.name
      tr.load(s.code, s.name)
      lib()
      tr.focus()
    }
    function lib() {
      $('[data-lib]', v).innerHTML = all().map((s, i) => `<button data-i="${i}" class="${s.name === cur.name ? 'on' : ''}"><b>${esc(s.name)}</b><span>${s.b ? 'встроенный' : 'мой'} · ${pl(prep(s.code).split('\n').length, 'строка', 'строки', 'строк')}</span></button>`).join('')
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
      const m = modal(`<h2>Свой код</h2><p class="mu sm mb">Вставь любой Python или открой .py файл. Сохранённое появится в библиотеке. Удалить можно правым кликом</p>
        <div class="col"><input class="in" data-n placeholder="Название" maxlength="40">
        <textarea class="in code" data-c rows="12" spellcheck="false" placeholder="def hello(name):&#10;    print(f&quot;hi, {name}&quot;)"></textarea>
        <div class="row"><label class="btn sm">Открыть файл<input type="file" accept=".py,.txt" hidden data-f></label><span class="sp"></span>
        <button class="btn" data-go>Печатать</button><button class="btn pri" data-sv>Сохранить и печатать</button></div></div>`, { wide: true })
      const c = $('[data-c]', m.el), n = $('[data-n]', m.el)
      c.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); c.setRangeText('    ', c.selectionStart, c.selectionEnd, 'end') } })
      $('[data-f]', m.el).onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { c.value = r.result; if (!n.value) n.value = f.name }; r.readAsText(f) }
      const go = sv => {
        if (!prep(c.value).trim()) return toast('Сначала вставь код', 'err')
        const s = { name: n.value.trim() || 'Свой код ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), code: c.value }
        if (sv) ls.s('mine', [...mine().filter(x => x.name !== s.name), s].slice(-50))
        m.close(); pick(s)
      }
      $('[data-go]', m.el).onclick = () => go(false)
      $('[data-sv]', m.el).onclick = () => go(true)
      setTimeout(() => c.focus(), 50)
    }
    pick(cur)
    return () => tr.destroy()
  }
})

App.page('leagues', {
  title: 'Задания',
  async render(v) {
    const { leagues } = await api('leagues')
    S.leagues = leagues
    const prev = i => leagues[i - 1]
    v.innerHTML = `<div class="col" style="gap:18px">
      ${!S.u ? `<div class="card row"><span style="font-size:26px">🔐</span><div style="flex:1"><b>Войди, чтобы прогресс сохранялся</b><div class="mu sm">Без аккаунта можно смотреть задания первой лиги, но кубки и монеты не начисляются</div></div><button class="btn pri" data-act="auth">Войти</button></div>` : ''}
      ${leagues.map((l, i) => {
        const got = l.tasks.filter(t => t.done).length, tot = l.tasks.length
        return `<section class="league ${l.open ? '' : 'lock'}" style="--lc:${esc(l.color)}">
          <div class="lg-head">
            <div class="lg-ic">${esc(l.icon)}</div>
            <div style="flex:1;min-width:0"><h2>${esc(l.name)}</h2>
              <div class="row sm mu" style="gap:14px"><span>${got} из ${tot} пройдено</span>${l.reward ? `<span>Кубок: +${l.reward} 🪙</span>` : ''}</div>
              <div class="bar" style="margin-top:8px;max-width:340px"><i style="width:${tot ? got / tot * 100 : 0}%;background:${esc(l.color)}"></i></div>
            </div>
            ${l.cup ? `<span class="cupbadge">${esc(l.icon)} Кубок получен</span>` : ''}
          </div>
          <div class="tasks">${l.tasks.map(t => `
            <a class="task ${t.done ? 'done' : ''}" href="#/task/${t.id}">
              <div class="row" style="flex-wrap:nowrap"><span class="t" style="flex:1">${esc(t.title)}</span>${t.done ? starsH(t.done.stars) : `<span class="tag">${'●'.repeat(t.lvl)}</span>`}</div>
              <div class="d">${esc(t.descr)}</div>
              <div class="m"><span>≥ ${t.min_wpm} WPM</span><span>≥ ${t.min_acc}%</span><span style="color:var(--y)">+${t.coins} 🪙</span><span>+${t.xp} XP</span></div>
            </a>`).join('') || '<div class="mu sm">Здесь пока нет заданий</div>'}
          </div>
          ${l.open ? '' : `<div class="lockmsg">${I.lock.replace('<svg', '<svg style="width:18px;height:18px"')} Получи кубок лиги «${esc(prev(i)?.name || '')}», чтобы открыть</div>`}
        </section>`
      }).join('')}
    </div>`
  }
})

App.page('task', {
  title: 'Задание',
  async render(v, id) {
    const { task: t, league: lg, done } = await api('tasks/' + (+id || 0))
    setTitle(t.title)
    v.innerHTML = `
      <div class="card mb" style="--lc:${esc(lg?.color || '#ffd43b')};background:linear-gradient(160deg,color-mix(in srgb,var(--lc) 10%,transparent),transparent 50%),var(--card)">
        <div class="row" style="align-items:flex-start">
          <div style="flex:1;min-width:240px">
            <div class="row sm mb" style="gap:8px"><a href="#/leagues" class="mu">${I.prev.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} Задания</a>${lg ? `<span class="cupbadge">${esc(lg.icon)} ${esc(lg.name)}</span>` : ''}</div>
            <div class="disp" style="font-size:24px;margin-bottom:6px">${esc(t.title)}</div>
            <p class="mu">${esc(t.descr)}</p>
          </div>
          <div class="col" style="align-items:flex-end;gap:8px">
            ${done ? `<div class="row">${starsH(done.stars)}<span class="mu sm">лучший: ${done.best_wpm} WPM, ${done.best_acc}%</span></div>` : ''}
            <div class="row sm"><span class="tag">нужно ≥ ${t.min_wpm} WPM</span><span class="tag">точность ≥ ${t.min_acc}%</span></div>
            <div class="row sm"><span class="tag ok">+${t.coins} 🪙</span><span class="tag">+${t.xp} XP</span></div>
          </div>
        </div>
        <div class="mu xs mt">★ пройти · ★★ скорость ×1.5 и точность 95% · ★★★ скорость ×2 и точность 98%. Новые звёзды дают дополнительные монеты</div>
      </div>
      <div data-tr></div>`
    const box = $('[data-tr]', v)
    const K = App.kinds[t.kind]
    if (t.kind !== 'type') {
      if (K) return K.render(box, t)
      box.innerHTML = '<div class="card empty"><b>🧩</b>Этот тип задания скоро появится</div>'
      return
    }
    const nextTask = async () => {
      const { leagues } = await api('leagues')
      const all = leagues.filter(l => l.open).flatMap(l => l.tasks)
      const i = all.findIndex(x => x.id === t.id)
      const n = all.slice(i + 1).find(x => !x.done) || all.find(x => !x.done) || all[i + 1]
      if (n) location.hash = '#/task/' + n.id
      else toast('Все доступные задания пройдены! Загляни в следующую лигу', 'ok')
    }
    const tr = Trainer(box, { task: true, taskId: t.id, code: t.code, name: t.title, onNext: nextTask })
    setTimeout(() => tr.focus(), 100)
    return () => tr.destroy()
  }
})

App.page('top', {
  title: 'Рейтинг',
  async render(v) {
    let by = 'xp'
    v.innerHTML = `<div class="row mb"><div class="tabs" data-tabs>
      <button data-by="xp">По опыту</button><button data-by="wpm">По скорости</button><button data-by="cups">По кубкам</button><button data-by="week">За неделю</button></div></div>
      <div data-b></div>`
    const sc = r => by === 'wpm' ? [r.best_wpm, 'WPM'] : by === 'cups' ? [r.cups, '🏆'] : by === 'week' ? [r.score, 'XP'] : [r.xp, 'XP']
    async function load() {
      $$('[data-by]', v).forEach(b => b.classList.toggle('on', b.dataset.by === by))
      const b = $('[data-b]', v)
      b.innerHTML = '<div class="empty">Загружаю...</div>'
      const { rows } = await api('top?by=' + by)
      if (!rows.length) { b.innerHTML = '<div class="card empty"><b>🏁</b>Пока никого. Пройди задание и займи первое место!</div>'; return }
      const p = [rows[1], rows[0], rows[2]]
      b.innerHTML = `<div class="podium">${p.map((r, k) => r ? `<a class="pod p${[2, 1, 3][k]}" href="#/u/${encodeURIComponent(r.name)}">
          <span class="pl">${[2, 1, 3][k]}</span>${avatar(r, k === 1 ? 76 : 60)}<div>${nick(r)} ${r.lg || ''}</div>${r.title ? `<span class="ttl">${esc(r.title)}</span>` : ''}
          <div class="sc">${sc(r)[0]} <span class="mu sm">${sc(r)[1]}</span></div></a>` : '<div></div>').join('')}</div>
        <div class="card" style="padding:8px"><div class="lb">${rows.slice(3).map((r, i) => `
          <a href="#/u/${encodeURIComponent(r.name)}" class="${r.id === S.u?.id ? 'me' : ''}"><span class="n">${i + 4}</span>${avatar(r, 36)}
          <div style="min-width:0"><div class="row" style="gap:6px">${nick(r)}${roleTag(r.role)}${r.title ? `<span class="ttl">${esc(r.title)}</span>` : ''}</div>
          <div class="sub">${r.lg || ''} уровень ${lvl(r.xp)} · ${r.best_wpm} WPM · ${pl(r.cups, 'кубок', 'кубка', 'кубков')}</div></div>
          <span class="sc">${sc(r)[0]} <span class="mu sm">${sc(r)[1]}</span></span></a>`).join('') || '<div class="mu sm" style="padding:12px">Остальные места пока свободны</div>'}</div></div>`
    }
    $('[data-tabs]', v).onclick = e => { const b = e.target.closest('[data-by]'); if (b) { by = b.dataset.by; load() } }
    await load()
  }
})

const KINDS = { avatar: 'Аватары', frame: 'Рамки', title: 'Титулы', theme: 'Темы редактора', color: 'Цвет ника' }
const SLOTV = { avatar: 'avatar', frame: 'frame', title: 'title', theme: 'theme', color: 'ncolor' }

App.page('shop', {
  title: 'Магазин',
  async render(v) {
    let k = 'avatar'
    let d = await api('shop')
    v.innerHTML = `<div class="row mb"><div class="tabs" data-k>${Object.entries(KINDS).map(([a, b]) => `<button data-kk="${a}">${b}</button>`).join('')}</div>
      <span class="sp"></span>${S.u ? `<span class="pill coin">🪙 <b data-c>${S.u.coins}</b></span>` : ''}</div>
      ${S.cfg.shop === false ? '<div class="card mb row">🔒 Магазин временно закрыт админом</div>' : ''}
      <div class="shop" data-g></div>`
    const pv = it => {
      if (it.kind === 'avatar') return `<span class="av" style="--s:64px">${esc(it.value)}</span>`
      if (it.kind === 'frame') return `<span class="av fr-${esc(it.value)}" style="--s:60px">${esc(S.u?.avatar || '🐍')}</span>`
      if (it.kind === 'title') return `<span class="ttl" style="font-size:14px;padding:6px 12px">${esc(it.value)}</span>`
      if (it.kind === 'theme') return `<div class="ed th-${esc(it.value)} themepv" style="background:var(--ebg)"><span class="t-k">def</span> <span class="t-fn">go</span>():<br>&nbsp;&nbsp;<span class="t-k">return</span> <span class="t-s">"ok"</span><span style="display:inline-block;width:2px;height:12px;background:var(--cur);vertical-align:-2px"></span></div>`
      if (it.kind === 'color') return `<span class="disp" style="font-size:20px">${nick({ name: S.u?.name || 'Ник', ncolor: it.value })}</span>`
      return ''
    }
    function draw() {
      $$('[data-kk]', v).forEach(b => b.classList.toggle('on', b.dataset.kk === k))
      const eq = S.u?.[SLOTV[k]] ?? ''
      const items = d.items.filter(i => i.kind === k)
      $('[data-g]', v).innerHTML = (k !== 'avatar' ? `<div class="item ${!eq ? 'eq' : ''}"><div class="pv"><span class="mu">Без ${k === 'frame' ? 'рамки' : k === 'title' ? 'титула' : k === 'theme' ? 'темы' : 'цвета'}</span></div><div class="nm">Обычный</div><div class="pr mu">бесплатно</div>
        ${S.u ? (!eq ? '<button class="btn sm" disabled>Надето</button>' : '<button class="btn sm" data-eq="0">Надеть</button>') : ''}</div>` : '') +
        items.map(it => {
          const own = it.price === 0 || d.own.includes(it.id), on = eq === it.value
          return `<div class="item ${on ? 'eq' : ''}"><div class="pv">${pv(it)}</div><div class="nm">${esc(it.name)}</div>
            <div class="pr">${it.price ? it.price + ' 🪙' : 'бесплатно'}</div>
            ${!S.u ? '<button class="btn sm" data-act="auth">Войти</button>'
              : on ? '<button class="btn sm" disabled>Надето</button>'
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
        const c = $('[data-c]', v); if (c) c.textContent = S.u.coins
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
      <div class="chat-h"><span class="dot"></span><b data-on>${S.online}</b><span class="mu sm">онлайн</span><span class="sp" style="flex:1"></span>
        <span class="mu xs" data-rules></span></div>
      <div class="msgs" data-m></div>
      <div data-f></div></div>`
    const box = $('[data-m]', v)
    const isMod = () => ['admin', 'mod'].includes(S.u?.role)
    const rules = () => {
      const c = S.cfg.chat || {}
      $('[data-rules]', v).textContent = [c.on === false ? 'чат выключен' : '', c.slow ? `медленный режим ${c.slow} с` : '', c.links ? '' : 'без ссылок', S.cfg.ai?.on && S.cfg.ai?.chat ? '/ai вопрос: спросить ИИ' : ''].filter(Boolean).join(' · ')
    }
    const foot = () => {
      const f = $('[data-f]', v)
      if (!S.u) { f.innerHTML = `<div class="chat-f" style="justify-content:center"><span class="mu sm">Войди, чтобы писать в чат</span><button class="btn sm pri" data-act="auth">Войти</button></div>`; return }
      f.innerHTML = `<form class="chat-f"><textarea class="in" maxlength="${S.cfg.chat?.len || 300}" placeholder="Сообщение... Enter отправить, Shift+Enter новая строка" data-t></textarea><button class="btn pri" style="height:46px" title="Отправить">${I.send}</button></form>`
      const fm = $('form', f), ta = $('[data-t]', f)
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fm.requestSubmit() } })
      ta.addEventListener('input', () => { ta.style.height = '46px'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px' })
      fm.onsubmit = e => {
        e.preventDefault()
        const t = ta.value.trim()
        if (!t) return
        const b = $('button', fm); b.disabled = true
        S.sock.emit('msg', t, r => {
          b.disabled = false
          if (r?.e) toast(r.e, 'err')
          else { ta.value = ''; ta.style.height = '46px'; ta.focus() }
        })
      }
    }
    const txt = (t, me) => esc(t).replace(/@([A-Za-z0-9_а-яА-ЯёЁ]{3,20})/g, (m, n) => `<span class="mention" ${me && n.toLowerCase() === me.toLowerCase() ? 'style="background:rgba(255,212,59,.15);border-radius:4px;padding:0 3px"' : ''}>@${n}</span>`)
    const el = (m, p) => {
      if (m.sys) return `<div class="sys">${esc(m.sys)}</div>`
      const cont = p && !p.sys && p.u?.id === m.u.id && m.u.id && new Date(m.at) - new Date(p.at) < 180000
      return `<div class="msg ${cont ? 'cont' : ''} ${m.bot ? 'bot' : ''} ${m.u.id === S.u?.id ? 'mine' : ''}" data-id="${m.id}">
        ${m.u.id ? `<a href="#/u/${encodeURIComponent(m.u.name)}">${avatar(m.u, 36)}</a>` : avatar(m.u, 36)}
        <div class="b"><div class="h">${nick(m.u)}${roleTag(m.u.role)}${m.u.title && m.u.role !== 'bot' ? `<span class="ttl">${esc(m.u.title)}</span>` : ''}<time>${new Date(m.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time></div>
        <div class="t">${m.bot ? md(m.text) : txt(m.text, S.u?.name)}</div></div>
        ${isMod() ? `<div class="act"><button class="ib" style="width:30px;height:30px" data-del="${m.id}" title="Удалить">${I.trash}</button>${m.u.id && m.u.role === 'user' ? `<button class="ib" style="width:30px;height:30px" data-mute="${m.u.id}" data-n="${esc(m.u.name)}" title="Мут">${I.mute}</button>` : ''}</div>` : ''}
      </div>`
    }
    const all = () => {
      if (!can()) { box.innerHTML = '<div class="empty"><b>🔐</b>Чат видят только вошедшие пользователи</div>'; return }
      box.innerHTML = S.chat.map((m, i) => el(m, S.chat[i - 1])).join('') || '<div class="empty"><b>👋</b>Тут пока пусто. Напиши первым!</div>'
      box.scrollTop = box.scrollHeight
    }
    box.onclick = async e => {
      const d = e.target.closest('[data-del]'), mu = e.target.closest('[data-mute]')
      if (d) S.sock.emit('del', +d.dataset.del, r => r?.e && toast(r.e, 'err'))
      if (mu) {
        const m = modal(`<h2>Мут для ${esc(mu.dataset.n)}</h2><p class="mu sm mb">На сколько закрыть доступ к чату?</p><div class="row">${[[10, '10 мин'], [60, '1 час'], [1440, '1 день'], [10080, 'неделя']].map(([a, b]) => `<button class="btn" data-mm="${a}">${b}</button>`).join('')}</div>`)
        m.el.onclick = ev => { const b = ev.target.closest('[data-mm]'); if (b) { S.sock.emit('mute', { uid: +mu.dataset.mute, min: +b.dataset.mm }, r => r?.e ? toast(r.e, 'err') : toast('Готово', 'ok')); m.close() } }
      }
    }
    rules(); foot(); all()
    const off = App.on('chat', d => {
      $('[data-on]', v).textContent = S.online
      if (d.t === 'hist' || d.t === 'hello' || d.t === 'del') return all()
      if (d.t === 'msg') {
        if (box.querySelector('.empty')) box.innerHTML = ''
        const near = box.scrollHeight - box.scrollTop - box.clientHeight < 140
        box.insertAdjacentHTML('beforeend', el(d.m, S.chat[S.chat.length - 2]))
        if (near || d.m.u?.id === S.u?.id) box.scrollTop = box.scrollHeight
      }
    })
    const off2 = App.on('cfg', () => { rules(); foot() })
    const off3 = App.on('user', () => { foot() })
    return () => { off(); off2(); off3() }
  }
})

App.page('ai', {
  title: 'ИИ-наставник',
  render(v) {
    if (!S.u) return needAuth(v, 'ИИ-наставника')
    if (!S.cfg.ai?.on) { v.innerHTML = '<div class="card empty"><b>🤖</b>ИИ сейчас выключен. Админ должен добавить GROQ_API_KEY и включить ИИ в настройках</div>'; return }
    let log = ls.g('ai_' + S.u.id, [])
    v.innerHTML = `<div class="ai">
      <div class="chat-h"><span style="font-size:20px">✨</span><b>Наставник по Python</b><span class="sp" style="flex:1"></span><span class="mu xs" data-left></span><button class="btn sm ghost" data-clr>Очистить</button></div>
      <div class="ai-log" data-l></div>
      <div style="padding:0 14px" class="row" data-chips>
        ${['Объясни декораторы на простом примере', 'Как печатать код быстрее?', 'Дай задачку на циклы под мой уровень', 'Чем list отличается от tuple?', 'Мои слабые символы'].map(t => `<button class="chip" data-q="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <form class="chat-f"><textarea class="in" data-t placeholder="Спроси что угодно про Python... Можно вставить код с ошибкой" maxlength="4000"></textarea><button class="btn blue" style="height:46px">${I.send}</button></form>
    </div>`
    const L = $('[data-l]', v), ta = $('[data-t]', v), fm = $('form', v)
    const left = () => { $('[data-left]', v).textContent = `осталось вопросов сегодня: ${S.ai_left}` }
    const draw = () => {
      L.innerHTML = log.length ? log.map(m => `<div class="bub ${m.role === 'user' ? 'u' : 'a'}">${m.role === 'user' ? esc(m.content) : md(m.content)}</div>`).join('')
        : `<div class="empty"><b>🤖</b>Привет! Я помогу разобраться с кодом, объясню ошибку и подскажу, как печатать быстрее.<br>Выбери вопрос ниже или напиши свой.</div>`
      L.scrollTop = L.scrollHeight
    }
    async function send(q, mode) {
      if (mode !== 'tips') log.push({ role: 'user', content: q })
      draw()
      L.insertAdjacentHTML('beforeend', '<div class="bub a" data-w><span class="typing"><span></span><span></span><span></span></span></div>')
      L.scrollTop = L.scrollHeight
      try {
        let r
        if (mode === 'tips') {
          const p = await api('u/' + encodeURIComponent(S.u.name))
          const ch = Object.entries(p.u.emap || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => sym(x[0])).join(' ')
          if (!ch) { log.push({ role: 'assistant', content: 'Пока не вижу твоих ошибок. Пройди пару заданий, и я разберу слабые места.' }); draw(); return }
          log.push({ role: 'user', content: 'Мои слабые символы: ' + ch })
          r = await api('ai', { mode: 'tips', chars: ch, wpm: S.u.best_wpm })
        } else r = await api('ai', { mode: 'chat', msgs: log.slice(-12) })
        log.push({ role: 'assistant', content: r.text })
        S.ai_left = r.left
      } catch (e) {
        log.push({ role: 'assistant', content: '⚠️ ' + e.message })
      }
      log = log.slice(-40)
      ls.s('ai_' + S.u.id, log)
      draw(); left()
    }
    fm.onsubmit = e => { e.preventDefault(); const q = ta.value.trim(); if (!q) return; ta.value = ''; send(q) }
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fm.requestSubmit() } })
    $('[data-chips]', v).onclick = e => { const b = e.target.closest('[data-q]'); if (b) send(b.dataset.q, b.dataset.q === 'Мои слабые символы' ? 'tips' : '') }
    $('[data-clr]', v).onclick = () => { log = []; ls.s('ai_' + S.u.id, log); draw() }
    draw(); left()
    ta.focus()
  }
})

async function profile(v, name) {
  const [p, lg] = await Promise.all([api('u/' + encodeURIComponent(name)), api('leagues').catch(() => ({ leagues: [] }))])
  const u = p.u, own = p.own, L = lvl(u.xp), pr = (u.xp - lvlXp(L)) / (lvlXp(L + 1) - lvlXp(L)) * 100
  const got = new Set(p.cups.map(c => c.id))
  setTitle(own ? 'Мой профиль' : u.name)
  const hrs = p.st.ms / 3600000
  v.innerHTML = `
    <div class="card" style="padding:28px;background:linear-gradient(135deg,rgba(255,212,59,.07),rgba(75,139,255,.05) 60%,transparent),var(--card)">
      <div class="prof">
        ${avatar(u, 104)}
        <div style="flex:1;min-width:220px">
          <div class="row" style="gap:8px"><h2>${nick(u)}</h2>${roleTag(u.role)}${u.title ? `<span class="ttl" style="font-size:13px">${esc(u.title)}</span>` : ''}</div>
          <div class="mu sm" style="margin:4px 0 10px">#${u.rank} в рейтинге · уровень ${L} · с нами с ${new Date(u.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}${own ? '' : ' · был ' + ago(u.seen_at)}</div>
          ${u.bio ? `<p style="margin-bottom:10px">${esc(u.bio)}</p>` : ''}
          <div class="row" style="max-width:420px"><span class="mono xs mu">${u.xp} XP</span><div class="bar" style="flex:1"><i style="width:${pr}%"></i></div><span class="mono xs mu">${lvlXp(L + 1)}</span></div>
        </div>
        ${own ? `<div class="col"><a class="btn" href="#/shop">${I.bag} Магазин</a><button class="btn" data-ed>${I.edit} Изменить</button><button class="btn red" data-act="logout">${I.out} Выйти</button></div>` : ''}
      </div>
    </div>
    <div class="grid g4 mt">
      <div class="card stat y"><b>${u.best_wpm}</b><span>лучший WPM</span></div>
      <div class="card stat"><b>${p.st.done}</b><span>заданий пройдено</span></div>
      <div class="card stat"><b>${p.st.stars}★</b><span>звёзд собрано</span></div>
      <div class="card stat bl"><b>${hrs >= 1 ? hrs.toFixed(1) + 'ч' : Math.round(hrs * 60) + 'м'}</b><span>за клавиатурой · ${p.st.runs} заходов</span></div>
    </div>
    <div class="card mt"><h3>🏆 Кубки лиг</h3><div class="cups">${lg.leagues.filter(l => l.id).map(l => `<div class="cup ${got.has(l.id) ? '' : 'off'}" style="--lc:${esc(l.color)}"><b>${esc(l.icon)}</b><span>${esc(l.name)}</span></div>`).join('')}</div></div>
    <div class="grid g2 mt">
      <div class="card"><h3>📈 Скорость и точность<span class="sp"></span><span class="xs mu" style="font-family:Inter"><span style="color:#ffb43b">━</span> WPM <span style="color:#4b8bff">━</span> точность</span></h3><canvas class="chart" data-cv></canvas></div>
      ${own ? `<div class="card"><h3>🎯 Слабые символы<span class="sp"></span>${S.cfg.ai?.on ? '<a class="btn sm" href="#/ai">Совет от ИИ</a>' : ''}</h3><div class="weak" data-wk></div></div>`
        : `<div class="card"><h3>📊 Всего напечатано</h3><div class="disp" style="font-size:34px">${p.st.chars.toLocaleString('ru-RU')}</div><div class="mu sm">символов кода</div></div>`}
    </div>
    <div class="card mt"><h3>🕒 Последние заходы</h3><div class="tw"><table class="t">
      <tr><th>Когда</th><th>Что</th><th>WPM</th><th>Точность</th><th>Время</th><th></th></tr>
      ${p.recent.map(r => `<tr><td class="mu">${ago(r.created_at)}</td><td>${esc(r.title || 'Тренировка')}</td><td class="mono"><b>${r.wpm}</b></td><td class="mono">${r.acc}%</td><td class="mono">${fmt(r.ms)}</td><td>${r.title ? (r.passed ? '<span class="tag ok">пройдено</span>' : '<span class="tag no">не засчитано</span>') : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="mu">Пока ничего</td></tr>'}
    </table></div></div>`
  const d = p.recent.slice().reverse().map(r => ({ w: r.wpm, a: r.acc }))
  const cv = $('[data-cv]', v)
  drawChart(cv, d)
  if (own) {
    const g = Object.entries(u.emap || {}).sort((a, b) => b[1] - a[1]).slice(0, 20), mx = g[0]?.[1] || 1
    $('[data-wk]', v).innerHTML = g.length ? g.map(([k, n]) => `<div class="wc" style="--p:${(n / mx).toFixed(2)}"><b>${esc(sym(k))}</b><span>${n}</span></div>`).join('') : '<div class="mu sm">Ошибок пока нет. Или ты ещё не тренировался 🙂</div>'
    $('[data-ed]', v).onclick = () => {
      const m = modal(`<h2>Профиль</h2><div class="col mt">
        <label class="f">О себе<textarea class="in" data-bio maxlength="160">${esc(u.bio)}</textarea></label>
        <button class="btn pri" data-sb>Сохранить</button>
        <div class="sep" style="height:1px;background:var(--ln);margin:8px 0"></div>
        <b>Сменить пароль</b>
        <input class="in" type="password" data-o placeholder="Старый пароль" autocomplete="current-password">
        <input class="in" type="password" data-n placeholder="Новый пароль" autocomplete="new-password">
        <button class="btn" data-sp>Сменить пароль</button></div>`)
      $('[data-sb]', m.el).onclick = async () => { try { await api('me', { bio: $('[data-bio]', m.el).value }, 'PATCH'); m.close(); toast('Сохранено', 'ok'); route() } catch (e) { toast(e.message, 'err') } }
      $('[data-sp]', m.el).onclick = async () => { try { await api('me/pass', { old: $('[data-o]', m.el).value, pass: $('[data-n]', m.el).value }); m.close(); toast('Пароль изменён', 'ok') } catch (e) { toast(e.message, 'err') } }
    }
  }
  const rs = () => drawChart(cv, d)
  addEventListener('resize', rs)
  const ot = App.on('theme', rs)
  return () => { removeEventListener('resize', rs); ot() }
}

App.page('me', { title: 'Профиль', render: v => S.u ? profile(v, S.u.name) : needAuth(v, 'профиль') })
App.page('u', { title: 'Профиль', render: (v, n) => profile(v, n) })
