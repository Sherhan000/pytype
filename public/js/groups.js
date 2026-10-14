const gLink = c => location.origin + '/#/gj/' + c

function gCard(g, act) {
  return `<a class="gc" href="#/group/${g.id}"><span class="gc-i">${esc(g.icon)}</span>
    <div class="gc-b"><b data-notr>${esc(g.name)}</b>${g.descr ? `<span data-notr>${esc(g.descr)}</span>` : ''}
      <em>${esc(pl(g.n, 'участник', 'участника', 'участников'))}${g.role === 'owner' ? ' · ' + esc(t('ты создатель')) : g.role === 'admin' ? ' · ' + esc(t('ты помощник')) : ''}${g.wxp ? ' · ' + esc(t('{0} XP за неделю', g.wxp)) : ''}</em></div>
    ${act || I.chev}</a>`
}

function gForm(g, icons, done) {
  g = g || { name: '', descr: '', icon: '👥', open: true }
  let ic = g.icon
  const m = modal(`<h2>${g.id ? esc(t('Настройки группы')) : esc(t('Новая группа'))}</h2>
    <p class="mu sm mb">${esc(t('Группа для друзей, класса или команды: общий рейтинг недели, чат и лента успехов'))}</p>
    <div class="col">
      <div class="gi-pick" data-ic>${icons.map(x => `<button type="button" data-v="${x}" class="${x === ic ? 'on' : ''}">${x}</button>`).join('')}</div>
      <label class="f">Название<input class="in" data-n maxlength="32" value="${esc(g.name)}" placeholder="Например: 9Б или Python-клуб"></label>
      <label class="f">Пара слов о группе<textarea class="in" data-d rows="2" maxlength="200">${esc(g.descr)}</textarea></label>
      <label class="sw-l"><input type="checkbox" data-o ${g.open ? 'checked' : ''}><span>Открытая: любой может найти и вступить</span></label>
      <p class="xs mu">Закрытая группа видна только по ссылке-приглашению</p>
      <button class="btn pri lg" data-s>${g.id ? esc(t('Сохранить')) : esc(t('Создать'))}</button></div>`)
  $('[data-ic]', m.el).onclick = e => { const b = e.target.closest('[data-v]'); if (b) { ic = b.dataset.v; $$('[data-v]', m.el).forEach(x => x.classList.toggle('on', x === b)) } }
  $('[data-s]', m.el).onclick = async e => {
    const d = { name: $('[data-n]', m.el).value, descr: $('[data-d]', m.el).value, icon: ic, open: $('[data-o]', m.el).checked }
    e.target.disabled = true
    try {
      const r = await api('groups' + (g.id ? '/' + g.id : ''), d, g.id ? 'PATCH' : 'POST')
      m.close(); done(r)
    } catch (er) { toast(er.message, 'err'); e.target.disabled = false }
  }
  setTimeout(() => $('[data-n]', m.el).focus(), 50)
}

function gJoinBox() {
  const m = modal(`<h2>Вступить по приглашению</h2><p class="mu sm mb">Вставь ссылку или код, который тебе прислали</p>
    <div class="row" style="flex-wrap:nowrap"><input class="in" data-c placeholder="Ссылка или код" autocapitalize="off"><button class="btn pri" data-j>Вступить</button></div>`)
  const go = async () => {
    try { const r = await api('groups/join', { code: $('[data-c]', m.el).value }); m.close(); location.hash = '#/group/' + r.id }
    catch (er) { toast(er.message, 'err') }
  }
  $('[data-j]', m.el).onclick = go
  $('[data-c]', m.el).onkeydown = e => { if (e.key === 'Enter') go() }
  setTimeout(() => $('[data-c]', m.el).focus(), 50)
}

