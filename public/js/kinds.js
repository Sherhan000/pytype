function kindAnswer(tk, answer) {
  if (!S.u) { authBox(); return Promise.resolve(null) }
  return api(`tasks/${tk.id}/answer`, { answer }).catch(e => { toast(e.message, 'err'); return null })
}

function kindDone(box, r, o) {
  const rw = [r.coins ? `<span class="c">+${r.coins} 🪙</span>` : '', r.xp ? `<span class="x">+${r.xp} XP</span>` : '',
    r.cup ? `<span class="c">${esc(r.cup.icon)} ${esc(t('Кубок лиги «{0}»', t(r.cup.name)))}</span>` : '',
    ...(r.ach || []).map(a => `<span class="a">${esc(a.i)} ${esc(t(a.t))}</span>`)].join('')
  box.innerHTML = `<div class="kres">
    <div class="verdict ok">Верно!</div>
    <div class="bigstars">${[0, 1, 2].map(() => '<i>★</i>').join('')}</div>
    ${rw ? `<div class="rew">${rw}</div>` : ''}
    ${r.explain ? `<p class="kexp">${md(r.explain)}</p>` : ''}
    <div class="row" style="justify-content:center"><button class="btn pri lg" data-nx>Дальше ${I.next}</button></div></div>`
  $$('.bigstars i', box).forEach((s, i) => setTimeout(() => s.classList.toggle('on', i < r.stars), 250 + i * 300))
  gain(r)
  if (r.stars === 3 || r.cup) confetti()
  $('[data-nx]', box).onclick = () => o.next?.()
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function kindMiss(box, r, msg) {
  box.innerHTML = `<div class="kres no"><div class="verdict no">${esc(t(msg))}</div><p class="sm mu">${esc(t('Попыток: {0}. Чем меньше попыток, тем больше звёзд', r.tries))}</p></div>`
  const c = box.closest('.card')
  c?.classList.remove('shake'); void c?.offsetWidth; c?.classList.add('shake')
}

function mix(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function tabInput(ta) {
  ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end') } })
}

App.kind('quiz', {
  render(el, tk, o) {
    const m = tk.meta || {}
    el.innerHTML = `<div class="card ktask">
      <h3>❓ ${esc(t(m.q || 'Что выведет этот код?'))}</h3>
      <pre class="qcode">${hlHtml(tk.code)}</pre>
      ${m.options ? `<div class="qopts">${mix(m.options.map((x, i) => [x, i])).map(([x, i], k) => `<button class="qopt" data-i="${i}"><b>${'ABCDEFGH'[k] || k + 1}</b><code>${esc(x)}</code></button>`).join('')}</div>`
        : `<label class="f mt">Вывод программы<textarea class="in code" rows="${m.multi ? 4 : 1}" data-a spellcheck="false" autocapitalize="off"></textarea></label>
          <div class="row mt"><button class="btn b" data-run>${I.play} Запустить и проверить себя</button><span class="sp"></span><button class="btn pri" data-go>Проверить</button></div>`}
      <div class="out" hidden data-o></div>
      <div data-r></div></div>`
    const res = $('[data-r]', el)
    let busy = false
    async function send(a, btn) {
      if (busy) return
      busy = true
      const r = await kindAnswer(tk, a)
      busy = false
      if (!r) return
      if (r.ok) {
        $$('.qopt', el).forEach(b => { b.disabled = true; if (btn && b === btn) b.classList.add('ok') })
        kindDone(res, r, o)
      } else {
        if (btn) { btn.classList.add('no'); btn.disabled = true }
        kindMiss(res, r, 'Неверно, попробуй ещё раз')
      }
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('.qopt')
      if (b && !b.disabled) send(+b.dataset.i, b)
    })
    const ta = $('[data-a]', el)
    if (ta) {
      $('[data-go]', el).onclick = () => { if (ta.value.trim()) send(ta.value) }
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !m.multi) { e.preventDefault(); $('[data-go]', el).click() } })
      $('[data-run]', el).onclick = async () => {
        if (!(await ask('Если запустить код, ответ станет виден. Всё равно запустить?', 'Запустить'))) return
        runPy(tk.code, $('[data-o]', el))
      }
    }
  }
})

