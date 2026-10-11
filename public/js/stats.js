const KB = [
  ['`~', '1!', '2@', '3#', '4$', '5%', '6^', '7&', '8*', '9(', '0)', '-_', '=+'],
  ['qQ', 'wW', 'eE', 'rR', 'tT', 'yY', 'uU', 'iI', 'oO', 'pP', '[{', ']}', '\\|'],
  ['aA', 'sS', 'dD', 'fF', 'gG', 'hH', 'jJ', 'kK', 'lL', ';:', '\'"', '\n↵'],
  ['zZ', 'xX', 'cC', 'vV', 'bB', 'nN', 'mM', ',<', '.>', '/?'],
  ['  ']
]

const ymd = d => d.toISOString().slice(0, 10)
const dayAdd = (d, n) => new Date(d.getTime() + n * 864e5)

function drawDays(cv, days, today) {
  const W = cv.getBoundingClientRect().width, H = 220, dp = devicePixelRatio || 1
  if (!W) return
  cv.width = W * dp; cv.height = H * dp
  const x = cv.getContext('2d'); x.scale(dp, dp)
  const cs = getComputedStyle(document.body), c = v => cs.getPropertyValue(v).trim()
  const by = Object.fromEntries(days.map(d => [d.d, d]))
  const end = new Date(today + 'T00:00:00Z'), N = 30
  const pts = Array.from({ length: N }, (_, i) => { const d = ymd(dayAdd(end, i - N + 1)); return { d, ...(by[d] || {}) } })
  x.font = '600 11px Rubik, sans-serif'; x.fillStyle = c('--mu')
  if (!days.length) { x.fillText(t('За последние 30 дней заходов не было'), 8, H / 2); return }
  const pL = 30, pR = 36, pT = 10, pB = 22, mx = Math.max(20, ...days.map(v => v.best)) * 1.15, mr = Math.max(1, ...days.map(v => v.runs))
  const X = i => pL + (i + .5) * (W - pL - pR) / N, Y = (v, m) => pT + (1 - v / m) * (H - pT - pB)
  x.strokeStyle = c('--line'); x.lineWidth = 1.5
  for (let i = 0; i <= 4; i++) {
    const yy = pT + i * (H - pT - pB) / 4
    x.beginPath(); x.moveTo(pL, yy); x.lineTo(W - pR, yy); x.stroke()
    x.fillText(Math.round(mx * (1 - i / 4)), 2, yy + 4); x.fillText((100 - i * 25) + '%', W - pR + 5, yy + 4)
  }
  const bw = Math.max(2, (W - pL - pR) / N - 4)
  x.fillStyle = c('--card3')
  pts.forEach((p, i) => { if (p.runs) { const hh = p.runs / mr * (H - pT - pB) * .35; x.fillRect(X(i) - bw / 2, H - pB - hh, bw, hh) } })
  x.fillStyle = c('--mu')
  pts.forEach((p, i) => { if (i % 5 === 4 || i === N - 1) x.fillText(String(+p.d.slice(8)), X(i) - 6, H - 6) })
  const line = (k, m, col, w) => {
    x.beginPath()
    let first = true
    pts.forEach((p, i) => { if (p[k] == null) return; first ? x.moveTo(X(i), Y(p[k], m)) : x.lineTo(X(i), Y(p[k], m)); first = false })
    x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke()
  }
  line('acc', 100, c('--b'), 2.5)
  line('avg', mx, c('--y'), 3.5)
  x.fillStyle = c('--o')
  pts.forEach((p, i) => { if (p.best != null) { x.beginPath(); x.arc(X(i), Y(p.best, mx), 3.5, 0, 7); x.fill() } })
  x.fillStyle = c('--y')
  pts.forEach((p, i) => { if (p.avg != null) { x.beginPath(); x.arc(X(i), Y(p.avg, mx), 3, 0, 7); x.fill() } })
}

