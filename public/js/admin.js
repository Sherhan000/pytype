function fld(f, v) {
  const val = v ?? f.d ?? ''
  const lab = `<span>${esc(f.l)}${f.hint ? ` <span class="mu2 xs">· ${esc(f.hint)}</span>` : ''}</span>`
  if (f.t === 'bool') return `<label class="sw ${f.full ? 'full' : ''}"><input type="checkbox" data-k="${f.k}" ${val ? 'checked' : ''}>${esc(f.l)}</label>`
  if (f.t === 'sel') return `<label class="f ${f.full ? 'full' : ''}">${lab}<select class="in" data-k="${f.k}">${f.o.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(val) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`
  if (f.t === 'area' || f.t === 'code') return `<label class="f full">${lab}<textarea class="in ${f.t === 'code' ? 'code' : ''}" data-k="${f.k}" rows="${f.t === 'code' ? 14 : f.rows || 3}" spellcheck="false">${esc(typeof val === 'object' ? JSON.stringify(val, null, 2) : val)}</textarea></label>`
  return `<label class="f ${f.full ? 'full' : ''}">${lab}<input class="in" data-k="${f.k}" type="${f.t === 'num' ? 'number' : f.t === 'color' ? 'color' : 'text'}" value="${esc(val)}" ${f.t === 'color' ? 'style="height:44px;padding:4px"' : ''}></label>`
}
function readF(el, fs) {
  const r = {}
  for (const f of fs) {
    const e = $(`[data-k="${f.k}"]`, el)
    if (!e) continue
    r[f.k] = f.t === 'bool' ? e.checked : f.t === 'num' ? +e.value : e.value
  }
  return r
}
function tabKeys(ta) { ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end') } }) }

const KMETA = {
  type: '{}',
  quiz: JSON.stringify({ q: 'Что выведет этот код?', options: ['вариант A', 'вариант B', 'вариант C', 'вариант D'], answer: 0, explain: '' }, null, 2),
  fix: JSON.stringify({ fixed: 'сюда исправленный код целиком', hint: '', explain: '' }, null, 2),
  fill: JSON.stringify({ hint: '', explain: '' }, null, 2),
  test: JSON.stringify({ qs: [{ q: 'Вопрос', code: '', options: ['A', 'B', 'C', 'D'], answer: 0, explain: '' }] }, null, 2),
  next: JSON.stringify({ q: 'Какая строка будет дальше?', options: ['    вариант 1', 'вариант 2', 'вариант 3', 'вариант 4'], answer: 0, hint: '', explain: '' }, null, 2),
  trim: JSON.stringify({ extra: [3], hint: '', explain: '' }, null, 2)
}
const KHELP = {
  type: '<b>Печать кода.</b> <span class="mu sm">Игрок печатает код на скорость. Работают минимум WPM и точности.</span>',
  quiz: '<b>Что выведет код.</b> <span class="mu sm">В «Код» положи программу. В meta: <code>options</code> — варианты, <code>answer</code> — номер верного с нуля. Без <code>options</code> игрок вписывает вывод сам, тогда <code>answer</code> — точный текст вывода. <code>explain</code> покажется после верного ответа. Проверь вывод кнопкой «Проверить код».</span>',
  fix: '<b>Найди ошибку.</b> <span class="mu sm">В «Код» положи код с ошибкой. В meta: <code>fixed</code> — исправленный код целиком, можно <code>accept</code> — список других верных вариантов. Лишние пробелы внутри строк не важны.</span>',
  test: '<b>Тест.</b> <span class="mu sm">«Код» можно оставить пустым. В meta: <code>qs</code> — список вопросов, у каждого <code>q</code>, необязательный <code>code</code>, <code>options</code>, <code>answer</code> (номер с нуля) и <code>explain</code>.</span>',
  next: '<b>Что будет дальше.</b> <span class="mu sm">В «Код» положи начало программы. В meta: <code>options</code> — варианты следующей строки с отступами, <code>answer</code> — номер верного с нуля.</span>',
  trim: '<b>Убери лишнее.</b> <span class="mu sm">В «Код» положи программу вместе с лишними строками. В meta: <code>extra</code> — номера лишних строк, считая с 1.</span>',
  fill: '<b>Допиши пропуски.</b> <span class="mu sm">В «Коде» отметь пропуски двойными фигурными скобками: <code>{{range}}</code>. Несколько верных ответов через |: <code>{{+=|= total +}}</code>. Ответы в браузер не уходят.</span>'
}

const ATABS = [
  ['ov', 'Обзор', ['admin']], ['tasks', 'Задания', ['admin']], ['leagues', 'Лиги', ['admin']], ['items', 'Магазин', ['admin']],
  ['users', 'Пользователи', ['admin', 'mod']], ['chat', 'Чат', ['admin', 'mod']], ['news', 'Новости', ['admin']], ['issues', 'Ошибки', ['admin']], ['set', 'Настройки', ['admin']]
]

App.page('admin', {
  title: 'Админка',
  async render(v, sub) {
    if (!['admin', 'mod'].includes(S.u?.role)) { v.innerHTML = '<div class="card empty"><b>⛔</b>Сюда только админам и модераторам</div>'; return }
    const tabs = ATABS.filter(t => t[2].includes(S.u.role))
    const cur = tabs.find(t => t[0] === sub)?.[0] || tabs[0][0]
    v.innerHTML = `<div class="row mb"><div class="tabs">${tabs.map(t => `<a href="#/admin/${t[0]}" class="${t[0] === cur ? 'on' : ''}">${t[1]}</a>`).join('')}</div></div><div data-b></div>`
    const b = $('[data-b]', v)
    return ADM[cur](b)
  }
})

const ADM = {
  async ov(b) {
    const s = await api('admin/stats')
    b.innerHTML = `
      ${!s.groq ? `<div class="card mb" style="border-color:rgba(255,84,112,.4)"><b>⚠️ ИИ не подключён.</b> <span class="mu">Добавь переменную окружения GROQ_API_KEY на сервере (ключ бесплатно на console.groq.com) и перезапусти.</span></div>` : ''}
      <div class="adm-grid">
        ${[['Пользователей', s.users], ['Активны за сутки', s.active], ['Онлайн в чате', s.online], ['Заходов всего', s.results], ['Заходов за сутки', s.results_day], ['Сообщений за сутки', s.msgs_day], ['Активных заданий', s.tasks], ['Монет у игроков', s.coins]]
          .map(([a, c], i) => `<div class="card stat ${i === 0 ? 'y' : ''}"><b>${c}</b><span>${a}</span></div>`).join('')}
      </div>
      <div class="card mt"><h3>Заходы за 2 недели</h3><canvas class="chart" data-cv style="height:160px"></canvas></div>
      <div class="card mt"><h3>Подсказки</h3><div class="mu sm col">
        <span>• Новые задания добавляются во вкладке «Задания». Кнопка «Сгенерировать ИИ» сама придумает код по теме.</span>
        <span>• Кубок лиги выдаётся, когда пройдены все активные задания лиги. Следующая лига открывается после кубка предыдущей.</span>
        <span>• Модераторы могут мутить, банить и удалять сообщения. Назначить модератора можно во вкладке «Пользователи».</span>
        <span>• Свои фичи на сервере добавляются файлами в папке server/plugins, на сайте в public/js/ext.js.</span>
      </div></div>`
    const cv = $('[data-cv]', b), W = cv.getBoundingClientRect().width, H = 160, dp = devicePixelRatio || 1
    cv.width = W * dp; cv.height = H * dp
    const x = cv.getContext('2d'); x.scale(dp, dp)
    const d = s.days, mx = Math.max(1, ...d.map(q => q.n)), bw = W / Math.max(14, d.length)
    x.font = '10px "JetBrains Mono", monospace'
    d.forEach((q, i) => {
      const hh = q.n / mx * (H - 30)
      const g = x.createLinearGradient(0, H - 18 - hh, 0, H - 18); g.addColorStop(0, '#ffd43b'); g.addColorStop(1, '#ff7a3d')
      x.fillStyle = g; x.beginPath(); x.roundRect(i * bw + 4, H - 18 - hh, bw - 8, hh, 6); x.fill()
      x.fillStyle = '#8d95aa'; x.fillText(new Date(q.d).getDate(), i * bw + bw / 2 - 5, H - 4); x.fillText(q.n, i * bw + bw / 2 - 5, H - 22 - hh)
    })
  },

  async tasks(b) {
    const [{ rows }, { rows: lgs }] = await Promise.all([api('admin/tasks'), api('admin/leagues')])
    let lf = 'all'
    const lname = id => lgs.find(l => l.id === id)
    const FS = [
      { k: 'title', l: 'Название', full: 1 },
      { k: 'league_id', l: 'Лига', t: 'sel', o: [['', 'Без лиги (раздел «Разное»)'], ...lgs.map(l => [l.id, l.icon + ' ' + l.name])] },
      { k: 'kind', l: 'Тип', t: 'sel', d: 'type', o: [['type', '⌨️ type: печать кода'], ['quiz', '❓ quiz: что выведет код'], ['fix', '🔧 fix: найди ошибку'], ['fill', '✍️ fill: допиши пропуски'], ['test', '📝 test: тест с вопросами'], ['next', '🔮 next: что будет дальше'], ['trim', '🧹 trim: убери лишний код']] },
      { k: 'descr', l: 'Описание', t: 'area' },
      { k: 'code', l: 'Код', t: 'code' },
      { k: 'lvl', l: 'Сложность 1-3', t: 'num', d: 1 },
      { k: 'ord', l: 'Порядок', t: 'num', d: 0 },
      { k: 'min_wpm', l: 'Минимум WPM', t: 'num', d: 15 },
      { k: 'min_acc', l: 'Минимум точности %', t: 'num', d: 88 },
      { k: 'coins', l: 'Награда монет', t: 'num', d: 20 },
      { k: 'xp', l: 'Награда XP', t: 'num', d: 30 },
      { k: 'meta', l: 'meta (JSON)', t: 'area', d: '{}', rows: 7 },
      { k: 'active', l: 'Активно', t: 'bool', d: true, full: 1 }
    ]
    function draw() {
      const list = rows.filter(t => lf === 'all' || String(t.league_id ?? '') === lf)
      b.innerHTML = `<div class="row mb">
        <select class="in" style="width:auto" data-lf><option value="all">Все лиги</option>${lgs.map(l => `<option value="${l.id}" ${String(l.id) === lf ? 'selected' : ''}>${esc(l.icon + ' ' + l.name)}</option>`).join('')}<option value="" ${lf === '' ? 'selected' : ''}>Без лиги</option></select>
        <span class="sp"></span><button class="btn blue" data-ai>${I.spark} Сгенерировать ИИ</button><button class="btn pri" data-new>${I.plus} Новое задание</button></div>
        <div class="list">${list.map(t => { const l = lname(t.league_id); return `<div class="li">
          <span style="font-size:22px">${l ? esc(l.icon) : '🧩'}</span>
          <div class="g"><b>${esc(t.title)}</b><span class="mu xs">${l ? esc(l.name) : 'без лиги'} · ${t.kind} · ≥${t.min_wpm} WPM · ≥${t.min_acc}% · +${t.coins}🪙 · порядок ${t.ord}</span></div>
          ${t.active ? '<span class="tag ok">активно</span>' : '<span class="tag">скрыто</span>'}
          <a class="btn sm ghost" href="#/task/${t.id}">Открыть</a><button class="btn sm" data-e="${t.id}">${I.edit}</button><button class="btn sm red" data-d="${t.id}">${I.trash}</button></div>` }).join('') || '<div class="empty">Заданий нет</div>'}</div>`
    }
    function edit(t, pre) {
      const m = modal(`<h2>${t ? 'Редактировать' : 'Новое задание'}</h2><div class="form mt" data-f>${FS.map(f => fld(f, t ? t[f.k] : pre?.[f.k])).join('')}</div>
        <div class="card mt kh" data-kh></div>
        <div class="row mt"><button class="btn" data-pv>${I.play} Проверить код</button><span class="sp"></span><button class="btn" data-x2>Отмена</button><button class="btn pri" data-s>Сохранить</button></div><div class="out" hidden data-o></div>`, { wide: true })
      tabKeys($('[data-k=code]', m.el))
      tabKeys($('[data-k=meta]', m.el))
      const kSel = $('[data-k=kind]', m.el), meta = $('[data-k=meta]', m.el)
      const kh = () => {
        const k = kSel.value
        $('[data-kh]', m.el).innerHTML = KHELP[k] || ''
        const cur = meta.value.trim()
        if (!cur || cur === '{}' || Object.values(KMETA).includes(cur)) meta.value = KMETA[k] || '{}'
      }
      kSel.onchange = kh
      kh()
      $('[data-x2]', m.el).onclick = m.close
      $('[data-pv]', m.el).onclick = () => runPy($('[data-k=code]', m.el).value, $('[data-o]', m.el))
      $('[data-s]', m.el).onclick = async () => {
        const d = readF(m.el, FS)
        try { JSON.parse(d.meta || '{}') } catch (e) { return toast('meta должен быть JSON', 'err') }
        if (!d.title.trim()) return toast('Нужно название', 'err')
        try {
          const r = t ? await api('admin/tasks/' + t.id, d, 'PUT') : await api('admin/tasks', d)
          const i = rows.findIndex(x => x.id === r.row.id)
          i >= 0 ? rows[i] = r.row : rows.push(r.row)
          m.close(); draw(); toast('Сохранено', 'ok')
        } catch (e) { toast(e.message, 'err') }
      }
    }
    b.onclick = async e => {
      const q = e.target.closest('[data-e],[data-d],[data-new],[data-ai]')
      if (!q) return
      if (q.dataset.e) edit(rows.find(t => t.id === +q.dataset.e))
      if ('new' in q.dataset) edit(null, { league_id: lf !== 'all' ? lf : '' })
      if (q.dataset.d && await ask('Удалить задание? Прогресс игроков по нему тоже удалится', 'Удалить', 'red')) {
        await api('admin/tasks/' + q.dataset.d, undefined, 'DELETE'); rows.splice(rows.findIndex(t => t.id === +q.dataset.d), 1); draw()
      }
      if ('ai' in q.dataset) {
        const m = modal(`<h2>${I.spark.replace('<svg', '<svg style="width:22px;height:22px;vertical-align:-3px;color:var(--y)"')} Задание от ИИ</h2>
          <div class="col mt"><label class="f">Тема<input class="in" data-tp placeholder="например: словари, рекурсия, классы, работа со строками"></label>
          <label class="f">Тип задания<select class="in" data-kd><option value="type">⌨️ Печать кода</option><option value="quiz">❓ Что выведет код</option><option value="fix">🔧 Найди ошибку</option><option value="fill">✍️ Допиши пропуски</option><option value="test">📝 Тест с вопросами</option><option value="next">🔮 Что будет дальше</option><option value="trim">🧹 Убери лишний код</option></select></label>
          <label class="f">Сложность<select class="in" data-lv><option value="1">1, лёгкое</option><option value="2">2, среднее</option><option value="3">3, сложное</option></select></label>
          <button class="btn blue" data-g>Сгенерировать</button></div>`)
        $('[data-g]', m.el).onclick = async ev => {
          ev.target.disabled = true; ev.target.textContent = 'Думаю...'
          try {
            const kd = $('[data-kd]', m.el).value
            const r = await api('admin/ai-task', { topic: $('[data-tp]', m.el).value || 'циклы', lvl: +$('[data-lv]', m.el).value, kind: kd })
            const lv = +$('[data-lv]', m.el).value, ty = kd === 'type'
            m.close()
            edit(null, { ...r, lvl: lv, min_wpm: ty ? [0, 12, 18, 26][lv] : 0, min_acc: ty ? [0, 85, 90, 93][lv] : 0, coins: [0, 15, 30, 50][lv], xp: [0, 20, 40, 70][lv], league_id: lf !== 'all' ? lf : '' })
          } catch (er) { toast(er.message, 'err'); ev.target.disabled = false; ev.target.textContent = 'Сгенерировать' }
        }
      }
    }
    b.onchange = e => { if (e.target.matches('[data-lf]')) { lf = e.target.value; draw() } }
    draw()
  },

  async leagues(b) {
    const { rows } = await api('admin/leagues')
    const FS = [{ k: 'name', l: 'Название' }, { k: 'icon', l: 'Иконка (эмодзи)', d: '🏆' }, { k: 'color', l: 'Цвет', t: 'color', d: '#ffd43b' }, { k: 'ord', l: 'Порядок (кто раньше)', t: 'num', d: rows.length + 1 }, { k: 'reward', l: 'Монеты за кубок', t: 'num', d: 100 }]
    function draw() {
      b.innerHTML = `<div class="row mb"><span class="mu sm">Лиги открываются по порядку. Кубок лиги даётся за все её задания</span><span class="sp"></span><button class="btn pri" data-new>${I.plus} Новая лига</button></div>
        <div class="list">${rows.map(l => `<div class="li" style="--lc:${esc(l.color)}"><div class="lg-ic" style="width:44px;height:44px;font-size:22px">${esc(l.icon)}</div>
          <div class="g"><b>${esc(l.name)}</b><span class="mu xs">порядок ${l.ord} · кубок +${l.reward} 🪙</span></div>
          <button class="btn sm" data-e="${l.id}">${I.edit}</button><button class="btn sm red" data-d="${l.id}">${I.trash}</button></div>`).join('')}</div>`
    }
    function edit(l) {
      const m = modal(`<h2>${l ? 'Лига' : 'Новая лига'}</h2><div class="form mt">${FS.map(f => fld(f, l?.[f.k])).join('')}</div><div class="row mt"><span class="sp"></span><button class="btn pri" data-s>Сохранить</button></div>`)
      $('[data-s]', m.el).onclick = async () => {
        try {
          const d = readF(m.el, FS), r = l ? await api('admin/leagues/' + l.id, d, 'PUT') : await api('admin/leagues', d)
          const i = rows.findIndex(x => x.id === r.row.id); i >= 0 ? rows[i] = r.row : rows.push(r.row)
          rows.sort((a, c) => a.ord - c.ord || a.id - c.id); m.close(); draw()
        } catch (e) { toast(e.message, 'err') }
      }
    }
    b.onclick = async e => {
      const q = e.target.closest('[data-e],[data-d],[data-new]')
      if (!q) return
      if (q.dataset.e) edit(rows.find(l => l.id === +q.dataset.e))
      if ('new' in q.dataset) edit(null)
      if (q.dataset.d && await ask('Удалить лигу? Задания останутся без лиги, кубки этой лиги пропадут', 'Удалить', 'red')) {
        await api('admin/leagues/' + q.dataset.d, undefined, 'DELETE'); rows.splice(rows.findIndex(l => l.id === +q.dataset.d), 1); draw()
      }
    }
    draw()
  },

  async items(b) {
    const { rows } = await api('admin/items')
    const FS = [
      { k: 'kind', l: 'Тип', t: 'sel', o: Object.entries(KINDS) },
      { k: 'name', l: 'Название' },
      { k: 'value', l: 'Значение', hint: 'аватар: эмодзи · рамка: ice/neon/gold/fire/rainbow · тема: matrix/sunset/ocean/candy · цвет: #hex или grad' },
      { k: 'price', l: 'Цена', t: 'num', d: 100 },
      { k: 'ord', l: 'Порядок', t: 'num', d: 0 },
      { k: 'active', l: 'В продаже', t: 'bool', d: true, full: 1 }
    ]
    function draw() {
      b.innerHTML = `<div class="row mb"><span class="sp"></span><button class="btn pri" data-new>${I.plus} Новый товар</button></div>
        ${Object.entries(KINDS).map(([k, n]) => `<h3 class="disp mt mb" style="font-size:15px">${n}</h3><div class="list">${rows.filter(i => i.kind === k).map(i => `<div class="li">
          <div style="width:44px;text-align:center;font-size:22px">${k === 'avatar' ? esc(i.value) : k === 'frame' ? `<span class="av fr-${esc(i.value)}" style="--s:30px">🐍</span>` : k === 'color' ? `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${i.value === 'grad' ? 'var(--gp)' : esc(i.value)}"></span>` : '🎨'}</div>
          <div class="g"><b>${esc(i.name)}</b><span class="mu xs">${esc(i.value)} · ${i.price} 🪙</span></div>${i.active ? '' : '<span class="tag">скрыт</span>'}
          <button class="btn sm" data-e="${i.id}">${I.edit}</button><button class="btn sm red" data-d="${i.id}">${I.trash}</button></div>`).join('')}</div>`).join('')}`
    }
    function edit(it) {
      const m = modal(`<h2>${it ? 'Товар' : 'Новый товар'}</h2><div class="form mt">${FS.map(f => fld(f, it?.[f.k])).join('')}</div><div class="row mt"><span class="sp"></span><button class="btn pri" data-s>Сохранить</button></div>`)
      $('[data-s]', m.el).onclick = async () => {
        try {
          const d = readF(m.el, FS), r = it ? await api('admin/items/' + it.id, d, 'PUT') : await api('admin/items', d)
          const i = rows.findIndex(x => x.id === r.row.id); i >= 0 ? rows[i] = r.row : rows.push(r.row); m.close(); draw()
        } catch (e) { toast(e.message, 'err') }
      }
    }
    b.onclick = async e => {
      const q = e.target.closest('[data-e],[data-d],[data-new]')
      if (!q) return
      if (q.dataset.e) edit(rows.find(i => i.id === +q.dataset.e))
      if ('new' in q.dataset) edit(null)
      if (q.dataset.d && await ask('Удалить товар? У купивших он тоже пропадёт из инвентаря', 'Удалить', 'red')) {
        await api('admin/items/' + q.dataset.d, undefined, 'DELETE'); rows.splice(rows.findIndex(i => i.id === +q.dataset.d), 1); draw()
      }
    }
    draw()
  },

  async users(b) {
    const isA = S.u.role === 'admin'
    b.innerHTML = `<div class="row mb"><input class="in" style="max-width:320px" placeholder="Поиск по нику" data-q></div><div class="card" style="padding:6px"><div class="tw"><table class="t" data-t></table></div></div>`
    let rows = []
    async function load() {
      rows = (await api('admin/users?q=' + encodeURIComponent($('[data-q]', b).value))).rows
      $('[data-t]', b).innerHTML = `<tr><th>Ник</th><th>Роль</th><th>Монеты</th><th>XP</th><th>WPM</th><th>Заданий</th><th>Был</th><th></th></tr>` + rows.map(u => `<tr>
        <td><a href="#/u/${encodeURIComponent(u.name)}"><b>${esc(u.name)}</b></a> ${u.banned ? '<span class="tag no">бан</span>' : ''}${u.muted_until && new Date(u.muted_until) > new Date() ? ' <span class="tag">мут</span>' : ''}</td>
        <td>${roleTag(u.role) || '<span class="mu xs">игрок</span>'}</td><td class="mono">${u.coins}</td><td class="mono">${u.xp}</td><td class="mono">${u.best_wpm}</td><td class="mono">${u.done}</td>
        <td class="mu xs">${ago(u.seen_at)}</td><td><button class="btn sm" data-e="${u.id}">${I.edit}</button></td></tr>`).join('')
    }
    let tm
    $('[data-q]', b).oninput = () => { clearTimeout(tm); tm = setTimeout(load, 300) }
    b.onclick = e => {
      const q = e.target.closest('[data-e]')
      if (!q) return
      const u = rows.find(x => x.id === +q.dataset.e)
      const m = modal(`<h2>${esc(u.name)}</h2><p class="mu sm">${u.coins} 🪙 · ${u.xp} XP · заданий ${u.done}</p>
        <div class="form mt">
          ${isA ? `<label class="f">Роль<select class="in" data-role>${[['user', 'Игрок'], ['mod', 'Модератор'], ['admin', 'Админ']].map(([a, c]) => `<option value="${a}" ${u.role === a ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="f">Титул<input class="in" data-title placeholder="Оставь как есть"></label>
          <label class="f">Монеты (+ дать, − забрать)<input class="in" type="number" data-coins value="0"></label>
          <label class="f">XP (+/−)<input class="in" type="number" data-xp value="0"></label>` : ''}
          <label class="f">Мут в чате, минут (0 = снять)<input class="in" type="number" data-mute placeholder="не менять"></label>
          <label class="sw" style="align-self:end;padding-bottom:10px"><input type="checkbox" data-ban ${u.banned ? 'checked' : ''}>Бан</label>
          ${isA ? '<label class="sw full"><input type="checkbox" data-reset>Сбросить весь прогресс (задания, кубки, XP)</label>' : ''}
        </div><div class="row mt"><span class="sp"></span><button class="btn pri" data-s>Применить</button></div>`)
      $('[data-s]', m.el).onclick = async () => {
        const d = { banned: $('[data-ban]', m.el).checked }
        const mu = $('[data-mute]', m.el).value
        if (mu !== '') d.mute = +mu
        if (isA) {
          d.role = $('[data-role]', m.el).value
          d.coins = +$('[data-coins]', m.el).value
          d.xp = +$('[data-xp]', m.el).value
          const t = $('[data-title]', m.el).value
          if (t) d.title = t
          if ($('[data-reset]', m.el).checked) { if (!(await ask('Точно сбросить прогресс ' + u.name + '?', 'Сбросить', 'red'))) return; d.reset = 1 }
          if (u.role === d.role) delete d.role
        }
        if (u.banned === d.banned) delete d.banned
        try { await api('admin/users/' + u.id, d, 'PATCH'); $('#modal').innerHTML = ''; toast('Готово', 'ok'); load() } catch (er) { toast(er.message, 'err') }
      }
    }
    await load()
  },

  async chat(b) {
    const isA = S.u.role === 'admin'
    const FS = [
      { k: 'on', l: 'Чат включён', t: 'bool' },
      { k: 'read', l: 'Гости могут читать', t: 'bool' },
      { k: 'links', l: 'Разрешить ссылки', t: 'bool' },
      { k: 'filter', l: 'Фильтр мата', t: 'bool' },
      { k: 'slow', l: 'Медленный режим, сек между сообщениями', t: 'num' },
      { k: 'burst', l: 'Максимум сообщений за 30 сек', t: 'num' },
      { k: 'len', l: 'Максимальная длина сообщения', t: 'num' },
      { k: 'xp', l: 'Писать можно с XP', t: 'num' },
      { k: 'age', l: 'Писать можно через N минут после регистрации', t: 'num' }
    ]
    const st = isA ? (await api('admin/settings')).cfg : null
    b.innerHTML = `
      ${isA ? `<div class="card mb"><h3>Права и защита чата</h3><div class="form" data-f>${FS.map(f => fld(f, st.chat[f.k])).join('')}</div>
        <div class="row mt"><span class="mu xs">Админы и модераторы обходят ограничения</span><span class="sp"></span><button class="btn pri" data-s>Сохранить</button></div></div>
      <div class="card mb"><h3>Объявление в чат</h3><div class="row"><input class="in" style="flex:1" data-say placeholder="Текст объявления"><button class="btn" data-sy>Отправить</button><button class="btn red" data-clr>Очистить весь чат</button></div></div>` : ''}
      <div class="card"><h3>Последние сообщения</h3><div class="list" data-l></div></div>`
    if (isA) {
      $('[data-s]', b).onclick = async () => { try { await api('admin/settings', { chat: readF($('[data-f]', b), FS) }, 'PUT'); toast('Сохранено', 'ok') } catch (e) { toast(e.message, 'err') } }
      $('[data-sy]', b).onclick = async () => { const i = $('[data-say]', b); if (!i.value.trim()) return; await api('admin/chat/say', { text: i.value }); i.value = ''; toast('Отправлено', 'ok') }
      $('[data-clr]', b).onclick = async () => { if (await ask('Скрыть все сообщения в чате?', 'Очистить', 'red')) { await api('admin/chat/clear', {}); load() } }
    }
    async function load() {
      const { rows } = await api('admin/msgs')
      $('[data-l]', b).innerHTML = rows.map(m => `<div class="li" style="${m.deleted ? 'opacity:.45' : ''}"><div class="g"><b class="sm">${esc(m.bot ? 'ИИ-наставник' : m.name || '?')}</b><span class="sm" style="white-space:pre-wrap">${esc(m.text)}</span></div>
        <span class="mu xs">${ago(m.created_at)}</span>${m.deleted ? '<span class="tag">удалено</span>' : `<button class="btn sm red" data-d="${m.id}">${I.trash}</button>`}</div>`).join('') || '<div class="empty">Сообщений нет</div>'
    }
    $('[data-l]', b).onclick = async e => { const d = e.target.closest('[data-d]'); if (d) { await api('admin/msgs/' + d.dataset.d, undefined, 'DELETE'); load() } }
    await load()
  },

  async news(b) {
    const { rows } = await api('admin/news')
    b.innerHTML = `<div class="card mb"><h3>Новая запись</h3><p class="sm mu mb">Появится у всех в окне «Что нового» при следующем заходе</p>
      <div class="col"><div class="row" style="flex-wrap:nowrap"><input class="in" data-i value="✨" style="width:64px;text-align:center;flex:none" maxlength="4"><input class="in" data-t placeholder="Заголовок" maxlength="120"></div>
      <textarea class="in" data-b rows="3" placeholder="Что изменилось, коротко и по-человечески" maxlength="1200"></textarea>
      <label class="f">Куда ведёт кнопка «Открыть»<select class="in" data-l><option value="">никуда</option>${App.nav.filter(n => !n.role).map(n => `<option value="#/${n.r}">${esc(t(n.t))}</option>`).join('')}</select></label>
      <div class="row"><span class="sp"></span><button class="btn pri" data-add>Опубликовать</button></div></div></div>
      <div class="list">${rows.map(n => `<div class="li"><span style="font-size:24px">${esc(n.icon)}</span><div class="g"><b>${esc(n.title)}</b><span class="mu xs">${esc(n.body)}</span><span class="mu xs">${ago(n.at)}${n.link ? ' · ' + esc(n.link) : ''}</span></div><button class="btn sm red" data-d="${n.id}">Удалить</button></div>`).join('') || '<div class="empty">Пока пусто</div>'}</div>`
    $('[data-add]', b).onclick = async () => {
      const d = { icon: $('[data-i]', b).value.trim() || '✨', title: $('[data-t]', b).value.trim(), body: $('[data-b]', b).value.trim(), link: $('[data-l]', b).value }
      if (!d.title) return toast('Нужен заголовок', 'err')
      try { await api('admin/news', d); toast('Опубликовано', 'ok'); this.news(b) } catch (e) { toast(e.message, 'err') }
    }
    b.querySelector('.list').onclick = async e => {
      const x = e.target.closest('[data-d]')
      if (x && await ask('Удалить запись?', 'Удалить', 'red')) { await api('admin/news/' + x.dataset.d, undefined, 'DELETE'); this.news(b) }
    }
  },

  async issues(b) {
    const { rows } = await api('admin/issues')
    b.innerHTML = `<div class="card mb"><h3>Известная проблема</h3><p class="sm mu mb">Маленький блок «Известные проблемы» на главной и в «Что нового». Пиши коротко, что не работает и что делать</p>
      <div class="col"><textarea class="in" data-t rows="2" maxlength="300" placeholder="Например: на iPhone не приходят уведомления"></textarea>
      <div class="row"><span class="sp"></span><button class="btn pri" data-add>Добавить</button></div></div></div>
      <div class="list">${rows.map(r => `<div class="li"><span style="font-size:22px">${r.active ? '⚠️' : '✅'}</span><div class="g"><span>${esc(r.text)}</span><span class="mu xs">${ago(r.at)}${r.active ? '' : ' · ' + esc(t('исправлено, скрыто'))}</span></div>
        <button class="btn sm" data-tg="${r.id}">${r.active ? esc(t('Исправлено')) : esc(t('Вернуть'))}</button><button class="btn sm red" data-d="${r.id}">Удалить</button></div>`).join('') || '<div class="empty">Пока пусто</div>'}</div>`
    $('[data-add]', b).onclick = async () => {
      const text = $('[data-t]', b).value.trim()
      if (!text) return toast('Напиши, в чём проблема', 'err')
      try { await api('admin/issues', { text, active: true }); toast('Добавлено', 'ok'); this.issues(b) } catch (e) { toast(e.message, 'err') }
    }
    b.querySelector('.list').onclick = async e => {
      const g = e.target.closest('[data-tg]'), x = e.target.closest('[data-d]')
      if (g) { const r = rows.find(y => y.id === +g.dataset.tg); await api('admin/issues/' + r.id, { active: !r.active }, 'PUT'); this.issues(b) }
      if (x && await ask('Удалить запись?', 'Удалить', 'red')) { await api('admin/issues/' + x.dataset.d, undefined, 'DELETE'); this.issues(b) }
    }
  },

  async set(b) {
    const { cfg, groq } = await api('admin/settings')
    const G = [
      { k: 'site', l: 'Название сайта' },
      { k: 'daily', l: 'Бонус за вход, монет', t: 'num' },
      { k: 'reg', l: 'Регистрация открыта', t: 'bool' },
      { k: 'practice', l: 'Монеты за свободную тренировку', t: 'bool' },
      { k: 'shop', l: 'Магазин открыт', t: 'bool' }
    ]
    const A = [
      { k: 'on', l: 'ИИ включён', t: 'bool' },
      { k: 'chat', l: 'ИИ отвечает в чате на /ai', t: 'bool' },
      { k: 'model', l: 'Модель Groq', hint: 'можно вписать любую из console.groq.com/docs/models' },
      { k: 'day', l: 'Вопросов к ИИ в день на человека', t: 'num' }
    ]
    b.innerHTML = `<div class="grid g2">
      <div class="card"><h3>Сайт</h3><div class="form" data-g>${G.map(f => fld(f, cfg[f.k])).join('')}</div></div>
      <div class="card"><h3>ИИ (Groq) ${groq ? '<span class="tag ok">ключ есть</span>' : '<span class="tag no">нет GROQ_API_KEY</span>'}</h3><div class="form" data-a>${A.map(f => fld(f, cfg.ai[f.k])).join('')}</div>
        <div class="row mt sm">${['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].map(x => `<button class="chip" data-m="${x}">${x}</button>`).join('')}</div></div>
    </div><div class="row mt"><span class="sp"></span><button class="btn pri lg" data-s>Сохранить настройки</button></div>`
    b.onclick = async e => {
      const c = e.target.closest('[data-m]')
      if (c) $('[data-a] [data-k=model]', b).value = c.dataset.m
      if (e.target.closest('[data-s]')) {
        try {
          await api('admin/settings', { ...readF($('[data-g]', b), G), ai: readF($('[data-a]', b), A) }, 'PUT')
          toast('Настройки сохранены', 'ok')
          refresh()
        } catch (er) { toast(er.message, 'err') }
      }
    }
  }
}
