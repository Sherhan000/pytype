const KW = new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' '))
const BI = new Set('print len range int str float list dict set tuple bool sum min max abs sorted enumerate zip map filter open input isinstance type super any all round reversed iter next repr hash id format getattr setattr hasattr object Exception ValueError TypeError KeyError IndexError ZeroDivisionError'.split(' '))
const RX = /(#[^\n]*)|((?:\b[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(@[A-Za-z_][\w.]*)|(\b0[xX][\da-fA-F_]+|\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?)|([A-Za-z_]\w*)|([^\s\w])/g

function tok(t) {
  const c = new Array(t.length).fill('p'), rx = new RegExp(RX.source, 'g')
  let m, prev = ''
  while ((m = rx.exec(t))) {
    const i = m.index, L = m[0].length
    let k = 'p'
    if (m[1]) k = 'cm'
    else if (m[2]) k = 's'
    else if (m[3]) k = 'dec'
    else if (m[4]) k = 'n'
    else if (m[5]) {
      const w = m[5]
      if (w === 'True' || w === 'False' || w === 'None') k = 'cn'
      else if (KW.has(w)) k = 'k'
      else if (prev === 'def' || prev === 'class') k = 'fn'
      else if (w === 'self' || w === 'cls') k = 'sf'
      else if (BI.has(w)) k = 'b'
      else if (t[i + L] === '(') k = 'call'
    } else if (m[6]) k = 'op'
    prev = m[5] || ''
    for (let j = i; j < i + L; j++) c[j] = k
  }
  return c
}

function hlHtml(t) {
  const c = tok(t)
  let s = '', i = 0
  while (i < t.length) { let j = i; while (j < t.length && c[j] === c[i]) j++; s += `<span class="t-${c[i]}">${esc(t.slice(i, j))}</span>`; i = j }
  return s
}

function prep(raw, nocom) {
  let t = String(raw || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ')
  if (nocom) {
    t = t.replace(new RegExp(RX.source, 'g'), (m, cm) => cm ? '\u0000' : m)
    t = t.split('\n').filter(l => !(l.includes('\u0000') && !l.replace(/\u0000/g, '').trim())).map(l => l.replace(/\u0000/g, '')).join('\n')
  }
  return t.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')
}

function dedent(t) {
  const L = t.split('\n'), m = Math.min(...L.filter(l => l.trim()).map(l => l.match(/^ */)[0].length))
  return isFinite(m) && m ? L.map(l => l.slice(m)).join('\n') : t
}

let pyP = null
function getPy() {
  if (!pyP) pyP = new Promise((ok, no) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
    s.onload = () => loadPyodide().then(ok, no)
    s.onerror = () => no(new Error('Не получилось загрузить Python, проверь интернет'))
    document.head.append(s)
  }).catch(e => { pyP = null; throw e })
  return pyP
}

async function runPy(code, box) {
  box.hidden = false
  box.innerHTML = `<div class="h"><span>Вывод</span><span class="mt0" data-m></span><span class="sp" style="flex:1"></span><button class="btn sm" data-c>Закрыть</button></div><pre>Загружаю Python в браузер. Первый раз это 5-15 секунд, потом мгновенно</pre>`
  $('[data-c]', box).onclick = () => { box.hidden = true }
  const o = $('pre', box), m = $('[data-m]', box)
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  let buf = ''
  try {
    const P = await getPy()
    P.setStdout({ batched: s => buf += s + '\n' })
    P.setStderr({ batched: s => buf += s + '\n' })
    o.textContent = 'Выполняю...'
    const g = P.globals.get('dict')()
    g.set('__name__', '__main__')
    const t = performance.now()
    await P.runPythonAsync(String(code).replace(/\r/g, ''), { globals: g })
    m.textContent = Math.round(performance.now() - t) + ' мс'
    o.textContent = buf || '(код ничего не вывел)'
  } catch (e) {
    let s = String(e?.message || e)
    const i = s.indexOf('File "<exec>"')
    if (i >= 0) s = 'Traceback:\n  ' + s.slice(i)
    o.className = 'err'
    o.textContent = (buf + s).trim()
    m.textContent = 'ошибка'
  }
}

function Trainer(root, o = {}) {
  const task = !!o.task, duel = !!o.duel, mini = !!o.mini, free = !task && !duel && !mini
  const touch = matchMedia('(pointer:coarse)').matches
  const cfg = Object.assign({ strict: false, indent: true, nocom: false, snd: false, exp: true, chunk: 0, view: 'all', time: 0, fs: innerWidth < 600 ? 14 : 18 }, ls.g('tcfg', {}))
  if (duel || mini) { cfg.chunk = 0; cfg.nocom = false; cfg.strict = false; cfg.view = 'all'; cfg.exp = false }
  if (!free) cfg.time = 0
  const save = () => { if (!duel && !mini) ls.s('tcfg', cfg) }
  const SYM = ['Tab', '(', ')', ':', '"', "'", '[', ']', '{', '}', '=', '_', '.', ',', '#', '+', '-', '*', '/', '<', '>', '%', '!', '⌫']
  const VW = { all: 'Весь код', line: 'По строкам', word: 'По словам' }, TMS = [0, 30, 60, 120, 180, 300]
  const tml = s => s ? (s < 60 ? s + ' ' + t('сек') : s / 60 + ' ' + t('мин')) : t('Таймер')
  root.innerHTML = `<div class="tr">
    ${mini ? '' : `<div class="tr-tools">
      ${duel ? '' : `<button class="tool" data-tv title="Как показывать код">👁 <span></span></button>`}
      ${free ? `<button class="tool" data-tt title="Печать на время">⏱ <span></span></button>` : ''}
      ${duel ? '' : `<button class="tool" data-te title="Пояснения к строкам во время печати">💬 <span>Пояснения</span></button>`}
      <span class="sp"></span>
      <button class="tool ic" data-ts title="Настройки">${I.gear || '⚙'}</button>
    </div>`}
    <div class="ed">
      <textarea class="ki" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Ввод кода"></textarea>
      <div class="ed-top"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span data-fn class="fn"></span><span style="flex:1"></span><span data-pos></span></div>
      <div class="exl" hidden><span class="exn"></span><span class="ext"></span><span class="exs"></span></div>
      <div class="scr"><div class="gut"></div><div class="cb"><div class="hl"></div><pre class="code"></pre><div class="car"></div></div></div>
      <div class="ed-st">
        <div class="prog"><i></i><b class="gh" hidden></b></div>
        ${mini ? '' : `<span class="st w"><b data-l="w">0</b> сл/мин</span><span class="st"><b data-l="a">100%</b></span><span class="st tm"><b data-l="t">${free && cfg.time ? fmt(cfg.time * 1000) : '0:00'}</b> <span data-tl>${free && cfg.time ? 'осталось' : ''}</span></span><span class="st e hide-m"><b data-l="e">0</b> ошибок</span><span class="st hide-m"><b data-l="c">0</b> зн/мин</span><span class="sp"></span><span class="st lc hide-m" data-lc></span>`}
      </div>
      <div class="veil"><span>${touch ? 'Нажми, чтобы печатать' : 'Кликни и начинай печатать'}</span></div>
      <div class="warn"></div>
      <div class="res" hidden></div>
    </div>
    <div class="symbar">${SYM.map(c => `<button data-k="${esc(c)}">${c === 'Tab' ? '⇥' : esc(c)}</button>`).join('')}</div>
    ${mini ? '' : `<div class="keys">
      <span><kbd>Esc</kbd> заново</span>
      ${duel ? '' : '<span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> дальше</span>'}
      <span><kbd>Ctrl</kbd> + <kbd>⌫</kbd> стереть слово</span>
      <span><kbd>Tab</kbd> до 4 пробелов</span>
      ${free ? '<span><kbd>Ctrl</kbd> + <kbd>V</kbd> вставить свой код</span>' : ''}
    </div>`}
    <div class="out" hidden></div>
  </div>`

  const R = s => $(s, root)
  const wrap = R('.ed'), ki = R('.ki'), scr = R('.scr'), code = R('.code'), gut = R('.gut'), hlb = R('.hl'), car = R('.car'), cb = R('.cb'), res = R('.res')
  let src = '', name = '', parts = [], pi = 0
  let T = '', sp = [], st = [], au = [], he = [], pos = 0, p0 = 0, keys = 0, errs = 0, t0 = 0, tE = 0, done = false, em = {}, tk = null, last = -1, gl = -1, tyT, runP = null, dead = false, lastProg = 0
  let rec = [], gh = null, ghEl = null, ghRaf = 0, V = 0, LN = new Int32Array(1), okN = 0, liveQ = 0
  const timed = () => free && cfg.time > 0
  const typable = c => c === '\n' || (c >= ' ' && c <= '~') || (c >= '\u00c0' && c <= '\u052f')
  const gbar = R('.prog .gh'), lcEl = R('[data-lc]')
  const SENT = '  '

  const applyFs = () => root.style.setProperty('--fs', cfg.fs + 'px')
  const applyTheme = () => {
    wrap.className = wrap.className.replace(/\bth-\S+/g, '').trim()
    if (S.u?.theme) wrap.classList.add('th-' + S.u.theme)
  }
  applyFs(); applyTheme()

  function split(t) {
    if (!free || !cfg.chunk) return [t]
    const L = t.split('\n'), r = []
    for (let i = 0; i < L.length; i += cfg.chunk) {
      const c = L.slice(i, i + cfg.chunk).join('\n').replace(/^\n+|\n+$/g, '')
      if (c.trim()) r.push(dedent(c))
    }
    return r.length ? r : [t]
  }

  function load(c, n) {
    src = c; name = n || 'code'
    const t = prep(c, free && cfg.nocom)
    if (timed()) {
      let s2 = t
      while (s2.length < cfg.time * 20) s2 += '\n\n' + prep(o.more?.() || c, cfg.nocom)
      parts = [s2]
    } else parts = split(t)
    pi = 0
    start()
  }

  function skip() { while (pos < T.length && !typable(T[pos])) { st[pos] = 1; au[pos] = 1; paint(pos); pos++ } }

  function vb() {
    if (cfg.view === 'line') { const i = T.indexOf('\n', pos); return i < 0 ? T.length : i + 1 }
    if (cfg.view === 'word') {
      let k = pos, w = 0
      while (k < T.length && w < 2) { while (k < T.length && /\s/.test(T[k])) k++; while (k < T.length && !/\s/.test(T[k])) k++; w++ }
      return k
    }
    return T.length
  }

  function reveal() {
    const b = vb()
    if (b > V) for (let i = V; i < b; i++) sp[i].classList.remove('hid')
    else for (let i = b; i < V; i++) sp[i].classList.add('hid')
    V = b
  }

  function start() {
    T = parts[pi] || ''
    clearInterval(tk); tk = null
    const c = tok(T), f = document.createDocumentFragment()
    code.textContent = ''; sp = []; LN = new Int32Array(T.length + 1)
    let row = document.createElement('div'), ln = 0
    for (let i = 0; i < T.length; i++) {
      const s = document.createElement('span')
      LN[i] = ln
      if (T[i] === '\n') { s.className = 'nl'; s.textContent = '↵'; row.append(s); f.append(row); row = document.createElement('div'); ln++ }
      else { s.className = 't-' + c[i]; s.textContent = T[i]; row.append(s) }
      sp.push(s)
    }
    LN[T.length] = ln
    f.append(row)
    code.append(f)
    gut.innerHTML = Array.from({ length: T.split('\n').length }, (_, i) => '<div>' + (i + 1) + '</div>').join('')
    st = new Array(T.length).fill(0); au = new Array(T.length).fill(0); he = new Array(T.length).fill(0)
    pos = 0; keys = 0; errs = 0; t0 = 0; tE = 0; done = false; em = {}; last = -1; gl = -1; runP = null; rec = []; okN = 0
    cancelAnimationFrame(ghRaf)
    if (cfg.indent) while (pos < T.length && T[pos] === ' ') { st[pos] = 1; au[pos] = 1; paint(pos); pos++ }
    skip()
    p0 = pos
    V = T.length
    res.hidden = true
    wrap.classList.remove('showres')
    scr.scrollTop = 0; scr.scrollLeft = 0
    const nm = (name || 'code').replace(/\s+/g, '_').slice(0, 40)
    R('[data-fn]').textContent = /\.\w{1,6}$/.test(nm) ? nm : nm.toLowerCase() + '.py'
    R('[data-pos]').textContent = timed() ? '⏱ ' + fmt(cfg.time * 1000) : parts.length > 1 ? t('кусок {0} из {1}', pi + 1, parts.length) : pl(T.split('\n').length, 'строка', 'строки', 'строк')
    if (!mini) R('[data-tl]').textContent = timed() ? t('осталось') : ''
    exL = -1
    move(); live(); ghostDraw(); exFetch()
    o.onLoad?.({ pi, n: parts.length })
  }

  function mark() { if (o.taskId && t0) rec.push([performance.now() - t0, pos]) }

  function tline(total) {
    let step = 200
    if (total / step > 3000) step = Math.ceil(total / 3000 / 100) * 100
    const n = Math.floor(total / step) + 1, tl = []
    let j = 0, p = p0
    for (let k = 0; k < n; k++) {
      const tt = k * step
      while (j < rec.length && rec[j][0] <= tt) p = rec[j++][1]
      tl.push(p)
    }
    tl.push(T.length)
    return { tl, step }
  }

  function ghostPos() {
    if (!gh) return 0
    const ms = t0 ? (done ? tE : performance.now()) - t0 : 0
    const i = Math.min(Math.floor(ms / gh.step), gh.tl.length - 1)
    return Math.max(0, Math.min(T.length, gh.tl[i] | 0))
  }

  function ghostDraw() {
    if (!gh || !ghEl) return
    const p = ghostPos(), s = sp[Math.min(p, sp.length - 1)]
    if (!s || !s.offsetParent) return
    let x = s.offsetLeft
    if (p >= T.length) x += s.offsetWidth
    ghEl.style.display = 'block'
    ghEl.style.left = (x - 1) + 'px'; ghEl.style.top = (s.offsetTop + s.offsetHeight * .08) + 'px'; ghEl.style.height = (s.offsetHeight * .84) + 'px'
    gbar.hidden = false
    gbar.style.left = (T.length ? p / T.length * 100 : 0) + '%'
  }

  function ghostLoop() { ghostDraw(); if (gh && t0 && !done && !dead) ghRaf = requestAnimationFrame(ghostLoop) }

  function setGhost(g) {
    gh = g && Array.isArray(g.tl) && g.tl.length > 1 ? g : null
    ghEl?.remove(); ghEl = null
    gbar.hidden = true
    if (gh) {
      ghEl = h('<div class="car ghost"></div>')
      ghEl.dataset.n = '👻 ' + (gh.me ? t('мой рекорд') : gh.name) + ' · ' + gh.wpm
      cb.append(ghEl)
    }
    start()
  }

  function paint(i) { const s = sp[i], v = st[i]; s.classList.toggle('ok', v === 1 || v === 3); s.classList.toggle('bad', v === 2); s.classList.toggle('fix', v === 3) }

  function move() {
    reveal()
    if (last >= 0 && sp[last]) sp[last].classList.remove('cur')
    last = -1
    const s = sp[pos]
    if (!s || done) { car.style.display = hlb.style.display = 'none'; return }
    s.classList.add('cur'); last = pos
    const ln = LN[pos]
    if (gl >= 0 && gut.children[gl]) gut.children[gl].classList.remove('on')
    gl = ln
    gut.children[ln]?.classList.add('on')
    exShow()
    if (lcEl) { let c = pos; while (c > 0 && T[c - 1] !== '\n') c--; lcEl.textContent = t('Стр {0}, кол {1}', ln + 1, pos - c + 1) }
    if (!s.offsetParent) return
    const x = s.offsetLeft, y = s.offsetTop, hh = s.offsetHeight, lh = cfg.fs * 1.65
    car.style.display = hlb.style.display = 'block'
    car.style.left = (x - 1) + 'px'; car.style.top = (y + hh * .08) + 'px'; car.style.height = (hh * .84) + 'px'
    hlb.style.top = (y - (lh - hh) / 2) + 'px'; hlb.style.height = lh + 'px'
    const H = scr.clientHeight, W = scr.clientWidth, gw = gut.offsetWidth, ax = cb.offsetLeft + x
    if (y < scr.scrollTop + H * .18 || y + hh > scr.scrollTop + H * .72) scr.scrollTop = Math.max(0, y - H * .38)
    if (ax - scr.scrollLeft > W - 60) scr.scrollLeft = ax - W * .55
    else if (ax - scr.scrollLeft < gw + 12) scr.scrollLeft = Math.max(0, ax - gw - 60)
  }

  function pulse() { wrap.classList.add('ty'); clearTimeout(tyT); tyT = setTimeout(() => wrap.classList.remove('ty'), 600) }

  function calc() {
    const ok = okN
    const ms = t0 ? (done ? tE : performance.now()) - t0 : 0, mn = ms / 60000
    return { ok, ms, wpm: mn > .005 ? Math.round(ok / 5 / mn) : 0, cpm: mn > .005 ? Math.round(ok / mn) : 0, acc: keys ? Math.round(Math.max(0, keys - errs) / keys * 100) : 100 }
  }

  function live() {
    const r = calc()
    if (!mini) {
      R('[data-l=w]').textContent = r.wpm; R('[data-l=c]').textContent = r.cpm; R('[data-l=a]').textContent = r.acc + '%'
      R('[data-l=e]').textContent = errs; R('[data-l=t]').textContent = timed() ? fmt(Math.max(0, cfg.time * 1000 - r.ms) + 999) : fmt(r.ms)
    }
    R('.prog i').style.width = (timed() ? Math.min(1, r.ms / cfg.time / 1000) : T.length ? pos / T.length : 0) * 100 + '%'
    if (timed() && t0 && !done && r.ms >= cfg.time * 1000) finish()
    if (duel && o.onProg && performance.now() - lastProg > 220) { lastProg = performance.now(); o.onProg(T.length ? pos / T.length : 0, r.wpm) }
  }

  function type(c) {
    if (done || pos >= T.length) return
    if (duel && o.startAt && Date.now() < o.startAt()) return
    if (!t0) {
      t0 = performance.now()
      tk = setInterval(live, 250)
      if (S.u && !duel && !mini) runP = api('run/start', { task: o.taskId || null, tourn: o.tourn ? 1 : undefined }).then(r => r.run).catch(e => { toast(e.message, 'err'); return null })
      if (gh) ghRaf = requestAnimationFrame(ghostLoop)
    }
    keys++; pulse()
    const e = T[pos], ok = c === e
    if (!ok) { errs++; em[e] = (em[e] || 0) + 1; he[pos] = 1; if (cfg.snd) beep(); if (navigator.vibrate && touch) navigator.vibrate(18) }
    if (!ok && cfg.strict) { const s = sp[pos]; s.classList.remove('miss'); void s.offsetWidth; s.classList.add('miss'); live(); return }
    st[pos] = ok ? (he[pos] ? 3 : 1) : 2; paint(pos)
    if (ok) okN++
    pos++
    if (ok && c === '\n' && cfg.indent) while (pos < T.length && T[pos] === ' ') { st[pos] = 1; au[pos] = 1; paint(pos); pos++ }
    skip()
    mark()
    if (pos >= T.length) return finish()
    move(); liveSoon()
  }

  function liveSoon() { if (!liveQ) liveQ = requestAnimationFrame(() => { liveQ = 0; live() }) }

  function tabk() {
    if (T[pos] === ' ') { let n = 0; while (n < 4 && !done && T[pos] === ' ') { type(' '); n++ } }
    else type('\t')
  }

  function un() { pos--; if ((st[pos] & 1) && !au[pos]) okN--; st[pos] = 0; au[pos] = 0; paint(pos) }
  function back(w) {
    if (cfg.strict || done || pos <= p0) return
    pulse()
    if (w) {
      const a = pos
      while (pos > p0 && au[pos - 1]) un()
      while (pos > p0 && T[pos - 1] === ' ') un()
      while (pos > p0 && /\w/.test(T[pos - 1]) && !au[pos - 1]) un()
      if (pos === a) un()
    } else {
      while (pos > p0 && au[pos - 1]) un()
      if (pos > p0) un()
    }
    mark()
    move(); liveSoon()
  }

  async function finish() {
    if (done) return
    const left = st.filter(v => v === 2).length
    if (duel && left) { warn('Исправь ошибки, чтобы финишировать'); pos = T.length; return }
    done = true; tE = performance.now(); if (timed()) tE = Math.min(tE, t0 + cfg.time * 1000); clearInterval(tk); tk = null; cancelAnimationFrame(ghRaf); move(); live(); ghostDraw()
    const r = calc()
    if (timed()) r.ms = Math.min(r.ms, cfg.time * 1000)
    const top = Object.entries(em).sort((a, b) => b[1] - a[1]).slice(0, 6)
    if (duel) { o.onProg?.(1, r.wpm); o.onDone?.({ chars: r.ok, keys, errs, left, ms: Math.round(r.ms), wpm: r.wpm, acc: r.acc }); return }
    if (mini) { res.innerHTML = `<div class="rc"><div class="big"><b>${r.wpm}</b><span>слов в минуту, точность ${r.acc}%</span></div><div class="ra"><button class="btn pri" data-a="again">Ещё раз</button></div></div>`; res.hidden = false; return }
    const hist = ls.g('hist', [])
    hist.push({ d: Date.now(), n: name, w: r.wpm, a: r.acc })
    ls.s('hist', hist.slice(-200))
    show(r, left, top, S.u && runP ? 'wait' : null)
    if (!S.u || !runP) return
    const run = await runP
    if (!run || dead) return show(r, left, top, null)
    try {
      const tl = o.taskId && !left ? tline(r.ms) : {}
      const sr = await api('run/finish', { run, chars: r.ok, keys, errs, ms: Math.round(r.ms), left, emap: em, ...tl })
      if (dead) return
      show(r, left, top, sr)
      gain(sr)
      if (sr.cup || (task && sr.passed && sr.stars === 3) || (sr.best && r.ok > 60)) confetti()
      o.onResult?.(sr)
    } catch (e) {
      show(r, left, top, { err: e.message })
    }
  }

  function show(r, left, top, sr) {
    const W = sr && sr.wpm != null ? sr.wpm : r.wpm, A = sr && sr.acc != null ? sr.acc : r.acc
    let mid = ''
    if (sr === 'wait') mid = '<p style="color:#a4a9d8;margin-bottom:14px">Сохраняю результат...</p>'
    else if (sr?.err) mid = `<p style="color:#ff8f8f;margin-bottom:14px">${esc(sr.err)}</p>`
    else if (sr) {
      if (o.tourn) {
        mid = sr.passed && sr.tourn
          ? `<div class="verdict ok">Засчитано в турнир</div><p style="color:#a4a9d8;margin-bottom:12px">${esc(t('Твой лучший результат {0} сл/мин, {1} место из {2}', sr.tourn.best, sr.tourn.place, sr.tourn.total))}</p>`
          : `<div class="verdict no">Пока не засчитано</div><p style="color:#a4a9d8;margin-bottom:12px">${esc((sr.why || []).map(x => t(x)).join(', '))}</p>`
      } else if (task) {
        mid = sr.passed
          ? `<div class="verdict ok">Задание пройдено</div><div class="bigstars">${[0, 1, 2].map(i => `<i>★</i>`).join('')}</div>`
          : `<div class="verdict no">Пока не засчитано</div><p style="color:#a4a9d8;margin-bottom:12px">${esc((sr.why || []).map(x => t(x)).join(', '))}</p>`
        if (sr.cup) mid += `<div class="rew"><span class="c">${esc(sr.cup.icon)} Кубок лиги «${esc(sr.cup.name)}», +${sr.cup.reward} 🪙</span></div>`
        if (sr.beat != null) mid += `<p style="color:var(--g);font-weight:700;margin-bottom:12px">${esc(t('Быстрее, чем {0}% игроков на этом задании', sr.beat))}</p>`
      }
      const rw = [sr.coins ? `<span class="c">+${sr.coins} 🪙</span>` : '', sr.xp ? `<span class="x">+${sr.xp} XP</span>` : '', sr.best ? '<span class="c">🔥 Личный рекорд</span>' : '', ...(sr.ach || []).map(a => `<span class="a">${esc(a.i)} ${esc(t(a.t))}</span>`)].join('')
      mid += rw ? `<div class="rew">${rw}</div>` : ''
    } else if (!S.u) mid = '<p style="color:#a4a9d8;margin-bottom:14px">Войди, чтобы сохранять прогресс и получать монеты</p>'
    if (gh && sr !== 'wait') {
      const d = (r.ms - gh.ms) / 1000
      mid += `<p style="color:${d <= 0 ? 'var(--g)' : '#a4a9d8'};font-weight:700;margin-bottom:12px">${esc(d <= 0 ? t('👻 Ты обогнал призрака на {0} с', (-d).toFixed(1)) : t('👻 Призрак быстрее на {0} с', d.toFixed(1)))}</p>`
    }
    const nx = o.onNext || free || pi < parts.length - 1
    res.innerHTML = `<div class="rc">
      <div class="big"><b>${W}</b><span>слов в минуту</span></div>
      <div class="rg">
        <div><b>${r.cpm}</b><span>знаков в мин</span></div>
        <div><b>${A}%</b><span>точность</span></div>
        <div><b>${fmt(r.ms)}</b><span>время</span></div>
        <div><b>${errs}</b><span>${left ? 'ошибок, ' + left + ' не испр.' : 'ошибок'}</span></div>
      </div>
      ${mid}
      ${top.length ? '<div class="wk">Спотыкался на ' + top.map(([k, v]) => `<i>${esc(sym(k))}<sub>${v}</sub></i>`).join('') + '</div>' : '<div class="wk">Ни одной ошибки</div>'}
      <div class="ra">
        <button class="btn" data-a="again">${I.redo} Ещё раз</button>
        ${S.cfg.ai?.on ? `<button class="btn v" data-a="ai">${I.spark} Разбор</button>` : ''}
        <button class="btn b" data-a="run">${I.play} Запустить</button>
        ${nx ? `<button class="btn pri" data-a="next">Дальше</button>` : ''}
        ${!S.u ? '<button class="btn pri" data-act="auth">Войти</button>' : ''}
      </div></div>`
    res.hidden = false
    wrap.classList.add('showres')
    if (sr && sr.passed && sr.stars) $$('.bigstars i', res).forEach((s, i) => setTimeout(() => s.classList.toggle('on', i < sr.stars), 250 + i * 300))
  }

  function next() {
    if (pi < parts.length - 1) { pi++; start(); focus(); return }
    if (o.onNext) return o.onNext()
    pi = 0; start()
  }

  let ac
  function beep() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)()
      const os = ac.createOscillator(), g = ac.createGain()
      os.type = 'square'; os.frequency.value = 170; g.gain.value = .035
      os.connect(g); g.connect(ac.destination); os.start()
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .08); os.stop(ac.currentTime + .09)
    } catch (e) {}
  }

  function warn(m) { const w = R('.warn'); w.textContent = m; w.classList.add('on'); clearTimeout(w._t); w._t = setTimeout(() => w.classList.remove('on'), 1700) }
  function focus() { ki.focus({ preventScroll: true }) }
  const resetKi = () => { ki.value = SENT; try { ki.setSelectionRange(SENT.length, SENT.length) } catch (e) {} }

  ki.addEventListener('keydown', e => {
    const k = e.key
    if (done) {
      if (k === 'Enter' && !duel && (o.onNext || free || pi < parts.length - 1)) { e.preventDefault(); next() }
      else if (k === 'Escape' && !duel) { e.preventDefault(); start() }
      return
    }
    if (k === 'Escape') { e.preventDefault(); if (!duel) start(); return }
    if (k === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!duel) next(); return }
    if (k === 'Backspace') { e.preventDefault(); back(e.ctrlKey || e.altKey || e.metaKey); return }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (k === 'Enter') { e.preventDefault(); type('\n'); return }
    if (k === 'Tab') { e.preventDefault(); tabk(); return }
    if (!k || k.length !== 1) return
    e.preventDefault()
    if (/[а-яё]/i.test(k) && !/[а-яё]/i.test(T[pos] || '')) { warn('Русская раскладка, переключи на EN'); return }
    if (e.getModifierState?.('CapsLock') && /[a-z]/i.test(k)) warn('Включён Caps Lock')
    type(k)
  })
  ki.addEventListener('input', () => {
    const v = ki.value
    if (v.length < SENT.length) back(false)
    else {
      const add = v.startsWith(SENT) ? v.slice(SENT.length) : v.replace(/ /g, '')
      for (const ch of add) {
        if (done) break
        if (ch === '\n') type('\n')
        else if (/[а-яё]/i.test(ch) && !/[а-яё]/i.test(T[pos] || '')) warn('Русская раскладка, переключи на EN')
        else type(ch)
      }
    }
    resetKi()
  })
  resetKi()
  ki.addEventListener('focus', () => { R('.veil').hidden = true; wrap.classList.add('focus'); if (touch && !mini) document.body.classList.add('kbd-open'); resetKi() })
  ki.addEventListener('blur', () => { R('.veil').hidden = false; wrap.classList.remove('focus'); document.body.classList.remove('kbd-open') })
  wrap.addEventListener('mousedown', e => { if (!e.target.closest('.res button')) { e.preventDefault(); focus() } })
  wrap.addEventListener('click', e => { if (!e.target.closest('.res button')) focus() })
  ki.addEventListener('paste', e => {
    if (!free) { e.preventDefault(); warn('Здесь вставка отключена'); return }
    const t = e.clipboardData?.getData('text') || ''
    if (!prep(t).trim()) return
    e.preventDefault()
    load(t, 'из буфера')
    o.onPaste?.(t)
    toast('Код вставлен, печатай', 'ok')
  })
  R('.symbar').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-k]')
    if (!b) return
    e.preventDefault()
    const k = b.dataset.k
    if (k === 'Tab') tabk()
    else if (k === '⌫') back(false)
    else type(k)
    focus()
  })
  res.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a
    if (a === 'again') { start(); focus() }
    if (a === 'next') next()
    if (a === 'run') runPy(src, R('.out'))
    if (a === 'ai') explain(src)
  })

  function tools() {
    const v = R('[data-tv] span'), tt = R('[data-tt] span'), te = R('[data-te]')
    if (v) v.textContent = t(VW[cfg.view] || VW.all)
    if (tt) { tt.textContent = tml(cfg.time); R('[data-tt]').classList.toggle('on', !!cfg.time) }
    if (te) te.classList.toggle('on', !!cfg.exp)
    R('[data-tv]')?.classList.toggle('on', cfg.view !== 'all')
  }
  tools()
  R('[data-tv]')?.addEventListener('click', () => { const k = Object.keys(VW); cfg.view = k[(k.indexOf(cfg.view) + 1) % k.length]; save(); tools(); start(); focus() })
  R('[data-tt]')?.addEventListener('click', () => { cfg.time = TMS[(TMS.indexOf(cfg.time) + 1) % TMS.length]; save(); tools(); load(src, name); focus() })
  R('[data-te]')?.addEventListener('click', () => { cfg.exp = !cfg.exp; save(); tools(); exFetch(); exShow(); focus() })
  R('[data-ts]')?.addEventListener('click', () => settings())

  function settings() {
    const row = (k, l, d) => `<button class="set ${cfg[k] ? 'on' : ''}" data-k="${k}"><span><b>${l}</b><small>${d}</small></span><i></i></button>`
    const m = modal(`<h2>Настройки печати</h2><div class="sets">
      ${duel ? '' : row('strict', 'Строгий режим', 'Курсор не двигается, пока не нажмёшь правильную клавишу')}
      ${row('indent', 'Автоотступы', 'После Enter отступ ставится сам')}
      ${duel ? '' : row('exp', 'Пояснения к строкам', 'Над кодом подсказка, что делает текущая строка')}
      ${free ? row('nocom', 'Без комментариев', 'Убрать из кода строки с #') : ''}
      ${row('snd', 'Звук ошибки', 'Короткий сигнал при опечатке')}
      ${free ? `<label class="set sel"><span><b>Делить длинный код</b><small>Печатать большой файл частями</small></span><select class="in" data-ch>${[0, 5, 10, 15, 25, 40].map(n => `<option value="${n}" ${cfg.chunk === n ? 'selected' : ''}>${n ? t('по {0} строк', n) : t('не делить')}</option>`).join('')}</select></label>` : ''}
      <div class="set sel"><span><b>Размер шрифта</b><small data-fz>${cfg.fs}px</small></span><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" data-z="-2">A−</button><button class="btn sm" data-z="2">A+</button></div></div>
    </div><button class="btn pri wide mt" data-x>Готово</button>`)
    m.el.addEventListener('click', e => {
      const b = e.target.closest('.set[data-k]'), z = e.target.closest('[data-z]')
      if (b) {
        const k = b.dataset.k
        cfg[k] = !cfg[k]; b.classList.toggle('on', cfg[k]); save(); tools()
        if (k === 'nocom') load(src, name)
        else if (k === 'exp') { exFetch(); exShow() }
        else if (k !== 'snd') start()
      }
      if (z) { cfg.fs = Math.min(30, Math.max(11, cfg.fs + +z.dataset.z)); save(); applyFs(); move(); $('[data-fz]', m.el).textContent = cfg.fs + 'px' }
      if (e.target.closest('[data-x]')) { m.close(); focus() }
    })
    $('[data-ch]', m.el)?.addEventListener('change', e => { cfg.chunk = +e.target.value; save(); load(src, name) })
  }

  let exAI = null, exKey = '', exL = -1
  const exBox = R('.exl')
  async function exFetch() {
    exAI = null
    if (!cfg.exp || mini || duel || !S.u || !S.cfg.ai?.on || T.split('\n').length > 150) return
    const k = LANG + ':' + T
    exKey = k
    try {
      const r = await api('lines', { code: T, lang: LANG })
      if (exKey === k && Array.isArray(r.lines)) { exAI = r.lines; exL = -1; exShow() }
    } catch (e) {}
  }
  function exShow() {
    if (!exBox) return
    exBox.hidden = !cfg.exp || mini || duel
    if (exBox.hidden) return
    const ln = LN[Math.min(pos, T.length)] || 0
    if (ln === exL) return
    exL = ln
    const L = T.split('\n')[ln] || ''
    const tx = (exAI && exAI[ln]) || explainLine(L)
    R('.exn').textContent = ln + 1
    R('.ext').textContent = tx ? '# ' + tx : ''
    R('.exs').textContent = exAI && exAI[ln] ? 'ИИ' : ''
    exBox.classList.toggle('empty', !tx)
  }

  const onR = () => { move(); ghostDraw() }
  addEventListener('resize', onR)
  const offTheme = App.on('user', applyTheme)
  if (o.code != null) load(o.code, o.name)
  document.fonts?.ready.then(() => !dead && move())

  return {
    load, start, focus, setGhost,
    get cfg() { return cfg },
    prev() { if (pi > 0) { pi--; start(); focus() } },
    next,
    run: () => runPy(src, R('.out')),
    get src() { return src },
    get done() { return done },
    destroy() { document.body.classList.remove('kbd-open'); dead = true; clearInterval(tk); cancelAnimationFrame(ghRaf); removeEventListener('resize', onR); offTheme() }
  }
}