function calHtml(cal, today) {
  const by = Object.fromEntries(cal.map(d => [d.d, d.n]))
  const end = new Date(today + 'T00:00:00Z')
  const wd = (end.getUTCDay() + 6) % 7
  const start = dayAdd(end, -wd - 25 * 7)
  const lv = n => !n ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4
  let cols = '', mon = ''
  for (let w = 0; w < 26; w++) {
    let cells = ''
    const ws = dayAdd(start, w * 7)
    const m1 = Array.from({ length: 7 }, (_, i) => dayAdd(ws, i)).find(d => d.getUTCDate() === 1)
    mon += `<span>${m1 || w === 0 ? esc((m1 || ws).toLocaleDateString(LOC, { month: 'short', timeZone: 'UTC' })) : ''}</span>`
    for (let i = 0; i < 7; i++) {
      const d = dayAdd(ws, i), k = ymd(d)
      if (d > end) { cells += '<i class="x"></i>'; continue }
      const n = by[k] || 0
      cells += `<i class="l${lv(n)}" title="${esc(d.toLocaleDateString(LOC, { day: 'numeric', month: 'long', timeZone: 'UTC' }) + ': ' + pl(n, 'заход', 'захода', 'заходов'))}"></i>`
    }
    cols += `<div>${cells}</div>`
  }
  return `<div class="cal-w"><div class="cal-m">${mon}</div><div class="cal">${cols}</div></div>
    <div class="cal-l"><span>Меньше</span>${[0, 1, 2, 3, 4].map(l => `<i class="l${l}"></i>`).join('')}<span>Больше</span></div>`
}

function kbHtml(em) {
  const err = k => [...new Set(k)].reduce((s, ch) => s + (em[ch] || 0), 0)
  const all = KB.flat().map(err), mx = Math.max(1, ...all)
  return KB.map((row, ri) => `<div class="kr r${ri}">${row.map(k => {
    const n = err(k), p = (n / mx).toFixed(2)
    const lab = k === '  ' ? t('пробел') : k[0] === '\n' ? '↵ Enter' : /[a-z]/.test(k[0]) ? k[1] : `<sup>${esc(k[1])}</sup>${esc(k[0])}`
    return `<span class="${k === '  ' ? 'sp' : k[0] === '\n' ? 'en' : ''}" style="--p:${p}" title="${esc(sym(k[0]) + (k[1] && k[1] !== ' ' && k[1] !== '↵' ? ' ' + k[1] : '') + ': ' + n)}">${lab}${n ? `<em>${n}</em>` : ''}</span>`
  }).join('')}</div>`).join('')
}

function statsBox(el, u, own) {
  let d = null, dead = false
  el.innerHTML = '<div class="sec">Статистика</div><div class="card"><div class="empty">Загружаю...</div></div>'
  const cmp = (a, b, u) => a == null || b == null || (!a && !b) ? '' : `<em class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(a - b)}${u} ${t('к прошлой неделе')}</em>`
  function draw() {
    const w = d.wk || {}
    const act = d.cal.length
    el.innerHTML = `<div class="sec">Статистика</div>
      <div class="grid g3 stg">
        <div class="card stat y"><b>${w.w1 ?? '—'}</b><span>сл/мин в среднем за 7 дней</span>${cmp(w.w1, w.w0, '')}</div>
        <div class="card stat bl"><b>${w.a1 != null ? w.a1 + '%' : '—'}</b><span>точность за 7 дней</span>${cmp(w.a1, w.a0, '%')}</div>
        <div class="card stat g"><b>${w.r1 || 0}</b><span>заходов за 7 дней</span>${cmp(w.r1, w.r0, '')}</div>
      </div>
      <div class="card mt"><h3>Прогресс за 30 дней<span class="sp"></span><span class="xs mu" style="font-weight:600"><span style="color:var(--y)">●</span> среднее <span style="color:var(--o)">●</span> лучшее <span style="color:var(--b)">●</span> точность</span></h3><canvas class="chart" data-dc></canvas></div>
      <div class="card mt"><h3>Активность за полгода<span class="sp"></span><span class="xs mu" style="font-weight:600">${esc(t('Дней с заходами: {0}', act))}</span></h3>${calHtml(d.cal, d.today)}</div>
      ${own ? `<div class="card mt"><h3>Тепловая карта ошибок</h3><div class="kbd" data-kb>${kbHtml(u.emap || {})}</div><p class="xs mu mt">Чем краснее клавиша, тем чаще на ней ошибка. Цифра показывает число ошибок</p></div>` : ''}`
    drawDays($('[data-dc]', el), d.days, d.today)
  }
  api('u/' + encodeURIComponent(u.name) + '/stats').then(r => { if (!dead) { d = r; draw() } }).catch(() => { el.innerHTML = '' })
  const rs = () => d && !dead && drawDays($('[data-dc]', el), d.days, d.today)
  addEventListener('resize', rs)
  const ot = App.on('theme', rs)
  return () => { dead = true; removeEventListener('resize', rs); ot() }
}