App.page('groups', {
  title: 'Группы',
  wide: true,
  async render(v) {
    let d = await api('groups')
    v.innerHTML = `<div class="g-head">
        <div class="g"><h2>Группы</h2><p class="mu">Собери друзей, класс или команду. Внутри общий рейтинг недели, свой чат и лента успехов</p></div>
        ${S.u ? `<button class="btn" data-jn>${I.link} Вступить по ссылке</button><button class="btn pri" data-new>${I.plus} Создать группу</button>` : `<button class="btn pri" data-act="auth">Войти, чтобы создать</button>`}
      </div>
      <div class="g-grid">
        <section><div class="sec" style="margin-top:0">Мои группы</div><div class="col" data-mine></div></section>
        <section><div class="sec" style="margin-top:0">Открытые группы<span class="sp"></span></div>
          <label class="ls-q mb">${I.search}<input class="in" data-q placeholder="Найти группу" autocapitalize="off"></label>
          <div class="col" data-open></div></section>
      </div>`
    const draw = () => {
      $('[data-mine]', v).innerHTML = d.mine.map(g => gCard(g)).join('') || `<div class="card empty sm"><b>👥</b>${esc(S.u ? t('Ты пока ни в одной группе. Создай свою или вступи в открытую') : t('Войди, чтобы вступать в группы'))}</div>`
      $('[data-open]', v).innerHTML = d.open.map(g => gCard(g, S.u ? `<button class="btn sm" data-join="${g.id}">${esc(t('Вступить'))}</button>` : '')).join('') || `<div class="card empty sm"><b>🔎</b>${esc(t('Открытых групп не нашлось'))}</div>`
    }
    draw()
    let tm
    $('[data-q]', v).oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { d = await api('groups?q=' + encodeURIComponent(e.target.value.trim())); draw() }, 250) }
    $('[data-new]', v)?.addEventListener('click', () => gForm(null, d.icons, r => { toast(t('Группа создана. Позови друзей по ссылке'), 'ok'); location.hash = '#/group/' + r.id }))
    $('[data-jn]', v)?.addEventListener('click', gJoinBox)
    $('[data-open]', v).addEventListener('click', async e => {
      const b = e.target.closest('[data-join]')
      if (!b) return
      e.preventDefault(); b.disabled = true
      try { await api(`groups/${b.dataset.join}/join`, {}); location.hash = '#/group/' + b.dataset.join } catch (er) { toast(er.message, 'err'); b.disabled = false }
    })
  }
})

App.page('gj', {
  title: 'Приглашение',
  async render(v, c) {
    if (!S.u) return needAuth(v, 'группу')
    try { const r = await api('groups/join', { code: c }); location.replace('#/group/' + r.id) }
    catch (er) { v.innerHTML = `<div class="card empty"><b>🔗</b>${esc(er.message)}<div class="mt"><a class="btn" href="#/groups">${esc(t('Все группы'))}</a></div></div>` }
  }
})

