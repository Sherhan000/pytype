const big = n => {
  n = +n || 0
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' ' + t('млн')
  if (n >= 1e4) return Math.round(n / 1e3) + ' ' + t('тыс')
  return n.toLocaleString(LOC)
}

function bars(rows, o = {}) {
  const max = Math.max(1, ...rows.map(r => r.v))
  return `<div class="an-bars" style="--h:${o.h || 150}px">${rows.map(r => `<div class="ab ${r.on ? 'on' : ''}" title="${esc(r.tip || r.l + ': ' + r.v)}">
    ${r.on ? `<em>${esc(t('ты здесь'))}</em>` : ''}<i style="height:${r.v ? Math.max(3, r.v / max * 100) : 0}%"></i><span>${r.sl ?? ''}</span></div>`).join('')}</div>`
}

function hbar(l, p, sub, c) {
  return `<div class="hb"><div class="hbl"><span>${l}</span><b>${p == null ? '—' : p + '%'}</b></div><div class="bar ${c || ''}"><i style="width:${p || 0}%"></i></div>${sub ? `<div class="xs mu">${sub}</div>` : ''}</div>`
}

App.page('analytics', {
  title: 'Аналитика',
  async render(v) {
    const d = await api('analytics')
    const T = d.tot, y = d.you
    const B = [...Array(16)].map((_, i) => ({ l: i < 15 ? `${i * 10}–${i * 10 + 9}` : '150+', v: d.hist.find(h => h.b === i)?.n || 0 }))
    const mb = y?.wpm ? Math.min(15, Math.floor(y.wpm / 10)) : -1
    const last = B.reduce((a, b, i) => b.v || i <= mb ? i : a, 3)
    const hist = B.slice(0, last + 1).map((b, i) => ({ ...b, on: i === mb, sl: i % 2 ? '' : i * 10, tip: t('{0} сл/мин: {1}', b.l, pl(b.v, 'игрок', 'игрока', 'игроков')) }))
    const H = [...Array(24)].map((_, h) => ({ l: h, v: d.hours.find(x => x.h === h)?.n || 0 }))
    const nowH = new Date().getHours()
    const hours = H.map(x => ({ ...x, on: false, sl: x.l % 6 ? '' : x.l + ':00', tip: t('{0}:00, заходов за месяц: {1}', x.l, x.v) }))
    const peak = H.reduce((a, b) => b.v > a.v ? b : a, H[0])
    const tk = d.tasks.filter(x => x.tried >= 2)
    const hard = tk.map(x => ({ ...x, r: Math.round(x.done / x.tried * 100) })).sort((a, b) => a.r - b.r).slice(0, 5)
    const pop = d.tasks.slice().sort((a, b) => b.tried - a.tried).filter(x => x.tried).slice(0, 5)
    const eTot = d.err.reduce((a, b) => a + b.n, 0) || 1
    const users = T.users || 1
    const KL = typeof KIND_L !== 'undefined' ? KIND_L : {}
    v.innerHTML = `
      ${y ? `<div class="sec" style="margin-top:0">Ты и все остальные</div>
      <div class="grid g4 an-you">
        <div class="card an-k y"><b>${y.fast ?? '—'}${y.fast != null ? '<small>%</small>' : ''}</b><span>${esc(y.fast != null ? t('игроков печатают медленнее тебя') : t('Пройди любое задание, чтобы сравниться'))}</span><em>${esc(t('твой рекорд {0} сл/мин', y.wpm))}</em></div>
        <div class="card an-k b"><b>${y.accb ?? '—'}${y.accb != null ? '<small>%</small>' : ''}</b><span>${esc(t('игроков ошибаются чаще тебя'))}</span><em>${esc(y.acc != null ? t('твоя точность за месяц {0}%', y.acc) : t('нет заходов за месяц'))}</em></div>
        <div class="card an-k g"><b>${y.xp ?? '—'}${y.xp != null ? '<small>%</small>' : ''}</b><span>${esc(t('игроков набрали меньше опыта'))}</span><em>${esc(t('решено заданий: {0}', y.solved))}</em></div>
        <div class="card an-k v"><b>${y.duel ?? '—'}${y.duel != null ? '<small>%</small>' : ''}</b><span>${esc(t('твоих дуэлей закончились победой'))}</span><em><a href="#/duel">${esc(t('сыграть дуэль'))} →</a></em></div>
      </div>` : `<div class="card mb an-guest"><b>📊</b><div><div class="t">Сравни себя с остальными</div><div class="sm mu">Войди, и здесь появится, насколько ты быстрее и точнее других игроков</div></div><button class="btn pri" data-act="auth">Войти</button></div>`}

      <div class="sec">Сайт в цифрах</div>
      <div class="grid g3 an-num">
        <div class="card"><b>${big(T.users)}</b><span>игроков всего</span></div>
        <div class="card"><b>${big(T.today)}</b><span>заходили сегодня</span></div>
        <div class="card"><b>${big(T.runs_day)}</b><span>заходов за сутки</span></div>
        <div class="card"><b>${big(T.chars)}</b><span>символов напечатано</span></div>
        <div class="card"><b>${big(T.solved)}</b><span>заданий решено</span></div>
        <div class="card"><b>${big(T.duels)}</b><span>дуэлей сыграно</span></div>
      </div>

      <div class="grid g2 mt" style="align-items:start">
        <div class="card"><h3>Кто как быстро печатает</h3><p class="sm mu mb">${esc(t('Лучшая скорость игроков, слов в минуту.'))}${y?.wpm ? ' ' + esc(t('Жёлтый столбик это ты')) : ''}</p>${hist.some(b => b.v) ? bars(hist) : '<div class="empty">Пока мало данных</div>'}</div>
        <div class="card"><h3>Когда все печатают</h3><p class="sm mu mb">${esc(peak.v ? t('Заходы за месяц по часам. Больше всего в {0}:00', peak.l) : t('Заходы за месяц по часам'))}</p>${H.some(x => x.v) ? bars(hours, { h: 150 }) : '<div class="empty">Пока мало данных</div>'}<div class="xs mu mt">${esc(t('Сейчас {0}:00', nowH))}</div></div>
      </div>

      <div class="grid g2 mt" style="align-items:start">
        <div class="card"><h3>Кубки лиг</h3><p class="sm mu mb">Сколько игроков дошли до кубка каждой лиги</p>
          ${d.cups.map(c => hbar(`${esc(c.icon)} ${esc(t(c.name))}`, Math.round(c.n / users * 100), esc(pl(c.n, 'игрок', 'игрока', 'игроков')))).join('')}</div>
        <div class="card"><h3>Где чаще всего ошибаются</h3><p class="sm mu mb">Доля среди всех опечаток на сайте</p>
          ${d.err.length ? `<div class="an-err">${d.err.map(e => `<div><kbd>${esc(sym(e.k))}</kbd><b>${Math.round(e.n / eTot * 100)}%</b></div>`).join('')}</div>` : '<div class="empty">Ошибок пока нет</div>'}
          <div class="sm mu mt">${esc(t('Сундук дня сегодня открыли {0}% тех, кто брался за задания дня', d.quests.n ? Math.round(d.quests.c / d.quests.n * 100) : 0))}</div>
        </div>
      </div>

      <div class="grid g2 mt" style="align-items:start">
        <div class="card"><h3>Самые сложные задания</h3><p class="sm mu mb">Меньше всего тех, кто дошёл до конца</p>
          ${hard.length ? hard.map(x => `<a class="an-t" href="#/task/${x.id}">${hbar(`${esc(t(x.title))} <span class="xs mu">${esc(t(KL[x.kind] || ''))}</span>`, x.r, esc(t('прошли {0} из {1}', x.done, x.tried)), 'r')}</a>`).join('') : '<div class="empty">Пока мало данных</div>'}</div>
        <div class="card"><h3>Самые популярные</h3><p class="sm mu mb">Чаще всего берутся</p>
          ${pop.length ? pop.map(x => `<a class="an-t" href="#/task/${x.id}">${hbar(`${esc(t(x.title))}`, Math.round(x.tried / users * 100), esc(t('пробовали {0}, прошли {1}', x.tried, x.done)), 'g')}</a>`).join('') : '<div class="empty">Пока мало данных</div>'}</div>
      </div>
      <p class="xs mu mt" style="text-align:center">${esc(t('Цифры обновляются раз в минуту. Средняя точность на сайте за месяц: {0}%', T.acc ?? '—'))}</p>`
  }
})

