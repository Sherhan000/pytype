App.page('duel', {
  title: 'Дуэли',
  wide: true,
  async render(v, arg) {
    if (!S.u) return needAuth(v, 'дуэли')
    if (!S.sock) { v.innerHTML = '<div class="card empty"><b>📡</b>Нет связи с сервером, обнови страницу</div>'; return }
    let mode = 'lobby', tr = null, offs = [], cdT = null, room = null

    const emit = (ev, d) => new Promise(r => S.sock.emit(ev, d, x => r(x || {})))

    function lobby(state) {
      mode = state || 'lobby'
      const w = S.duelWait
      v.innerHTML = `<div class="duel-lobby">
        <div class="bigk" data-k></div>
        <div class="col">
          <div class="card"><h3>Сейчас в сети<span class="sp"></span><button class="btn sm ghost" data-rf>Обновить</button></h3><div class="lb" data-ol><div class="empty" style="padding:14px">Загружаю...</div></div></div>
          <div class="card"><h3>Мои дуэли<span class="sp"></span><span class="sm" style="font-weight:700"><span style="color:var(--g)">${S.u.duel_w || 0}</span> / <span style="color:var(--r)">${S.u.duel_l || 0}</span></span></h3><div data-h></div></div>
        </div>
        <div class="col dl-x">
          ${(() => { const w = S.u.duel_w || 0, l = S.u.duel_l || 0, n = w + l, p = n ? Math.round(w / n * 100) : 0
            return `<div class="card dl-st"><h3>Моя статистика</h3><div class="dl-n"><div><b style="color:var(--g)">${w}</b><span>${esc(plw(w, 'победа', 'победы', 'побед'))}</span></div><div><b style="color:var(--r)">${l}</b><span>${esc(plw(l, 'поражение', 'поражения', 'поражений'))}</span></div><div><b>${n ? p + '%' : '—'}</b><span>${esc(t('процент побед'))}</span></div></div>
              <div class="bar g"><i style="width:${p}%"></i></div></div>` })()}
          <div class="card"><h3>Лучшие дуэлянты<span class="sp"></span><a class="xs mu" href="#/top">${esc(t('весь рейтинг'))}</a></h3><div class="lb" data-tp><div class="empty" style="padding:14px">Загружаю...</div></div></div>
          <div class="card dl-how"><h3>Как это работает</h3><ol>
            <li>Обоим игрокам дают один и тот же код</li>
            <li>Обратный отсчёт три секунды, потом старт</li>
            <li>Побеждает тот, кто первым допечатает без ошибок</li>
            <li>На дуэль 5 минут. Кто вышел раньше, тот проиграл</li></ol></div>
        </div></div>`
      const k = $('[data-k]', v)
      if (mode === 'search') {
        k.innerHTML = `<div class="sw-ic">🔎</div><h2>Ищем соперника</h2><div class="search"><i></i><i></i><i></i></div><p style="opacity:.9">Как только кто-то нажмёт «Найти», игра начнётся. Можно позвать друга по ссылке</p><button class="btn lg" data-cancel style="--c:rgba(255,255,255,.16);--cs:rgba(0,0,0,.2);--kc:#fff">Отмена</button>`
      } else if (mode === 'wait') {
        const url = location.origin + '/#/duel/' + room
        k.innerHTML = `<div class="sw-ic">⏳</div><h2>${w?.who ? 'Ждём ' + esc(w.who.name) : 'Ждём друга'}</h2>
          <p style="opacity:.9">${w?.who ? 'Вызов отправлен. Можно ещё скинуть ссылку' : 'Отправь ссылку другу. Дуэль начнётся, как только он откроет её'}</p>
          <div class="row" style="width:100%;max-width:380px;flex-wrap:nowrap"><input class="in" value="${esc(url)}" readonly data-url style="background:rgba(0,0,0,.15);border-color:rgba(255,255,255,.25);color:#fff"><button class="btn y" data-copy>${I.copy}</button></div>
          ${navigator.share ? `<button class="btn lg y" data-share>Поделиться ссылкой</button>` : ''}
          <button class="btn" data-cancel style="--c:rgba(255,255,255,.16);--cs:rgba(0,0,0,.2);--kc:#fff">Отмена</button>`
      } else {
        k.innerHTML = `<div class="sw-ic">⚔️</div><h2>Дуэль</h2><p style="opacity:.92;max-width:380px">Один и тот же код, два игрока. Кто первым напечатает его без ошибок, тот и победил</p>
          <button class="btn y lg" data-find>Найти соперника</button>
          <button class="btn" data-link style="--c:rgba(255,255,255,.16);--cs:rgba(0,0,0,.2);--kc:#fff">${I.link} Позвать по ссылке</button>
          <div class="sm" style="opacity:.85">Победа +20 🪙 и 15 XP, участие +5 🪙</div>`
      }
      k.onclick = async e => {
        if (e.target.closest('[data-find]')) {
          const r = await emit('duel:find')
          if (r.e) return toast(r.e, 'err')
          if (r.wait) lobby('search')
        }
        if (e.target.closest('[data-link]')) {
          const r = await emit('duel:create')
          if (r.e) return toast(r.e, 'err')
          room = r.id; S.duelWait = null
          lobby('wait')
        }
        if (e.target.closest('[data-cancel]')) { S.sock.emit('duel:cancel'); S.duelWait = null; room = null; lobby() }
        if (e.target.closest('[data-copy]')) { const i = $('[data-url]', v); i.select(); navigator.clipboard?.writeText(i.value).then(() => toast('Ссылка скопирована', 'ok')).catch(() => document.execCommand('copy')) }
        if (e.target.closest('[data-share]')) navigator.share({ title: 'Дуэль на Indentra', text: 'Давай наперегонки печатать код', url: $('[data-url]', v).value }).catch(() => {})
      }
      online()
      hist()
      tops()
      $('[data-rf]', v).onclick = online
    }

    async function online() {
      const box = $('[data-ol]', v)
      if (!box) return
      const list = await emit('duel:online')
      box.innerHTML = (Array.isArray(list) ? list : []).map(u => `<div class="row" style="padding:8px 4px;flex-wrap:nowrap"><a href="#/u/${encodeURIComponent(u.name)}">${avatar(u, 38, 1)}</a><div style="flex:1;min-width:0">${nick(u)}<div class="xs mu">${u.duel_w || 0} ${plw(u.duel_w || 0, 'победа', 'победы', 'побед')}</div></div><button class="btn sm r" data-inv="${u.id}">Вызвать</button></div>`).join('')
        || '<div class="empty" style="padding:16px">Кроме тебя никого. Позови друга по ссылке</div>'
      box.onclick = async e => {
        const b = e.target.closest('[data-inv]')
        if (!b) return
        const r = await emit('duel:invite', { uid: +b.dataset.inv })
        if (r.e) return toast(r.e, 'err')
        room = r.id
        S.duelWait = { id: r.id, who: list.find(x => x.id === +b.dataset.inv) }
        lobby('wait')
      }
    }

    async function tops() {
      const box = $('[data-tp]', v)
      try {
        const { rows } = await api('top?by=duel')
        if (!box.isConnected) return
        box.innerHTML = rows.slice(0, 5).map((r, i) => `<a href="#/u/${encodeURIComponent(r.name)}" class="${r.id === S.u?.id ? 'me' : ''}"><span class="n">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>${avatar(r, 34)}<div class="w">${nick(r)}</div><span class="sc">${r.score} <span class="xs mu">${esc(plw(r.score, 'победа', 'победы', 'побед'))}</span></span></a>`).join('')
          || '<div class="empty" style="padding:14px">Пока никто не побеждал. Будь первым</div>'
      } catch (e) { box.innerHTML = '' }
    }

    async function hist() {
      const box = $('[data-h]', v)
      if (!box) return
      try {
        const { rows } = await api('duels')
        box.innerHTML = rows.slice(0, 8).map(d => {
          const me = d.a === S.u.id, win = d.winner === S.u.id
          const on = me ? d.bn : d.an, oa = me ? d.ba : d.aa
          return `<div class="row" style="padding:7px 0;flex-wrap:nowrap"><span class="av" style="--s:32px">${esc(oa || '🐍')}</span><div style="flex:1;min-width:0"><b class="sm">${esc(on || 'соперник')}</b><div class="xs mu">${ago(d.created_at)}</div></div><span class="tag ${win ? 'ok' : 'no'}">${win ? 'победа' : 'поражение'}</span></div>`
        }).join('') || '<div class="empty" style="padding:16px">Ещё ни одной дуэли</div>'
      } catch (e) { box.innerHTML = '' }
    }

    function race() {
      const d = S.duel
      mode = 'race'
      S.duelWait = null
      v.innerHTML = `<div class="track">
          <div class="lane" style="--lc:var(--b)"><div class="fill" data-f="me"></div><div class="rider" data-r="me">${avatar(S.u, 34)}<b>Ты</b></div><span class="wpm" data-w="me">0</span><div class="fin"></div></div>
          <div class="lane" style="--lc:var(--r)"><div class="fill" data-f="op"></div><div class="rider" data-r="op">${avatar(d.opp, 34)}<b>${esc(d.opp.name)}</b></div><span class="wpm" data-w="op">0</span><div class="fin"></div></div>
        </div>
        <div class="row mb"><b>${esc(d.title)}</b><span class="sm mu">Побеждает тот, кто первым допечатает без ошибок</span></div>
        <div data-tr></div>`
      const lane = (who, p, w) => {
        const r = $(`[data-r="${who}"]`, v), f = $(`[data-f="${who}"]`, v)
        if (!r) return
        const W = r.parentElement.clientWidth - r.offsetWidth - 30
        r.style.left = (6 + Math.max(0, W) * p) + 'px'
        f.style.width = p * 100 + '%'
        $(`[data-w="${who}"]`, v).textContent = w
      }
      tr = Trainer($('[data-tr]', v), {
        duel: true, code: d.code, name: d.title,
        startAt: () => S.duel?.local || 0,
        onProg: (p, w) => { lane('me', p, w); S.sock.emit('duel:prog', { id: d.id, p, w }) },
        onDone: x => { S.sock.emit('duel:done', { id: d.id, ...x }); toast('Финиш! Ждём итог', 'ok') }
      })
      const cd = h('<div class="count"></div>')
      document.body.append(cd)
      let lastN = null
      const tick = () => {
        const s = Math.ceil((S.duel?.local - Date.now()) / 1000)
        const n = s > 0 ? String(s) : s > -1 ? 'Старт' : null
        if (n !== lastN) {
          lastN = n
          cd.innerHTML = n ? `<b style="${n === 'Старт' ? 'font-size:90px;color:var(--g);text-shadow:0 8px 0 var(--gs)' : ''}">${n}</b>` : ''
          if (n === 'Старт') { tr.focus(); if (navigator.vibrate) navigator.vibrate(60) }
        }
        if (s <= -1) { clearInterval(cdT); cd.remove() }
      }
      cdT = setInterval(tick, 100)
      tick()
      offs.push(() => { clearInterval(cdT); cd.remove() })
      offs.push(App.on('duel', e => { if (e.t === 'opp') lane('op', e.d.p, e.d.w) }))
      if (!matchMedia('(pointer:coarse)').matches) tr.focus()
    }

    function result(d) {
      mode = 'end'
      tr?.destroy(); tr = null
      S.duel = null
      const em = d.draw ? '🤝' : d.win ? '🏆' : '😤'
      const head = d.draw ? (d.why === 'time' ? 'Время вышло' : 'Ничья') : d.win ? 'Победа!' : 'Поражение'
      const why = d.why === 'leave' ? (d.win ? 'Соперник сдался и вышел' : 'Ты покинул дуэль') : d.why === 'time' ? 'За 5 минут никто не дошёл до финиша' : ''
      v.innerHTML = `<div class="card verdict-big" style="${d.win ? 'border-color:var(--ys);box-shadow:0 5px 0 var(--ys)' : ''}">
        <div class="em">${em}</div><h2 style="color:${d.win ? 'var(--y)' : d.draw ? 'var(--tx)' : 'var(--r)'}">${head}</h2>
        ${why ? `<p class="mu">${why}</p>` : ''}
        <div class="vs"><div class="p">${avatar(S.u, 60)}<span class="sm">Ты</span><b>${d.me?.wpm ?? 0}</b><span class="xs mu">сл/мин${d.me?.acc != null ? ', ' + d.me.acc + '%' : ''}</span></div><span class="x">VS</span>
          <div class="p">${avatar(d.oppU, 60)}<span class="sm">${esc(d.oppU?.name || 'соперник')}</span><b>${d.opp?.wpm ?? 0}</b><span class="xs mu">сл/мин${d.opp?.acc != null ? ', ' + d.opp.acc + '%' : ''}</span></div></div>
        ${d.gain ? `<div class="rew"><span class="c">+${d.gain.coins} 🪙</span><span class="x">+${d.gain.xp} XP</span></div>` : ''}
        <div class="row" style="justify-content:center"><button class="btn r lg" data-again>Ещё дуэль</button>${d.oppU ? `<button class="btn lg" data-rev>Реванш</button>` : ''}<a class="btn lg" href="#/">На главную</a></div>
      </div>`
      if (d.win) confetti(180)
      $('[data-again]', v).onclick = async () => { lobby(); const r = await emit('duel:find'); if (r.e) return toast(r.e, 'err'); if (r.wait) lobby('search') }
      $('[data-rev]', v)?.addEventListener('click', async () => {
        const r = await emit('duel:invite', { uid: d.oppU.id })
        if (r.e) return toast(r.e, 'err')
        room = r.id; S.duelWait = { id: r.id, who: d.oppU }
        lobby('wait')
      })
    }

    offs.push(App.on('duel', e => {
      if (e.t === 'start' && mode !== 'race') race()
      if (e.t === 'end') result(e.d)
    }))

    if (arg) {
      const r = await emit('duel:join', { id: arg })
      if (r.e) { toast(r.e, 'err'); history.replaceState(null, '', '#/duel'); lobby() }
      else if (r.mine) { room = arg; lobby('wait') }
      else v.innerHTML = '<div class="card empty"><b>⚔️</b>Подключаемся к дуэли...</div>'
    } else if (S.duel && S.duel.local + 5 * 60e3 > Date.now()) race()
    else if (S.duelWait) { room = S.duelWait.id; lobby('wait') }
    else lobby()

    return () => {
      offs.forEach(f => f())
      tr?.destroy()
      if (mode === 'search') S.sock.emit('duel:cancel')
      if (mode === 'race') { S.sock.emit('duel:cancel'); toast('Ты вышел из дуэли', 'err') }
    }
  }
})
