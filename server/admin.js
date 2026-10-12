import { db } from './db.js'
import { cfg, saveCfg, pubCfg } from './util.js'
import { ask } from './ai.js'
import { onlineN } from './chat.js'

const T = {
  tasks: { f: ['league_id', 'title', 'descr', 'kind', 'code', 'lvl', 'min_wpm', 'min_acc', 'coins', 'xp', 'ord', 'active', 'meta'], o: 'ord,id' },
  leagues: { f: ['name', 'icon', 'color', 'ord', 'reward'], o: 'ord,id' },
  items: { f: ['kind', 'name', 'value', 'price', 'ord', 'active'], o: 'kind,ord,id' },
  news: { f: ['title', 'body', 'icon'], o: 'id desc' }
}

function pick(b, f) {
  const r = {}
  for (const k of f) {
    if (!b || !(k in b)) continue
    let v = b[k]
    if (k === 'league_id') v = v === '' || v == null || +v === 0 ? null : +v
    else if (k === 'meta') v = JSON.stringify(typeof v === 'string' ? JSON.parse(v || '{}') : v || {})
    else if (k === 'active') v = v === true || v === 'true' || v === 1
    else if (['lvl', 'min_wpm', 'min_acc', 'coins', 'xp', 'ord', 'price', 'reward'].includes(k)) v = Math.round(+v || 0)
    else v = String(v ?? '').slice(0, k === 'code' ? 20000 : 2000)
    r[k] = v
  }
  return r
}

