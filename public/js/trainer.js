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
  const task = !!o.task
  const cfg = Object.assign({ strict: false, indent: true, nocom: false, snd: false, chunk: 0, fs: 18 }, ls.g('tcfg', {}))
  const save = () => ls.s('tcfg', cfg)
  const opt = (k, t, tip) => `<button class="chip" data-o="${k}" title="${tip}">${t}</button>`
  root.innerHTML = `<div class="tr">
    <div class="tr-opts">
      ${opt('strict', 'Строгий режим', 'Курсор стоит, пока не нажмёшь правильную клавишу')}
      ${opt('indent', 'Автоотступы', 'После Enter отступ ставится сам')}
      ${task ? '' : opt('nocom', 'Без комментариев', 'Убирает комментарии из кода')}
      ${opt('snd', 'Звук ошибки', 'Короткий сигнал при опечатке')}
      ${task ? '' : `<select class="in" data-chunk style="width:auto;padding:6px 10px;font-size:13px">
        <option value="0">весь код</option><option value="5">по 5 строк</option><option value="10">по 10 строк</option><option value="15">по 15 строк</option><option value="25">по 25 строк</option></select>`}
      <span style="flex:1"></span>
      <button class="btn sm" data-fs="-2" title="Мельче">A−</button><button class="btn sm" data-fs="2" title="Крупнее">A+</button>
    </div>
    <div class="tr-live">
      <div class="card hi"><b data-l="w">0</b><span>WPM</span></div>
      <div class="card"><b data-l="a">100%</b><span>точность</span></div>
      <div class="card"><b data-l="t">0:00</b><span>время</span></div>
      <div class="card"><b data-l="c">0</b><span>знаков в мин</span></div>
      <div class="card"><b data-l="e">0</b><span>ошибок</span></div>
    </div>
    <div class="prog"><i></i></div>
    <div class="ed" tabindex="0">
      <div class="ed-top"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span data-fn style="margin-left:8px"></span><span style="flex:1"></span><span data-pos></span></div>
      <div class="scr"><div class="gut"></div><div class="cb"><div class="hl"></div><pre class="code"></pre><div class="car"></div></div></div>
      <div class="veil"><span>Кликни сюда и начинай печатать</span></div>
      <div class="warn"></div>
      <div class="res" hidden></div>
    </div>
    <div class="keys">
      <span><kbd>Esc</kbd> заново</span>
      ${o.onNext || !task ? '<span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> дальше</span>' : ''}
      <span><kbd>Ctrl</kbd>+<kbd>⌫</kbd> стереть слово</span>
      <span><kbd>Tab</kbd> до 4 пробелов</span>
      ${task ? '' : '<span><kbd>Ctrl</kbd>+<kbd>V</kbd> вставить свой код прямо в редактор</span>'}
    </div>
    <div class="out" hidden></div>
  </div>`

  const R = s => $(s, root)
  const wrap = R('.ed'), scr = R('.scr'), code = R('.code'), gut = R('.gut'), hlb = R('.hl'), car = R('.car'), cb = R('.cb'), res = R('.res')
  let src = '', name = '', parts = [], pi = 0
  let T = '', sp = [], st = [], au = [], he = [], pos = 0, p0 = 0, keys = 0, errs = 0, t0 = 0, tE = 0, done = false, em = {}, tk = null, last = -1, gl = -1, tyT, runP = null, dead = false

  const applyFs = () => root.style.setProperty('--fs', cfg.fs + 'px')
  const applyTheme = () => {
    wrap.className = wrap.className.replace(/\bth-\S+/g, '').trim()
    if (S.u?.theme) wrap.classList.add('th-' + S.u.theme)
  }
  applyFs(); applyTheme()

  function split(t) {
    if (task || !cfg.chunk) return [t]
    const L = t.split('\n'), r = []
    for (let i = 0; i < L.length; i += cfg.chunk) {
      const c = L.slice(i, i + cfg.chunk).join('\n').replace(/^\n+|\n+$/g, '')
      if (c.trim()) r.push(dedent(c))
    }
    return r.length ? r : [t]
  }

  function load(c, n) {
    src = c; name = n || 'code'
    parts = split(prep(c, !task && cfg.nocom)); pi = 0
    start()
  }

  function start() {
    T = parts[pi] || ''
    clearInterval(tk); tk = null
    const c = tok(T), f = document.createDocumentFragment()
    code.textContent = ''; sp = []
    for (let i = 0; i < T.length; i++) {
      const s = document.createElement('span')
      if (T[i] === '\n') { s.className = 'nl'; s.textContent = '↵'; f.append(s, '\n') }
      else { s.className = 't-' + c[i]; s.textContent = T[i]; f.append(s) }
      sp.push(s)
    }
    code.append(f)
    gut.innerHTML = Array.from({ length: T.split('\n').length }, (_, i) => '<div>' + (i + 1) + '</div>').join('')
    st = new Array(T.length).fill(0); au = new Array(T.length).fill(0); he = new Array(T.length).fill(0)
    pos = 0; keys = 0; errs = 0; t0 = 0; tE = 0; done = false; em = {}; last = -1; gl = -1; runP = null
    if (cfg.indent) while (pos < T.length && T[pos] === ' ') { st[pos] = 1; au[pos] = 1; paint(pos); pos++ }
    p0 = pos
    res.hidden = true
    scr.scrollTop = 0; scr.scrollLeft = 0
    R('[data-fn]').textContent = (name || 'code').replace(/\s+/g, '_').toLowerCase().slice(0, 40) + '.py'
    R('[data-pos]').textContent = parts.length > 1 ? `кусок ${pi + 1} из ${parts.length}` : `${pl(T.split('\n').length, 'строка', 'строки', 'строк')}`
    move(); live()
    o.onLoad?.({ pi, n: parts.length })
  }

  function paint(i) { const s = sp[i], v = st[i]; s.classList.toggle('ok', v === 1 || v === 3); s.classList.toggle('bad', v === 2); s.classList.toggle('fix', v === 3) }

  function move() {
    if (last >= 0 && sp[last]) sp[last].classList.remove('cur')
    last = -1
    const s = sp[pos]
    if (!s || done) { car.style.display = hlb.style.display = 'none'; return }
    s.classList.add('cur'); last = pos
    let ln = 0
    for (let i = 0; i < pos; i++) if (T[i] === '\n') ln++
    if (gl >= 0 && gut.children[gl]) gut.children[gl].classList.remove('on')
    gl = ln
    gut.children[ln]?.classList.add('on')
    if (!s.offsetParent) return
    const x = s.offsetLeft, y = s.offsetTop, hh = s.offsetHeight, lh = cfg.fs * 1.65
    car.style.display = hlb.style.display = 'block'
    car.style.left = (x - 1) + 'px'; car.style.top = (y + hh * .08) + 'px'; car.style.height = (hh * .84) + 'px'
    hlb.style.top = (y - (lh - hh) / 2) + 'px'; hlb.style.height = lh + 'px'
    const H = scr.clientHeight, W = scr.clientWidth, gw = gut.offsetWidth, ax = cb.offsetLeft + x
    if (y < scr.scrollTop + H * .18 || y + hh > scr.scrollTop + H * .72) scr.scrollTop = Math.max(0, y - H * .38)
    if (ax - scr.scrollLeft > W - 70) scr.scrollLeft = ax - W * .55
    else if (ax - scr.scrollLeft < gw + 12) scr.scrollLeft = Math.max(0, ax - gw - 80)
  }

  function pulse() { wrap.classList.add('ty'); clearTimeout(tyT); tyT = setTimeout(() => wrap.classList.remove('ty'), 600) }

  function calc() {
    let ok = 0
    for (let i = 0; i < pos; i++) if ((st[i] & 1) && !au[i]) ok++
    const ms = t0 ? (done ? tE : performance.now()) - t0 : 0, mn = ms / 60000
    return { ok, ms, wpm: mn > .005 ? Math.round(ok / 5 / mn) : 0, cpm: mn > .005 ? Math.round(ok / mn) : 0, acc: keys ? Math.round(Math.max(0, keys - errs) / keys * 100) : 100 }
  }

  function live() {
    const r = calc()
    R('[data-l=w]').textContent = r.wpm; R('[data-l=c]').textContent = r.cpm; R('[data-l=a]').textContent = r.acc + '%'
    R('[data-l=e]').textContent = errs; R('[data-l=t]').textContent = fmt(r.ms)
    R('.prog i').style.width = (T.length ? pos / T.length * 100 : 0) + '%'
  }

  function type(c) {
    if (done || pos >= T.length) return
    if (!t0) {
      t0 = performance.now()
      tk = setInterval(live, 250)
      if (S.u) runP = api('run/start', { task: o.taskId || null }).then(r => r.run).catch(e => { toast(e.message, 'err'); return null })
    }
    keys++; pulse()
    const e = T[pos], ok = c === e
    if (!ok) { errs++; em[e] = (em[e] || 0) + 1; he[pos] = 1; if (cfg.snd) beep() }
    if (!ok && cfg.strict) { const s = sp[pos]; s.classList.remove('miss'); void s.offsetWidth; s.classList.add('miss'); live(); return }
    st[pos] = ok ? (he[pos] ? 3 : 1) : 2; paint(pos); pos++
    if (ok && c === '\n' && cfg.indent) while (pos < T.length && T[pos] === ' ') { st[pos] = 1; au[pos] = 1; paint(pos); pos++ }
    if (pos >= T.length) return finish()
    move(); live()
  }

  function tabk() {
    if (T[pos] === ' ') { let n = 0; while (n < 4 && !done && T[pos] === ' ') { type(' '); n++ } }
    else type('\t')
  }

  function un() { pos--; st[pos] = 0; au[pos] = 0; paint(pos) }
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
    move(); live()
  }

  async function finish() {
    done = true; tE = performance.now(); clearInterval(tk); tk = null; move(); live()
    const r = calc(), left = st.filter(v => v === 2).length
    const top = Object.entries(em).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const hist = ls.g('hist', [])
    hist.push({ d: Date.now(), n: name, w: r.wpm, a: r.acc })
    ls.s('hist', hist.slice(-200))
    show(r, left, top, S.u && runP ? 'wait' : null)
    if (!S.u || !runP) return
    const run = await runP
    if (!run || dead) return show(r, left, top, null)
    try {
      const sr = await api('run/finish', { run, chars: r.ok, keys, errs, ms: Math.round(r.ms), left, emap: em })
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
    if (sr === 'wait') mid = '<p class="mu sm" style="margin-bottom:14px">Сохраняю результат...</p>'
    else if (sr?.err) mid = `<p class="sm" style="color:var(--r);margin-bottom:14px">${esc(sr.err)}</p>`
    else if (sr) {
      const rw = [sr.coins ? `<span class="c">+${sr.coins} 🪙</span>` : '', sr.xp ? `<span class="x">+${sr.xp} XP</span>` : '', sr.best ? '<span class="c">🔥 Личный рекорд</span>' : ''].join('')
      if (task) {
        mid = sr.passed
          ? `<div class="verdict ok">Задание пройдено</div><div class="bigstars">${[0, 1, 2].map(i => `<i data-s="${i}">★</i>`).join('')}</div>`
          : `<div class="verdict no">Пока не засчитано</div><p class="mu sm" style="margin-bottom:12px">${esc((sr.why || []).join(', '))}</p>`
        if (sr.cup) mid += `<div class="rew"><span class="c" style="font-size:16px">${esc(sr.cup.icon)} Кубок лиги «${esc(sr.cup.name)}»! +${sr.cup.reward} 🪙</span></div>`
      }
      mid += rw ? `<div class="rew">${rw}</div>` : ''
    } else if (!S.u) mid = '<p class="mu sm" style="margin-bottom:14px">Войди в аккаунт, чтобы сохранять прогресс и получать монеты</p>'
    res.innerHTML = `<div class="rc">
      ${task && sr && sr !== 'wait' && !sr.err ? '' : ''}
      <div class="big"><b>${W}</b><span>WPM, слов в минуту</span></div>
      <div class="rg">
        <div><b>${r.cpm}</b><span>знаков в мин</span></div>
        <div><b>${A}%</b><span>точность</span></div>
        <div><b>${fmt(r.ms)}</b><span>время</span></div>
        <div><b>${errs}</b><span>${left ? 'ошибок, ' + left + ' не испр.' : 'ошибок'}</span></div>
      </div>
      ${mid}
      ${top.length ? '<div class="wk">Спотыкался на: ' + top.map(([k, v]) => `<i>${esc(sym(k))}<sub>${v}</sub></i>`).join('') + '</div>' : '<div class="wk">Ни одной ошибки, красиво</div>'}
      <div class="ra">
        <button class="btn" data-a="again">${I.redo} Ещё раз <kbd>Esc</kbd></button>
        ${S.cfg.ai?.on ? `<button class="btn" data-a="ai">${I.spark} Объяснить код</button>` : ''}
        <button class="btn" data-a="run">${I.play} Запустить</button>
        ${o.onNext || !task || pi < parts.length - 1 ? `<button class="btn pri" data-a="next">Дальше <kbd>Enter</kbd></button>` : ''}
        ${!S.u ? '<button class="btn pri" data-act="auth">Войти</button>' : ''}
      </div></div>`
    res.hidden = false
    if (sr && sr.passed && sr.stars) $$('.bigstars i', res).forEach((s, i) => setTimeout(() => s.classList.toggle('on', i < sr.stars), 250 + i * 280))
  }

  function next() {
    if (pi < parts.length - 1) { pi++; start(); wrap.focus(); return }
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

  wrap.addEventListener('keydown', e => {
    const k = e.key
    if (e.target !== wrap) return
    if (done) {
      if (k === 'Enter' && (o.onNext || !task || pi < parts.length - 1)) { e.preventDefault(); next() }
      else if (k === 'Escape') { e.preventDefault(); start() }
      return
    }
    if (k === 'Escape') { e.preventDefault(); start(); return }
    if (k === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); next(); return }
    if (k === 'Backspace') { e.preventDefault(); back(e.ctrlKey || e.altKey || e.metaKey); return }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (k === 'Enter') { e.preventDefault(); type('\n'); return }
    if (k === 'Tab') { e.preventDefault(); tabk(); return }
    if (k.length !== 1) return
    e.preventDefault()
    if (/[а-яё]/i.test(k) && !/[а-яё]/i.test(T[pos] || '')) { warn('Русская раскладка, переключи на EN'); return }
    if (e.getModifierState?.('CapsLock') && /[a-z]/i.test(k)) warn('Включён Caps Lock')
    type(k)
  })
  wrap.addEventListener('focus', () => R('.veil').hidden = true)
  wrap.addEventListener('blur', () => R('.veil').hidden = false)
  wrap.addEventListener('paste', e => {
    if (task) { e.preventDefault(); warn('В заданиях вставка отключена'); return }
    const t = e.clipboardData?.getData('text') || ''
    if (!prep(t).trim()) return
    e.preventDefault()
    load(t, 'из буфера')
    o.onPaste?.(t)
    toast('Код вставлен, печатай', 'ok')
  })
  res.addEventListener('mousedown', e => { if (e.target.closest('[data-a]')) e.preventDefault() })
  res.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a
    if (a === 'again') { start(); wrap.focus() }
    if (a === 'next') next()
    if (a === 'run') runPy(src, R('.out'))
    if (a === 'ai') explain(src)
  })

  $$('[data-o]', root).forEach(b => {
    b.classList.toggle('on', !!cfg[b.dataset.o])
    b.onclick = () => {
      const k = b.dataset.o
      cfg[k] = !cfg[k]; b.classList.toggle('on', cfg[k]); save()
      if (k === 'nocom') load(src, name)
      else if (k !== 'snd') start()
      wrap.focus()
    }
  })
  const ch = R('[data-chunk]')
  if (ch) { ch.value = String(cfg.chunk); ch.onchange = () => { cfg.chunk = +ch.value; save(); load(src, name); wrap.focus() } }
  $$('[data-fs]', root).forEach(b => b.onclick = () => { cfg.fs = Math.min(30, Math.max(12, cfg.fs + +b.dataset.fs)); save(); applyFs(); move(); wrap.focus() })

  const onR = () => move()
  addEventListener('resize', onR)
  const offTheme = App.on('user', applyTheme)
  if (o.code != null) load(o.code, o.name)
  document.fonts?.ready.then(() => !dead && move())

  return {
    load, start,
    focus: () => wrap.focus(),
    prev() { if (pi > 0) { pi--; start(); wrap.focus() } },
    next,
    run: () => runPy(src, R('.out')),
    get src() { return src },
    destroy() { dead = true; clearInterval(tk); removeEventListener('resize', onR); offTheme() }
  }
}

async function explain(code) {
  if (!S.u) return authBox()
  if (!S.cfg.ai?.on) return toast('ИИ сейчас недоступен', 'err')
  const m = modal(`<h2>${I.spark.replace('<svg', '<svg style="width:22px;height:22px;vertical-align:-3px;color:var(--y)"')} Разбор кода</h2><div class="bub a" style="max-width:100%;margin-top:14px" data-b><span class="typing"><span></span><span></span><span></span></span></div>`, { wide: true })
  try {
    const r = await api('ai', { mode: 'explain', code })
    S.ai_left = r.left
    $('[data-b]', m.el).innerHTML = md(r.text)
  } catch (e) {
    $('[data-b]', m.el).innerHTML = `<span style="color:var(--r)">${esc(e.message)}</span>`
  }
}