async function newsList() { return (await api('news')).rows || [] }

function newsHtml(rows) {
  return rows.map(n => `<div class="nw-i"><span class="ni">${esc(n.icon)}</span><div><b>${esc(t(n.title))}</b><p>${esc(t(n.body))}</p><span class="xs mu">${ago(n.at)}</span></div></div>`).join('')
}

App.page('news', {
  title: 'Что нового',
  async render(v) {
    const rows = await newsList()
    if (rows[0]) ls.s('news_seen', rows[0].id)
    v.innerHTML = rows.length ? `<div class="card nw">${newsHtml(rows)}</div>` : '<div class="card empty"><b>📰</b>Пока ничего нового</div>'
  }
})

async function newsPop() {
  if (!S.u || !['', 'path', 'me'].includes(S.page) || document.activeElement?.matches('textarea,input')) return
  let rows
  try { rows = await newsList() } catch (e) { return }
  if (!rows.length) return
  const seen = ls.g('news_seen', 0)
  const fresh = rows.filter(n => n.id > seen).slice(0, 4)
  ls.s('news_seen', rows[0].id)
  if (!fresh.length) return
  const m = modal(`<div class="nw-top"><span>🎉</span><h2>Что нового</h2></div>
    <div class="nw">${newsHtml(fresh)}</div>
    <div class="row mt"><a class="btn ghost" href="#/news" data-x>Все обновления</a><span class="sp"></span><button class="btn pri" data-x>Понятно</button></div>`)
  $$('[data-x]', m.el).forEach(b => b.addEventListener('click', () => m.close()))
}

let newsT = 0
App.on('user', () => { clearTimeout(newsT); newsT = setTimeout(newsPop, 1800) })
addEventListener('load', () => { let n = 0; const go = () => S.u ? newsPop() : ++n < 6 && setTimeout(go, 4000); setTimeout(go, 2500) })
