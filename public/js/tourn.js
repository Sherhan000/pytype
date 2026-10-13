App.page('tourn', {
  title: 'Турнир недели',
  wide: true,
  async render(v) {
    const d = await api('tourn')
    if (!d.t) { v.innerHTML = '<div class="card empty"><b>🏁</b>Турнир скоро начнётся. Для него нужно хотя бы одно активное задание на печать</div>'; return }
    const prize = i => d.prize[i] ?? d.part
    const lines = d.t.code.split('\n').length
    v.innerHTML = `
      <div class="tn-top mb">
        <div class="cont tn-head" style="--lc:var(--g)">
          <div class="lic">🏁</div>
          <div style="flex:1;min-width:0">
            <div class="xs mu" style="font-weight:700" data-left></div>
            <div class="t">${esc(d.t.title)}</div>
            <div class="sm mu">Один код на всех на целую неделю. В зачёт идёт твой лучший заход. Нужна точность от 85% и код без неисправленных ошибок</div>
          </div>
        </div>
        <div class="tn-k">
          <div><b data-k="n">${d.total}</b><span>участников</span></div>
          <div><b data-k="best">—</b><span>лучший, сл/мин</span></div>
          <div><b data-k="avg">—</b><span>в среднем, сл/мин</span></div>
          <div><b>${lines}</b><span>${esc(plw(lines, 'строка', 'строки', 'строк'))} ${esc(t('в коде'))}</span></div>
        </div>
      </div>
      <div data-me></div>
      <div data-tr></div>
      <div class="tn-g mt">
        <div class="card"><h3>Таблица турнира<span class="sp"></span><span class="xs mu" style="font-weight:600" data-n></span></h3><div class="lb" data-lb></div></div>
        <div class="col">
          <div class="card tn-pz"><h3>Призы</h3>
            <div><span>🥇 1 ${esc(t('место'))}</span><b>${prize(0)} 🪙</b></div>
            <div><span>🥈 2 ${esc(t('место'))}</span><b>${prize(1)} 🪙</b></div>
            <div><span>🥉 3 ${esc(t('место'))}</span><b>${prize(2)} 🪙</b></div>
            <div><span>${esc(t('4–10 место'))}</span><b>${prize(3)} 🪙</b></div>
            <div><span>${esc(t('Остальным участникам'))}</span><b>${d.part} 🪙</b></div>
            <p class="xs mu mt">Призы приходят в ночь на понедельник</p></div>
          <div class="card"><h3>Победители прошлой недели</h3>${d.prev?.top?.length ? `<div class="sm mu mb">${esc(d.prev.title)}</div><div class="lb">${d.prev.top.map((r, i) => `<a href="#/u/${encodeURIComponent(r.name)}"><span class="n">${['🥇', '🥈', '🥉'][i]}</span>${avatar(r, 38)}<div class="w">${nick(r)}<div class="sub">${r.acc}%</div></div><span class="sc">${r.wpm} <span class="xs mu">сл/мин</span></span></a>`).join('')}</div>` : '<div class="empty" style="padding:16px">Это первый турнир. Стань первым победителем</div>'}</div>
        </div>
      </div>`
    const end = Date.now() + d.ends
    const tick = () => { const e = $('[data-left]', v); if (e) e.textContent = t('Турнир недели') + ' · ' + t('до конца {0}', dur(end - Date.now())) }
    tick()
    const tm = setInterval(tick, 30000)
    function board(b) {
      $('[data-n]', v).textContent = t('Участников: {0}', b.total)
      $('[data-k="n"]', v).textContent = b.total
      $('[data-k="best"]', v).textContent = b.rows[0]?.wpm ?? '—'
      $('[data-k="avg"]', v).textContent = b.rows.length ? Math.round(b.rows.reduce((a, r) => a + r.wpm, 0) / b.rows.length) : '—'
      $('[data-lb]', v).innerHTML = b.rows.map((r, i) => `<a href="#/u/${encodeURIComponent(r.name)}" class="${r.id === S.u?.id ? 'me' : ''}"><span class="n">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>${avatar(r, 38)}
        <div class="w">${nick(r)}<div class="sub">${r.acc}% · ${fmt(r.ms)} · ${esc(t('попыток: {0}', r.tries))}</div></div>
        <span class="sc">${r.wpm} <span class="xs mu">сл/мин</span><div class="xs" style="color:var(--y);text-align:right">+${prize(i)} 🪙</div></span></a>`).join('')
        || '<div class="empty" style="padding:16px">Пока никого. Займи первое место</div>'
      const up = b.mine && b.mine.place > 1 ? b.rows[b.mine.place - 2] : null
      $('[data-me]', v).innerHTML = b.mine ? `<div class="card mb tn-me"><b class="disp">${esc(t('Ты на {0} месте из {1}', b.mine.place, b.total))}</b><span class="mu sm">${esc(t('Лучший заход {0} сл/мин, точность {1}%', b.mine.wpm, b.mine.acc))}</span>
          ${up ? `<span class="mu sm">· ${esc(t('до {0} места не хватает {1} сл/мин', b.mine.place - 1, Math.max(1, up.wpm - b.mine.wpm)))}</span>` : ''}<span class="sp"></span><span class="tag y">+${prize(b.mine.place - 1)} 🪙</span></div>`
        : S.u ? '<div class="card mb tn-me"><span class="mu">Ты ещё не участвуешь. Напечатай код ниже, и результат попадёт в таблицу</span></div>' : ''
    }
    board(d)
    const tr = Trainer($('[data-tr]', v), {
      task: true, tourn: true, code: d.t.code, name: d.t.title,
      onResult: async sr => {
        if (sr.tourn?.improved) toast(sr.tourn.first ? t('Ты в турнире! {0} место', sr.tourn.place) : t('Новый лучший результат! {0} место', sr.tourn.place), 'ok')
        try { board(await api('tourn')) } catch (e) {}
      }
    })
    if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => tr.focus(), 100)
    return () => { clearInterval(tm); tr.destroy() }
  }
})