App.page('group', {
  title: 'Группа',
  wide: true,
  async render(v, id) {
    let g = await api('groups/' + (+id || 0))
    setTitle(g.name)
    const head = () => `<div class="gh">
      <span class="gh-i">${esc(g.icon)}</span>
      <div class="g"><div class="xs mu" style="font-weight:700">${esc(g.open ? t('Открытая группа') : t('Закрытая группа'))} · ${esc(pl(g.n, 'участник', 'участника', 'участников'))}</div>
        <h2 data-notr>${esc(g.name)}</h2>${g.descr ? `<p data-notr>${esc(g.descr)}</p>` : ''}</div>
      <div class="gh-a">${g.me ? `<button class="btn" data-inv>${I.link} ${esc(t('Пригласить'))}</button>${['owner', 'admin'].includes(g.me) || S.u?.role === 'admin' ? `<button class="ib" data-set title="Настройки">${I.gear}</button>` : ''}<button class="ib" data-lv title="Выйти из группы">${I.out}</button>`
        : S.u && !g.closed ? `<button class="btn pri" data-jn>${esc(t('Вступить'))}</button>` : !S.u ? '<button class="btn pri" data-act="auth">Войти</button>' : ''}</div></div>`
    if (g.closed) {
      v.innerHTML = head() + `<div class="card empty"><b>🔒</b>${esc(t('Это закрытая группа. Попроси у участников ссылку-приглашение'))}</div>`
      return
    }
    let tab = 'top', by = 'wxp', offF = null, poll = null, last = 0
    const best = Math.max(0, ...g.members.map(m => m.wwpm))
    v.innerHTML = head() + `<div class="g-k">
        <div><b>${g.n}</b><span>${esc(plw(g.n, 'участник', 'участника', 'участников'))}</span></div>
        <div><b>${g.tot.xp}</b><span>${esc(t('XP за неделю'))}</span></div>
        <div><b>${g.tot.runs}</b><span>${esc(t('заходов за неделю'))}</span></div>
        <div><b>${best || '—'}</b><span>${esc(t('лучшая скорость недели'))}</span></div></div>
      <div class="row mb"><div class="tabs" data-tb><button data-t="top">Рейтинг недели</button>${g.me ? '<button data-t="chat">Чат группы</button>' : ''}<button data-t="feed">Лента</button></div></div>
      <div data-b></div>`
    function top() {
      const sc = { wxp: [x => x.wxp, 'XP'], wwpm: [x => x.wwpm, t('сл/мин')], xp: [x => x.xp, t('XP всего')] }[by]
      const rows = g.members.slice().sort((a, b) => sc[0](b) - sc[0](a) || b.xp - a.xp)
      const mine = ['owner', 'admin'].includes(g.me) || S.u?.role === 'admin'
      $('[data-b]', v).innerHTML = `<div class="card" style="padding:8px"><div class="row" style="padding:8px 10px"><div class="tabs" data-by><button data-v="wxp">${esc(t('За неделю'))}</button><button data-v="wwpm">${esc(t('Скорость'))}</button><button data-v="xp">${esc(t('Всего'))}</button></div></div>
        <div class="lb">${rows.map((m, i) => `<a href="#/u/${encodeURIComponent(m.name)}" class="${m.id === S.u?.id ? 'me' : ''}"><span class="n">${i < 3 && sc[0](m) ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>${avatar(m, 40)}
          <div class="w"><div class="row" style="gap:6px;flex-wrap:nowrap">${nick(m)}${m.role === 'owner' ? `<span class="tag y xs">${esc(t('создатель'))}</span>` : m.role === 'admin' ? `<span class="tag b xs">${esc(t('помощник'))}</span>` : ''}</div>
            <div class="sub">${esc(t('{0} за неделю, рекорд {1} сл/мин', pl(m.wruns, 'заход', 'захода', 'заходов'), m.best_wpm))}</div></div>
          <span class="sc">${sc[0](m)} <span class="xs mu">${esc(sc[1])}</span></span>
          ${mine && m.id !== S.u?.id && m.role !== 'owner' ? `<button class="ib sm" data-mm="${m.id}" data-r="${m.role}" title="Управление">${I.more}</button>` : ''}</a>`).join('')}</div></div>`
      $$('[data-by] button', v).forEach(b => b.classList.toggle('on', b.dataset.v === by))
    }
    function chat() {
      const b = $('[data-b]', v)
      b.innerHTML = `<div class="chat g-chat"><div class="msgs" data-m><div class="empty">${esc(t('Загружаю...'))}</div></div>
        <form class="chat-f"><textarea class="in" maxlength="400" placeholder="Сообщение для группы" data-t rows="1"></textarea><button class="btn b" title="Отправить">${I.send}</button></form></div>`
      const box = $('[data-m]', b), fm = $('form', b), ta = $('[data-t]', b)
      last = 0
      const el = m => `<div class="msg ${m.u.id === S.u?.id ? 'mine' : ''} first">${m.u.id === S.u?.id ? '' : `<a href="#/u/${encodeURIComponent(m.u.name)}">${avatar(m.u, 34)}</a>`}
        <div class="b"><div class="h">${nick(m.u)}</div><div class="t">${esc(m.text)}<time>${new Date(m.at).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })}</time></div></div></div>`
      async function load() {
        if (document.hidden || !box.isConnected) return
        try {
          const { rows } = await api(`groups/${g.id}/msgs?after=${last}`)
          if (!box.isConnected) return
          if (!last) box.innerHTML = rows.length ? '' : `<div class="empty"><b>👋</b>${esc(t('Тут пока тихо. Напиши первым'))}</div>`
          if (rows.length) {
            box.querySelector('.empty')?.remove()
            const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160
            box.insertAdjacentHTML('beforeend', rows.map(el).join(''))
            last = rows[rows.length - 1].id
            if (near || !last) box.scrollTop = box.scrollHeight
          }
        } catch (er) {}
      }
      load().then(() => { box.scrollTop = box.scrollHeight })
      clearInterval(poll); poll = setInterval(load, 5000)
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); fm.requestSubmit() } })
      fm.onsubmit = async e => {
        e.preventDefault()
        const tx = ta.value.trim()
        if (!tx) return
        const sb = $('button', fm); sb.disabled = true
        try { await api(`groups/${g.id}/msgs`, { text: tx }); ta.value = ''; await load(); box.scrollTop = box.scrollHeight } catch (er) { toast(er.message, 'err') }
        sb.disabled = false; ta.focus()
      }
    }
    function show() {
      $$('[data-tb] button', v).forEach(b => b.classList.toggle('on', b.dataset.t === tab))
      offF?.(); offF = null; clearInterval(poll)
      if (tab === 'top') { top(); reload().catch(() => {}) }
      if (tab === 'chat') chat()
      if (tab === 'feed') { $('[data-b]', v).innerHTML = '<div class="card" style="padding:4px 18px" data-feed></div>'; offF = feedBox($('[data-feed]', v), 'g' + g.id) }
    }
    $('[data-tb]', v).onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; show() } }
    $('[data-b]', v).addEventListener('click', async e => {
      const b = e.target.closest('[data-by] [data-v]')
      if (b) { by = b.dataset.v; return top() }
      const mm = e.target.closest('[data-mm]')
      if (!mm) return
      e.preventDefault()
      const m = g.members.find(x => x.id === +mm.dataset.mm)
      const own = g.me === 'owner' || S.u?.role === 'admin'
      const md = modal(`<div class="row mb" style="gap:12px">${avatar(m, 52)}<div><h2 style="margin:0">${esc(m.name)}</h2><div class="xs mu">${esc(m.role === 'admin' ? t('помощник') : t('участник'))}</div></div></div>
        <div class="col">${own ? `<button class="btn wide" data-rl>${esc(m.role === 'admin' ? t('Убрать из помощников') : t('Сделать помощником'))}</button>` : ''}
        <button class="btn wide red" data-k>${esc(t('Убрать из группы'))}</button></div>
        <p class="xs mu mt">Помощник может убирать участников и менять название и описание группы</p>`)
      $('[data-rl]', md.el)?.addEventListener('click', async () => {
        try { await api(`groups/${g.id}/role`, { uid: m.id, role: m.role === 'admin' ? 'member' : 'admin' }); md.close(); reload() } catch (er) { toast(er.message, 'err') }
      })
      $('[data-k]', md.el).onclick = async () => {
        try { await api(`groups/${g.id}/kick`, { uid: m.id }); md.close(); toast(t('Готово'), 'ok'); reload() } catch (er) { toast(er.message, 'err') }
      }
    })
    async function reload() { const x = await api('groups/' + g.id); if (x.closed || !v.isConnected) return; g = x; if (tab === 'top') top() }
    v.querySelector('.gh-a').addEventListener('click', async e => {
      if (e.target.closest('[data-jn]')) {
        try { await api(`groups/${g.id}/join`, {}); toast(t('Ты в группе'), 'ok'); route() } catch (er) { toast(er.message, 'err') }
      }
      if (e.target.closest('[data-inv]')) {
        const url = gLink(g.code)
        const m = modal(`<h2>Позвать в группу</h2><p class="mu sm mb">Отправь ссылку. Кто откроет её, сразу попадёт в группу</p>
          <div class="row" style="flex-wrap:nowrap"><input class="in" readonly value="${esc(url)}" data-u><button class="btn y" data-cp>${I.copy}</button></div>
          <div class="row mt">${navigator.share ? `<button class="btn" data-sh>${esc(t('Поделиться'))}</button>` : ''}<span class="sp"></span>
          ${['owner', 'admin'].includes(g.me) ? `<button class="btn ghost sm" data-nc>${esc(t('Сменить ссылку'))}</button>` : ''}</div>
          <p class="xs mu mt">Старая ссылка перестанет работать, если её сменить</p>`)
        $('[data-cp]', m.el).onclick = () => { const i = $('[data-u]', m.el); i.select(); navigator.clipboard?.writeText(i.value).then(() => toast(t('Ссылка скопирована'), 'ok')).catch(() => document.execCommand('copy')) }
        $('[data-sh]', m.el)?.addEventListener('click', () => navigator.share({ title: g.name, text: t('Вступай в мою группу на Indentra'), url: $('[data-u]', m.el).value }).catch(() => {}))
        $('[data-nc]', m.el)?.addEventListener('click', async () => { try { const r = await api(`groups/${g.id}/code`, {}); g.code = r.code; $('[data-u]', m.el).value = gLink(r.code); toast(t('Ссылка обновлена'), 'ok') } catch (er) { toast(er.message, 'err') } })
      }
      if (e.target.closest('[data-set]')) {
        const { icons } = await api('groups')
        gForm(g, icons, () => { toast(t('Сохранено'), 'ok'); route() })
        if (g.me === 'owner' || S.u?.role === 'admin') {
          const mb = $('#modal .mbox')
          mb?.insertAdjacentHTML('beforeend', `<button class="btn ghost red wide mt" data-del>${esc(t('Удалить группу'))}</button>`)
          $('[data-del]', mb)?.addEventListener('click', async () => {
            if (!(await ask(t('Удалить группу «{0}»? Чат и состав пропадут', g.name), t('Удалить'), 'red'))) return
            try { await api('groups/' + g.id, undefined, 'DELETE'); location.hash = '#/groups' } catch (er) { toast(er.message, 'err') }
          })
        }
      }
      if (e.target.closest('[data-lv]')) {
        if (!(await ask(g.me === 'owner' ? t('Выйти из группы? Создателем станет следующий участник') : t('Выйти из группы?'), t('Выйти'), 'red'))) return
        try { await api(`groups/${g.id}/leave`, {}); location.hash = '#/groups' } catch (er) { toast(er.message, 'err') }
      }
    })
    show()
    return () => { offF?.(); clearInterval(poll) }
  }
})

ADM.grps = async function (b) {
  const { rows } = await api('admin/grps')
  b.innerHTML = `<div class="list">${rows.map(g => `<div class="li"><span style="font-size:24px">${esc(g.icon)}</span><div class="g"><a href="#/group/${g.id}" data-notr><b>${esc(g.name)}</b></a><span class="mu xs" data-notr>${esc(g.descr)}</span><span class="mu xs">${g.open ? esc(t('открытая')) : esc(t('закрытая'))} · ${ago(g.created_at)}</span></div>
    <button class="btn sm red" data-d="${g.id}">${esc(t('Удалить'))}</button></div>`).join('') || `<div class="empty">${esc(t('Групп пока нет'))}</div>`}</div>`
  b.onclick = async e => {
    const x = e.target.closest('[data-d]')
    if (x && await ask(t('Удалить группу?'), t('Удалить'), 'red')) { await api('admin/grps/' + x.dataset.d, undefined, 'DELETE'); ADM.grps(b) }
  }
}
ATABS.splice(ATABS.findIndex(x => x[0] === 'news'), 0, ['grps', 'Группы', ['admin']])