export default function admin(app, { adm, modr, io }) {
  for (const [t, { f, o }] of Object.entries(T)) {
    app.get(`/api/admin/${t}`, adm, async (req, res) => {
      res.json({ rows: await db.q(`select * from ${t} order by ${o}`) })
    })
    app.post(`/api/admin/${t}`, adm, async (req, res) => {
      const b = pick(req.body, f), k = Object.keys(b)
      if (!k.length) return res.status(400).json({ e: 'Пустые данные' })
      const r = await db.one(`insert into ${t}(${k.join(',')}) values(${k.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, k.map(x => b[x]))
      res.json({ row: r })
    })
    app.put(`/api/admin/${t}/:id`, adm, async (req, res) => {
      const b = pick(req.body, f), k = Object.keys(b)
      if (!k.length) return res.status(400).json({ e: 'Пустые данные' })
      if (t === 'tasks' && 'code' in b) {
        const old = await db.one('select code from tasks where id=$1', [+req.params.id])
        if (old && old.code !== b.code) await db.q('delete from ghosts where task_id=$1', [+req.params.id])
      }
      const r = await db.one(`update ${t} set ${k.map((x, i) => `${x}=$${i + 1}`).join(',')} where id=$${k.length + 1} returning *`, [...k.map(x => b[x]), +req.params.id])
      res.json({ row: r })
    })
    app.delete(`/api/admin/${t}/:id`, adm, async (req, res) => {
      await db.q(`delete from ${t} where id=$1`, [+req.params.id])
      res.json({ ok: 1 })
    })
  }

  app.get('/api/admin/stats', adm, async (req, res) => {
    const r = await db.one(`select
      (select count(*)::int from users) users,
      (select count(*)::int from users where seen_at > now() - interval '1 day') active,
      (select count(*)::int from results) results,
      (select count(*)::int from results where created_at > now() - interval '1 day') results_day,
      (select count(*)::int from msgs where created_at > now() - interval '1 day') msgs_day,
      (select count(*)::int from tasks where active) tasks,
      (select coalesce(sum(coins),0)::int from users) coins`)
    const top = await db.q(`select date_trunc('day', created_at)::date d, count(*)::int n from results where created_at > now() - interval '14 days' group by 1 order by 1`)
    res.json({ ...r, online: onlineN(), groq: !!process.env.GROQ_API_KEY, days: top })
  })

  app.get('/api/admin/users', modr, async (req, res) => {
    const q = String(req.query.q || '').slice(0, 40)
    const rows = await db.q(`select id,name,role,coins,xp,best_wpm,banned,muted_until,created_at,seen_at,
      (select count(*)::int from done d where d.user_id=users.id) done
      from users where name ilike $1 order by seen_at desc limit 100`, ['%' + q.replace(/[%_]/g, '') + '%'])
    res.json({ rows })
  })

  app.patch('/api/admin/users/:id', modr, async (req, res) => {
    const id = +req.params.id, b = req.body || {}, me = req.u
    const t = await db.one('select * from users where id=$1', [id])
    if (!t) return res.status(404).json({ e: 'Не найден' })
    const isA = me.role === 'admin'
    if (!isA && t.role !== 'user') return res.status(403).json({ e: 'Модератор не может трогать админов и модераторов' })
    if (id === me.id && ('role' in b || 'banned' in b)) return res.status(400).json({ e: 'Себя менять нельзя' })
    if ('mute' in b) await db.q(`update users set muted_until=case when $2::int>0 then now()+($2::int * interval '1 minute') else null end where id=$1`, [id, Math.max(0, +b.mute || 0)])
    if ('banned' in b) await db.q('update users set banned=$2 where id=$1', [id, !!b.banned])
    if (isA) {
      if ('role' in b && ['user', 'mod', 'admin'].includes(b.role)) await db.q('update users set role=$2 where id=$1', [id, b.role])
      if (b.coins) await db.q('update users set coins=greatest(0,coins+$2) where id=$1', [id, Math.round(+b.coins) || 0])
      if (b.xp) await db.q('update users set xp=greatest(0,xp+$2) where id=$1', [id, Math.round(+b.xp) || 0])
      if ('title' in b) await db.q('update users set title=$2 where id=$1', [id, String(b.title || '').slice(0, 40)])
      if (b.reset) {
        await db.q('delete from done where user_id=$1', [id])
        await db.q('delete from cups where user_id=$1', [id])
        await db.q('delete from results where user_id=$1', [id])
        await db.q("update users set xp=0,best_wpm=0,emap='{}' where id=$1", [id])
      }
    }
    res.json({ row: await db.one('select id,name,role,coins,xp,best_wpm,banned,muted_until from users where id=$1', [id]) })
  })

  app.get('/api/admin/settings', adm, (req, res) => res.json({ cfg, groq: !!process.env.GROQ_API_KEY }))
  app.put('/api/admin/settings', adm, async (req, res) => {
    await saveCfg(req.body || {})
    io.emit('cfg', pubCfg())
    res.json({ cfg })
  })

  app.get('/api/admin/msgs', modr, async (req, res) => {
    const rows = await db.q(`select m.id,m.text,m.created_at,m.deleted,m.bot,u.id uid,u.name from msgs m left join users u on u.id=m.user_id order by m.id desc limit 200`)
    res.json({ rows })
  })
  app.delete('/api/admin/msgs/:id', modr, async (req, res) => {
    await db.q('update msgs set deleted=true where id=$1', [+req.params.id])
    io.to('g').emit('del', +req.params.id)
    res.json({ ok: 1 })
  })
  app.post('/api/admin/chat/clear', adm, async (req, res) => {
    await db.q('update msgs set deleted=true where not deleted')
    io.to('g').emit('clear')
    res.json({ ok: 1 })
  })
  app.post('/api/admin/chat/say', adm, async (req, res) => {
    const t = String(req.body?.text || '').trim().slice(0, 1000)
    if (!t) return res.status(400).json({ e: 'Пусто' })
    io.to('g').emit('sys', '📢 ' + t)
    res.json({ ok: 1 })
  })

  const KP = {
    type: `Придумай рабочий фрагмент кода на Python на {lines} строк по этой теме для скоростной печати. Без комментариев и докстрингов, без input(), код должен запускаться и что-то печатать, отступ 4 пробела.
Верни JSON {"title": "короткое название по-русски", "descr": "одно предложение по-русски, чему учит", "code": "код"}`,
    quiz: `Придумай вопрос «что выведет этот код?». Код на Python 4-12 строк, детерминированный (без random, времени и input), печатает одну короткую строку. Дай 4 варианта ответа, ровно один верный, остальные правдоподобные ошибки новичка. Внимательно проверь вывод, выполнив код в уме по шагам.
Верни JSON {"title": "...", "descr": "одно предложение по-русски", "code": "код", "q": "Что выведет этот код?", "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"], "answer": индекс_верного_от_0, "explain": "короткое объяснение по-русски, почему так"}`,
    fix: `Придумай задание «найди и исправь ошибку». Рабочий код на Python 6-15 строк, в котором ровно одна ошибка (логическая или синтаксическая, типичная для новичка). Исправление должно менять одну строку.
Верни JSON {"title": "...", "descr": "одно предложение по-русски, что код должен делать", "code": "код с ошибкой", "fixed": "тот же код, но исправленный", "hint": "подсказка по-русски, не раскрывающая ответ", "explain": "в чём была ошибка, по-русски"}`,
    fill: `Придумай задание «допиши пропуски». Рабочий код на Python 6-15 строк. Замени 2-4 ключевых места (ключевое слово, имя функции, оператор или короткое выражение) на пропуски в виде {{правильный_ответ}}. Если подходит несколько ответов, перечисли их через |, например {{+=|= total +}}.
Верни JSON {"title": "...", "descr": "одно предложение по-русски", "code": "код с пропусками {{...}}", "hint": "подсказка по-русски", "explain": "короткое объяснение по-русски"}`,
    test: `Придумай тест из 5 вопросов по этой теме для изучающих Python. В каждом вопросе 4 варианта, ровно один верный, остальные правдоподобные ошибки новичка. Если вопрос про конкретный код, положи короткий код (1-6 строк) в поле code, иначе оставь пустую строку. Проверь каждый ответ внимательно.
Верни JSON {"title": "Тест: ...", "descr": "одно предложение по-русски", "qs": [{"q": "вопрос по-русски", "code": "", "options": ["...", "...", "...", "..."], "answer": индекс_верного_от_0, "explain": "короткое объяснение по-русски"}]}`,
    next: `Придумай задание «какая строка будет дальше». Начало рабочей программы на Python 3-10 строк, оборванное в месте, где следующая строка однозначна. Дай 4 варианта следующей строки (с правильными отступами), ровно один верный, остальные типичные ошибки новичка: неверный отступ, не та переменная, не тот оператор.
Верни JSON {"title": "Что дальше: ...", "descr": "одно предложение по-русски", "code": "начало кода", "options": ["строка 1", "строка 2", "строка 3", "строка 4"], "answer": индекс_верного_от_0, "hint": "подсказка по-русски", "explain": "короткое объяснение по-русски"}`,
    trim: `Придумай задание «убери лишний код». Рабочая программа на Python 6-14 строк, в которую добавлены 1-2 лишние строки. Без них программа делает ровно то, что написано в описании, а с ними результат неверный или печатается лишнее. Лишние строки не должны ломать синтаксис при удалении.
Верни JSON {"title": "Убери лишнее: ...", "descr": "что должна сделать программа, по-русски", "code": "код вместе с лишними строками", "extra": [номера_лишних_строк_с_1], "hint": "подсказка по-русски", "explain": "почему эти строки лишние, по-русски"}`
  }

  app.post('/api/admin/ai-task', adm, async (req, res) => {
    const topic = String(req.body?.topic || 'циклы').slice(0, 200), lvl = Math.min(3, Math.max(1, +req.body?.lvl || 1))
    const kind = KP[req.body?.kind] ? req.body.kind : 'type'
    const lines = [0, '10-15', '15-25', '25-40'][lvl]
    const txt = await ask([
      { role: 'system', content: 'Ты составляешь задания для тренажёра программирования на Python. Идентификаторы и строки в коде на английском. Отвечай только JSON.' },
      { role: 'user', content: `Тема: ${topic}. Сложность ${lvl} из 3. ` + KP[kind].replace('{lines}', lines) }
    ], { json: true, max: 1800, temp: 0.7 })
    let j
    try { j = JSON.parse(txt) } catch (e) { return res.status(500).json({ e: 'ИИ вернул что-то непонятное, попробуй ещё раз' }) }
    const code = String(j.code || '').replace(/\t/g, '    ')
    const meta = {}
    if (kind === 'quiz') Object.assign(meta, { q: String(j.q || 'Что выведет этот код?'), options: Array.isArray(j.options) ? j.options.map(String) : [], answer: Math.max(0, +j.answer || 0), explain: String(j.explain || '') })
    if (kind === 'fix') Object.assign(meta, { fixed: String(j.fixed || '').replace(/\t/g, '    '), hint: String(j.hint || ''), explain: String(j.explain || '') })
    if (kind === 'fill') Object.assign(meta, { hint: String(j.hint || ''), explain: String(j.explain || '') })
    if (kind === 'next') Object.assign(meta, { q: 'Какая строка будет дальше?', options: Array.isArray(j.options) ? j.options.map(String) : [], answer: Math.max(0, +j.answer || 0), hint: String(j.hint || ''), explain: String(j.explain || '') })
    if (kind === 'trim') Object.assign(meta, { extra: Array.isArray(j.extra) ? j.extra.map(Number).filter(n => n > 0) : [], hint: String(j.hint || ''), explain: String(j.explain || '') })
    if (kind === 'test') Object.assign(meta, { qs: (Array.isArray(j.qs) ? j.qs : []).slice(0, 10).map(q => ({ q: String(q.q || ''), code: String(q.code || ''), options: Array.isArray(q.options) ? q.options.map(String) : [], answer: Math.max(0, +q.answer || 0), explain: String(q.explain || '') })) })
    res.json({ title: String(j.title || topic), descr: String(j.descr || ''), code, kind, meta: JSON.stringify(meta, null, 2) })
  })
}