function explainLine(raw) {
  const L = String(raw || '').trim()
  if (!L) return ''
  const cut = (x, n = 28) => { x = String(x).trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x }
  let m
  if (L.startsWith('#')) return t('Комментарий, Python его пропускает')
  if (/^if __name__ == ['"]__main__['"]:/.test(L)) return t('Код ниже запустится, только если файл запущен напрямую')
  if ((m = L.match(/^from\s+([\w.]+)\s+import\s+(.+)$/))) return t('Берём {0} из модуля {1}', cut(m[2]), m[1])
  if ((m = L.match(/^import\s+(.+)$/))) return t('Подключаем модуль {0}', cut(m[1]))
  if ((m = L.match(/^@([\w.]+)/))) return t('Декоратор {0} меняет поведение функции ниже', m[1])
  if ((m = L.match(/^(async\s+)?def\s+(\w+)\s*\((.*)\)\s*(->.*)?:/))) {
    const a = m[3].split(',').map(x => x.split(/[:=]/)[0].trim()).filter(x => x && x !== 'self' && x !== 'cls')
    if (m[2] === '__init__') return a.length ? t('Конструктор: при создании объекта принимает {0}', a.join(', ')) : t('Конструктор, вызывается при создании объекта')
    return (m[1] ? t('Асинхронная функция {0}', m[2]) : t('Объявляем функцию {0}', m[2])) + (a.length ? ', ' + t('параметры: {0}', cut(a.join(', '))) : ', ' + t('без параметров'))
  }
  if ((m = L.match(/^class\s+(\w+)\s*(?:\((.*)\))?:/))) return m[2] ? t('Создаём класс {0}, он наследует {1}', m[1], cut(m[2])) : t('Создаём класс {0}', m[1])
  if ((m = L.match(/^for\s+(.+?)\s+in\s+range\((.*)\):/))) return t('Цикл: {0} пробегает числа range({1})', m[1], cut(m[2], 20))
  if ((m = L.match(/^(async\s+)?for\s+(.+?)\s+in\s+(.+):/))) return t('Цикл: перебираем {0}, текущий элемент в {1}', cut(m[3]), m[2])
  if ((m = L.match(/^while\s+(.+):/))) return m[1].trim() === 'True' ? t('Бесконечный цикл, выйти можно через break') : t('Цикл, пока верно: {0}', cut(m[1]))
  if ((m = L.match(/^if\s+(.+):/))) return t('Проверяем условие: {0}', cut(m[1], 34))
  if ((m = L.match(/^elif\s+(.+):/))) return t('Иначе, если {0}', cut(m[1], 34))
  if (/^else\s*:/.test(L)) return t('Иначе, если условия выше не подошли')
  if (/^try\s*:/.test(L)) return t('Пробуем выполнить код, ошибки поймает except')
  if ((m = L.match(/^except\s*(\w[\w.]*)?(?:\s+as\s+(\w+))?/))) return m[1] ? t('Ловим ошибку {0}', m[1]) : t('Ловим любую ошибку')
  if (/^finally\s*:/.test(L)) return t('Этот блок выполнится в любом случае')
  if ((m = L.match(/^(async\s+)?with\s+open\((.*)\)\s+as\s+(\w+):/))) return t('Открываем файл в {0}, он закроется сам', m[3])
  if ((m = L.match(/^(async\s+)?with\s+(.+?)(?:\s+as\s+(\w+))?:/))) return t('Блок with сам закроет {0}', cut(m[2], 22))
  if ((m = L.match(/^match\s+(.+):/))) return t('Сравниваем {0} с вариантами ниже', cut(m[1]))
  if ((m = L.match(/^case\s+(.+):/))) return m[1].trim() === '_' ? t('Вариант по умолчанию') : t('Вариант: {0}', cut(m[1]))
  if ((m = L.match(/^return\s*(.*)$/))) return m[1] ? t('Возвращаем {0}', cut(m[1])) : t('Выходим из функции')
  if ((m = L.match(/^yield\s+(.*)$/))) return t('Отдаём {0} и ставим функцию на паузу', cut(m[1]))
  if (L === 'break') return t('Выходим из цикла')
  if (L === 'continue') return t('Переходим к следующему шагу цикла')
  if (L === 'pass') return t('Пустой блок, ничего не делаем')
  if ((m = L.match(/^raise\s+(\w+)/))) return t('Вызываем ошибку {0}', m[1])
  if ((m = L.match(/^assert\s+(.+)/))) return t('Проверка: если {0} ложно, будет ошибка', cut(m[1]))
  if ((m = L.match(/^(global|nonlocal)\s+(.+)/))) return t('Будем менять внешнюю переменную {0}', m[2])
  if ((m = L.match(/^(?:await\s+)?print\((.*)\)$/))) return /^f["']/.test(m[1].trim()) ? t('Выводим строку с подставленными значениями') : m[1].trim() ? t('Выводим на экран {0}', cut(m[1])) : t('Выводим пустую строку')
  if ((m = L.match(/^([\w.\[\]'"]+)\s*([+\-*/%]|\/\/|\*\*)=\s*(.+)$/))) {
    const op = { '+': 'Увеличиваем {0} на {1}', '-': 'Уменьшаем {0} на {1}', '*': 'Умножаем {0} на {1}', '/': 'Делим {0} на {1}' }[m[2]]
    return op ? t(op, m[1], cut(m[3], 20)) : t('Меняем {0} операцией {1}', m[1], m[2] + '=')
  }
  if ((m = L.match(/^([\w.]+)\.(append|extend|insert|remove|pop|sort|reverse|clear|update|add|discard)\((.*)\)$/))) {
    const D = { append: 'Добавляем {1} в конец {0}', extend: 'Дописываем в {0} всё из {1}', insert: 'Вставляем элемент в {0}', remove: 'Удаляем {1} из {0}', pop: 'Достаём элемент из {0}', sort: 'Сортируем {0}', reverse: 'Разворачиваем {0}', clear: 'Очищаем {0}', update: 'Обновляем {0} данными из {1}', add: 'Добавляем {1} в множество {0}', discard: 'Убираем {1} из множества {0}' }
    return t(D[m[2]], m[1], cut(m[3], 20))
  }
  if ((m = L.match(/^self\.(\w+)\s*=\s*(.+)$/))) return t('Сохраняем {0} в объекте', m[1])
  if ((m = L.match(/^(\w+(?:\s*,\s*\w+)+)\s*=\s*(.+)$/))) return t('Раскладываем значения по переменным {0}', m[1].replace(/\s+/g, ''))
  if ((m = L.match(/^(\w+)\s*(?::\s*[\w\[\], .|]+)?=\s*(.+)$/))) {
    const v = m[2].trim()
    if (/^\[.+\bfor\b.+\bin\b.+\]$/.test(v)) return t('Собираем список {0} через генератор', m[1])
    if (/^\{.+\bfor\b.+\bin\b.+\}$/.test(v)) return t('Собираем {0} через генератор', m[1])
    if (/^(await\s+)?input\(/.test(v)) return t('Спрашиваем ввод и кладём ответ в {0}', m[1])
    if (/^lambda\b/.test(v)) return t('{0} это короткая функция lambda', m[1])
    if (/^\[\s*\]$/.test(v)) return t('Создаём пустой список {0}', m[1])
    if (/^\{\s*\}$/.test(v)) return t('Создаём пустой словарь {0}', m[1])
    if (/^\[/.test(v)) return t('Создаём список {0}', m[1])
    if (/^\{/.test(v)) return t('Создаём словарь {0}', m[1])
    if (/^\(/.test(v) && v.includes(',')) return t('Создаём кортеж {0}', m[1])
    if (/^f?["']/.test(v)) return t('Записываем строку в {0}', m[1])
    if (/^-?\d/.test(v)) return t('Записываем число {1} в {0}', m[1], cut(v, 14))
    if (/^(True|False|None)$/.test(v)) return t('{0} получает значение {1}', m[1], v)
    if ((m[3] = v.match(/^(?:await\s+)?([A-Z]\w*)\(/))) return t('Создаём объект {1} и кладём в {0}', m[1], m[3][1])
    if ((m[3] = v.match(/^(?:await\s+)?([\w.]+)\(/))) return t('Вызываем {1} и кладём результат в {0}', m[1], m[3][1])
    return t('Записываем в {0}: {1}', m[1], cut(v, 24))
  }
  if ((m = L.match(/^await\s+([\w.]+)\(/))) return t('Ждём, пока выполнится {0}', m[1])
  if ((m = L.match(/^([\w.]+)\(/))) return t('Вызываем {0}', m[1])
  if (/^[)\]}]/.test(L)) return t('Закрываем скобку')
  return ''
}

async function explain(code) {
  if (!S.u) return authBox()
  if (!S.cfg.ai?.on) return toast('ИИ сейчас недоступен', 'err')
  const m = modal(`<h2>Разбор кода</h2><div class="bub a" style="max-width:100%;margin-top:14px" data-b><span class="typing"><span></span><span></span><span></span></span></div>`, { wide: true })
  try {
    const r = await api('ai', { mode: 'explain', code })
    S.ai_left = r.left
    $('[data-b]', m.el).innerHTML = md(r.text)
  } catch (e) {
    $('[data-b]', m.el).innerHTML = `<span style="color:var(--r)">${esc(e.message)}</span>`
  }
}
