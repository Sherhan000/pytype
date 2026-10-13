const ytThumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

function lessonPlayer(l) {
  if (l.kind === 'yt') return `<div class="lp"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(l.src)}?rel=0&modestbranding=1&playsinline=1" title="${esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
  const src = l.kind === 'file' ? '/media/' + l.media_id : l.src
  return `<div class="lp"><video controls playsinline preload="metadata" src="${esc(src)}"></video></div>`
}

function lessonCard(l, seen) {
  const th = l.kind === 'yt' ? `<img src="${ytThumb(l.src)}" alt="" loading="lazy">` : `<div class="ls-ph">🎬</div>`
  return `<a class="ls ${seen ? 'seen' : ''}" href="#/lesson/${l.id}">
    <div class="ls-th">${th}<span class="ls-pl">${I.play}</span>${seen ? '<span class="ls-ok">✓</span>' : ''}</div>
    <div class="ls-b"><b>${esc(l.title)}</b>${l.descr ? `<span>${esc(l.descr)}</span>` : ''}</div></a>`
}

App.page('lessons', {
  title: 'Видеоуроки',
  async render(v) {
    const { rows, seen } = await api('lessons')
    const S2 = new Set(seen)
    const done = rows.filter(r => S2.has(r.id)).length
    v.innerHTML = rows.length ? `
      <div class="ls-head"><div><h2>Видеоуроки</h2><p class="mu">${esc(t('Смотри урок прямо здесь, потом закрепляй заданием. За каждый новый урок +10 XP'))}</p></div>
        ${S.u ? `<div class="ls-prog"><b>${done} / ${rows.length}</b><span>${esc(t('просмотрено'))}</span><div class="bar g"><i style="width:${done / rows.length * 100}%"></i></div></div>` : ''}</div>
      <div class="ls-grid">${rows.map(l => lessonCard(l, S2.has(l.id))).join('')}</div>`
      : `<div class="card empty"><b>🎬</b>${esc(t('Уроков пока нет. Скоро админ добавит первые'))}${S.u?.role === 'admin' ? `<div class="mt"><a class="btn pri" href="#/admin/lessons">${esc(t('Добавить урок'))}</a></div>` : ''}</div>`
  }
})

App.page('lesson', {
  title: 'Урок',
  async render(v, id) {
    const { rows, seen } = await api('lessons')
    const l = rows.find(r => r.id === +id)
    if (!l) { v.innerHTML = '<div class="card empty"><b>🎬</b>Урок не найден</div>'; return }
    setTitle(l.title)
    const i = rows.indexOf(l), nx = rows[i + 1], was = seen.includes(l.id)
    v.innerHTML = `<div class="lw">
      <div class="lw-m">
        ${lessonPlayer(l)}
        <div class="lw-i">
          <h2>${esc(l.title)}</h2>
          ${l.descr ? `<p>${md(l.descr)}</p>` : ''}
          <div class="row mt">
            ${S.u ? `<button class="btn ${was ? '' : 'g'}" data-seen ${was ? 'disabled' : ''}>${was ? '✓ ' + esc(t('Просмотрено')) : esc(t('Я посмотрел, +10 XP'))}</button>` : ''}
            ${l.task_id ? `<a class="btn pri" href="#/task/${l.task_id}">${I.play} ${esc(t('Закрепить: {0}', l.task_title || ''))}</a>` : ''}
            ${nx ? `<a class="btn ghost" href="#/lesson/${nx.id}">${esc(t('Следующий урок'))} ${I.next}</a>` : ''}
          </div>
        </div>
      </div>
      <aside class="lw-s"><h3>${esc(t('Все уроки'))}</h3>${rows.map(r => `<a class="lw-r ${r.id === l.id ? 'on' : ''}" href="#/lesson/${r.id}">
        ${r.kind === 'yt' ? `<img src="${ytThumb(r.src)}" alt="" loading="lazy">` : '<span class="ls-ph sm">🎬</span>'}
        <span>${esc(r.title)}</span>${seen.includes(r.id) ? '<i>✓</i>' : ''}</a>`).join('')}</aside>
    </div>`
    $('[data-seen]', v)?.addEventListener('click', async e => {
      const b = e.currentTarget
      b.disabled = true
      try {
        const r = await api(`lessons/${l.id}/seen`, {})
        b.className = 'btn'; b.textContent = '✓ ' + t('Просмотрено')
        if (r.xp) { toast('+' + r.xp + ' XP', 'ok'); gain({ u: r.u }) }
      } catch (er) { b.disabled = false; toast(er.message, 'err') }
    })
  }
})

ADM.lessons = async function (b) {
  const [{ rows }, { rows: tasks }] = await Promise.all([api('admin/lessons'), api('admin/tasks')])
  b.innerHTML = `<div class="row mb"><span class="sp"></span><button class="btn pri" data-new>${I.plus} ${esc(t('Новый урок'))}</button></div>
    <div class="list">${rows.map(l => `<div class="li"><span style="font-size:24px">${l.kind === 'yt' ? '▶️' : '🎬'}</span><div class="g"><b>${esc(l.title)}</b><span class="mu xs">${l.kind === 'yt' ? 'YouTube' : l.kind === 'file' ? t('файл') : t('ссылка')} · ${esc(t('порядок {0}', l.ord))}${l.active ? '' : ' · ' + esc(t('скрыт'))}</span></div>
      <button class="btn sm" data-e="${l.id}">${esc(t('Изменить'))}</button><button class="btn sm red" data-d="${l.id}">${esc(t('Удалить'))}</button></div>`).join('') || `<div class="empty">${esc(t('Уроков пока нет'))}</div>`}</div>`
  const edit = l => {
    l = l || { title: '', descr: '', kind: 'yt', src: '', media_id: null, task_id: null, ord: rows.length + 1, active: true }
    const m = modal(`<h2>${l.id ? esc(t('Урок')) : esc(t('Новый урок'))}</h2><div class="col mt">
      <label class="f">Название<input class="in" data-k="title" maxlength="120" value="${esc(l.title)}"></label>
      <label class="f">Описание<textarea class="in" data-k="descr" rows="3" maxlength="1500">${esc(l.descr)}</textarea></label>
      <div class="tabs" data-kd style="display:flex">${[['yt', 'YouTube'], ['file', t('Файл')], ['url', t('Ссылка на видео')]].map(([k, n]) => `<button data-v="${k}" class="${l.kind === k ? 'on' : ''}" style="flex:1">${esc(n)}</button>`).join('')}</div>
      <label class="f" data-w="yt">Ссылка на YouTube<input class="in" data-yt placeholder="https://youtu.be/..." value="${l.kind === 'yt' && l.src ? 'https://youtu.be/' + esc(l.src) : ''}"></label>
      <label class="f" data-w="url">Прямая ссылка на mp4<input class="in" data-url placeholder="https://.../lesson.mp4" value="${l.kind === 'url' ? esc(l.src) : ''}"></label>
      <div data-w="file" class="col"><label class="btn">${esc(t('Выбрать видео mp4 или webm, до 60 МБ'))}<input type="file" accept="video/mp4,video/webm,video/ogg" hidden data-file></label>
        <div class="xs mu" data-fs>${l.media_id ? esc(t('Файл загружен')) : esc(t('Бесплатная база вмещает немного видео. Длинные уроки лучше выложить на YouTube'))}</div><div class="bar" data-fp hidden><i style="width:0"></i></div></div>
      <label class="f">Задание для закрепления<select class="in" data-k="task_id"><option value="">нет</option>${tasks.map(x => `<option value="${x.id}" ${x.id === l.task_id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
      <div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Порядок<input class="in" type="number" data-k="ord" value="${l.ord}"></label>
        <label class="f" style="flex:1">Показывать<select class="in" data-k="active"><option value="true" ${l.active ? 'selected' : ''}>да</option><option value="false" ${l.active ? '' : 'selected'}>нет</option></select></label></div>
      <div data-pv></div>
      <button class="btn pri lg" data-save>Сохранить</button></div>`, { wide: true })
    let kind = l.kind, media = l.media_id
    const show = () => {
      $$('[data-kd] button', m.el).forEach(x => x.classList.toggle('on', x.dataset.v === kind))
      $$('[data-w]', m.el).forEach(x => { x.hidden = x.dataset.w !== kind })
    }
    show()
    $('[data-kd]', m.el).onclick = e => { const x = e.target.closest('[data-v]'); if (x) { kind = x.dataset.v; show() } }
    $('[data-yt]', m.el).addEventListener('input', e => {
      const id = (e.target.value.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/) || [])[1]
      $('[data-pv]', m.el).innerHTML = id ? `<img src="${ytThumb(id)}" alt="" style="width:100%;border-radius:14px">` : ''
    })
    $('[data-file]', m.el).onchange = e => {
      const f = e.target.files[0]
      if (!f) return
      if (f.size > 60e6) return toast(t('Файл больше 60 МБ, выложи его на YouTube'), 'err')
      const fs = $('[data-fs]', m.el), fp = $('[data-fp]', m.el), sv = $('[data-save]', m.el)
      fp.hidden = false; sv.disabled = true
      const x = new XMLHttpRequest()
      x.open('POST', '/api/admin/media')
      x.setRequestHeader('Content-Type', f.type || 'video/mp4')
      x.setRequestHeader('X-Name', encodeURIComponent(f.name))
      x.upload.onprogress = ev => { if (ev.lengthComputable) { $('i', fp).style.width = ev.loaded / ev.total * 100 + '%'; fs.textContent = t('Загружаю {0}%', Math.round(ev.loaded / ev.total * 100)) } }
      x.onload = () => {
        sv.disabled = false
        let r = {}
        try { r = JSON.parse(x.responseText) } catch (er) {}
        if (x.status !== 200) { fs.textContent = t(r.e || 'Не получилось загрузить'); return toast(t(r.e || 'Не получилось загрузить'), 'err') }
        media = r.id; fs.textContent = t('Загружено: {0}', f.name)
        if (!$('[data-k=title]', m.el).value) $('[data-k=title]', m.el).value = f.name.replace(/\.\w+$/, '')
      }
      x.onerror = () => { sv.disabled = false; toast(t('Не получилось загрузить'), 'err') }
      x.send(f)
    }
    $('[data-save]', m.el).onclick = async () => {
      const d = { kind, media_id: kind === 'file' ? media : null }
      $$('[data-k]', m.el).forEach(x => { d[x.dataset.k] = x.value })
      d.active = d.active === 'true'
      d.src = kind === 'yt' ? $('[data-yt]', m.el).value : kind === 'url' ? $('[data-url]', m.el).value.trim() : ''
      try {
        await api('admin/lessons' + (l.id ? '/' + l.id : ''), d, l.id ? 'PUT' : 'POST')
        m.close(); toast(t('Сохранено'), 'ok'); ADM.lessons(b)
      } catch (er) { toast(er.message, 'err') }
    }
  }
  b.onclick = async e => {
    const q = e.target.closest('[data-new],[data-e],[data-d]')
    if (!q) return
    if ('new' in q.dataset) edit(null)
    if (q.dataset.e) edit(rows.find(x => x.id === +q.dataset.e))
    if (q.dataset.d && await ask(t('Удалить урок?'), t('Удалить'), 'red')) { await api('admin/lessons/' + q.dataset.d, undefined, 'DELETE'); ADM.lessons(b) }
  }
}
ATABS.splice(ATABS.findIndex(x => x[0] === 'news'), 0, ['lessons', 'Уроки', ['admin']])