App.kind('fix', {
  render(el, tk, o) {
    const m = tk.meta || {}
    const rows = Math.min(24, Math.max(6, tk.code.split('\n').length + 1))
    el.innerHTML = `<div class="card ktask">
      <h3>🔧 Найди и исправь ошибку</h3>
      <p class="sm mu mb">Отредактируй код прямо здесь. Запускай сколько угодно, проверка засчитывает только правильное исправление</p>
      <textarea class="in code qedit" rows="${rows}" spellcheck="false" autocapitalize="off" data-c>${esc(tk.code)}</textarea>
      ${m.hint ? `<details class="mt"><summary class="sm" style="cursor:pointer;font-weight:700">💡 Подсказка</summary><p class="sm mu mt">${esc(m.hint)}</p></details>` : ''}
      <div class="row mt"><button class="btn" data-rs>${I.redo} Сбросить</button><button class="btn b" data-run>${I.play} Запустить</button><span class="sp"></span><button class="btn pri" data-go>Проверить</button></div>
      <div class="out" hidden data-o></div>
      <div data-r></div></div>`
    const ta = $('[data-c]', el), res = $('[data-r]', el)
    tabInput(ta)
    $('[data-rs]', el).onclick = () => { ta.value = tk.code; ta.focus() }
    $('[data-run]', el).onclick = () => runPy(ta.value, $('[data-o]', el))
    $('[data-go]', el).onclick = async e => {
      e.target.disabled = true
      const r = await kindAnswer(tk, ta.value)
      e.target.disabled = false
      if (!r) return
      if (r.ok) { ta.readOnly = true; e.target.disabled = true; kindDone(res, r, o) }
      else kindMiss(res, r, 'Пока не то. Ошибка ещё в коде')
    }
  }
})

App.kind('fill', {
  render(el, tk, o) {
    const m = tk.meta || {}, w = m.w || []
    const parts = String(tk.code).split(/\{\{(\d+)\}\}/)
    const html = parts.map((p, i) => i % 2
      ? `<input class="blank" data-b="${+p}" style="width:${Math.max(3, (w[+p] || 4) + 1)}ch" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${esc(t('Пропуск {0}', +p + 1))}">`
      : hlHtml(p)).join('')
    el.innerHTML = `<div class="card ktask">
      <h3>✍️ Допиши пропуски</h3>
      <p class="sm mu mb">Впиши недостающие части кода. Enter переходит к следующему пропуску</p>
      <pre class="qcode fill">${html}</pre>
      ${m.hint ? `<details class="mt"><summary class="sm" style="cursor:pointer;font-weight:700">💡 Подсказка</summary><p class="sm mu mt">${esc(m.hint)}</p></details>` : ''}
      <div class="row mt"><button class="btn b" data-run>${I.play} Запустить с моими ответами</button><span class="sp"></span><button class="btn pri" data-go>Проверить</button></div>
      <div class="out" hidden data-o></div>
      <div data-r></div></div>`
    const ins = $$('.blank', el), res = $('[data-r]', el)
    const vals = () => ins.slice().sort((a, b) => a.dataset.b - b.dataset.b).map(x => x.value)
    const filled = () => parts.map((p, i) => i % 2 ? (ins.find(x => x.dataset.b === p)?.value || '') : p).join('')
    ins.forEach((x, i) => x.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (ins[i + 1]) ins[i + 1].focus()
      else $('[data-go]', el).click()
    }))
    ins.forEach(x => x.addEventListener('input', () => x.classList.remove('no')))
    $('[data-run]', el).onclick = () => runPy(filled(), $('[data-o]', el))
    $('[data-go]', el).onclick = async e => {
      if (ins.some(x => !x.value.trim())) { toast('Заполни все пропуски', 'err'); ins.find(x => !x.value.trim())?.focus(); return }
      e.target.disabled = true
      const r = await kindAnswer(tk, vals())
      e.target.disabled = false
      if (!r) return
      ins.forEach(x => x.classList.toggle('no', (r.bad || []).includes(+x.dataset.b)))
      if (r.ok) { ins.forEach(x => { x.readOnly = true; x.classList.add('ok') }); e.target.disabled = true; kindDone(res, r, o) }
      else kindMiss(res, r, t('Неверных пропусков: {0}', (r.bad || []).length))
    }
    if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => ins[0]?.focus(), 100)
  }
})
