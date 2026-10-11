import { db } from './db.js'
import { cfg, saveCfg, pubCfg } from './util.js'
import { ask } from './ai.js'
import { onlineN } from './chat.js'

const T = {
  tasks: { f: ['league_id', 'title', 'descr', 'kind', 'code', 'lvl', 'min_wpm', 'min_acc', 'coins', 'xp', 'ord', 'active', 'meta'], o: 'ord,id' },
  leagues: { f: ['name', 'icon', 'color', 'ord', 'reward'], o: 'ord,id' },
  items: { f: ['kind', 'name', 'value', 'price', 'ord', 'active'], o: 'kind,ord,id' }
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

  app.post('/api/admin/ai-task', adm, async (req, res) => {
    const topic = String(req.body?.topic || 'циклы').slice(0, 200), lvl = Math.min(3, Math.max(1, +req.body?.lvl || 1))
    const lines = [0, '10-15', '15-25', '25-40'][lvl]
    const txt = await ask([
      { role: 'system', content: 'Ты составляешь задания для тренажёра скоростной печати кода на Python. Отвечай только JSON.' },
      { role: 'user', content: `Тема: ${topic}. Сложность ${lvl} из 3. Придумай рабочий фрагмент кода на Python на ${lines} строк по этой теме. ` +
        'Требования к коду: идентификаторы и строки на английском, без комментариев и докстрингов, без input(), код должен запускаться и что-то печатать, отступ 4 пробела. ' +
        'Верни JSON вида {"title": "короткое название по-русски", "descr": "одно предложение по-русски, чему учит", "code": "код"}' }
    ], { json: true, max: 1600, temp: 0.7 })
    let j
    try { j = JSON.parse(txt) } catch (e) { return res.status(500).json({ e: 'ИИ вернул что-то непонятное, попробуй ещё раз' }) }
    res.json({ title: String(j.title || topic), descr: String(j.descr || ''), code: String(j.code || '').replace(/\t/g, '    ') })
  })
}
