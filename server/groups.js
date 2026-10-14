import crypto from 'crypto'
import { db } from './db.js'
import { lim } from './util.js'
import { clean, censor } from './chat.js'
import { note } from './social.js'

const OWN = 3, MAX = 10, CAP = 50
const ICONS = ['👥', '🐍', '🔥', '⚡', '🚀', '🎯', '🧠', '💻', '🏆', '🦊', '🐺', '🦉', '🌙', '⭐', '🎮', '📚']
const code = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7)
const uCols = 'u.id,u.name,u.avatar,u.frame,u.ncolor,u.title,u.xp,u.best_wpm'

function form(b, part) {
  const o = {}
  if (!part || 'name' in b) {
    const n = censor(clean(b.name).replace(/\n/g, ' ')).slice(0, 32).trim()
    if (n.length < 3) return { e: 'Название от 3 до 32 символов' }
    o.name = n
  }
  if (!part || 'descr' in b) o.descr = censor(clean(b.descr)).slice(0, 200)
  if (!part || 'icon' in b) o.icon = ICONS.includes(b.icon) ? b.icon : '👥'
  if (!part || 'open' in b) o.open = b.open !== false && b.open !== 'false'
  return o
}

async function info(gid) {
  return db.one('select g.*, (select count(*)::int from grp_members m where m.group_id=g.id) n from grps g where g.id=$1', [gid])
}
const role = async (gid, uid) => uid ? (await db.one('select role from grp_members where group_id=$1 and user_id=$2', [gid, uid]))?.role || null : null

async function join(g, u) {
  const c = await db.one('select count(*)::int n from grp_members where user_id=$1', [u.id])
  if (c.n >= MAX) return { e: `Можно состоять максимум в ${MAX} группах` }
  if (g.n >= CAP) return { e: 'В группе уже нет мест' }
  const r = await db.one('insert into grp_members(group_id,user_id) values($1,$2) on conflict do nothing returning user_id', [g.id, u.id])
  if (r && g.owner && g.owner !== u.id) note(g.owner, 'gjoin', { name: u.name, g: g.name, id: g.id }).catch(() => {})
  return { ok: 1, id: g.id }
}

export default function groups(app, { need }) {
  app.get('/api/groups', async (req, res) => {
    const u = req.u, q = String(req.query.q || '').trim().slice(0, 32)
    const mine = u ? await db.q(`select g.id,g.name,g.icon,g.descr,g.open,m.role,
      (select count(*)::int from grp_members x where x.group_id=g.id) n
      from grp_members m join grps g on g.id=m.group_id where m.user_id=$1 order by m.at`, [u.id]) : []
    const p = [u?.id || 0]
    let w = ''
    if (q) { p.push('%' + q.replace(/[%_]/g, '') + '%'); w = 'and g.name ilike $2' }
    const open = await db.q(`select g.id,g.name,g.icon,g.descr,
      (select count(*)::int from grp_members x where x.group_id=g.id) n,
      (select coalesce(sum(r.xp),0)::int from results r join grp_members x on x.user_id=r.user_id where x.group_id=g.id and r.created_at > now() - interval '7 days') wxp
      from grps g where g.open and not exists (select 1 from grp_members m where m.group_id=g.id and m.user_id=$1) ${w}
      order by n desc, g.id desc limit 30`, p)
    res.json({ mine, open, icons: ICONS, own: OWN, max: MAX })
  })

  app.post('/api/groups', need, async (req, res) => {
    if (!lim('gnew' + req.u.id, 5, 3600e3)) return res.status(429).json({ e: 'Слишком часто, подожди немного' })
    const f = form(req.body || {})
    if (f.e) return res.status(400).json(f)
    const o = await db.one('select count(*)::int n from grps where owner=$1', [req.u.id])
    if (o.n >= OWN) return res.status(400).json({ e: `Можно создать максимум ${OWN} группы` })
    const c = await db.one('select count(*)::int n from grp_members where user_id=$1', [req.u.id])
    if (c.n >= MAX) return res.status(400).json({ e: `Можно состоять максимум в ${MAX} группах` })
    const g = await db.one('insert into grps(name,icon,descr,open,owner,code) values($1,$2,$3,$4,$5,$6) returning id', [f.name, f.icon, f.descr, f.open, req.u.id, code()])
    await db.q("insert into grp_members(group_id,user_id,role) values($1,$2,'owner')", [g.id, req.u.id])
    res.json({ id: g.id })
  })

  app.get('/api/groups/:id', async (req, res) => {
    const g = await info(+req.params.id)
    if (!g) return res.status(404).json({ e: 'Группа не найдена' })
    const me = await role(g.id, req.u?.id), adm = req.u?.role === 'admin'
    const base = { id: g.id, name: g.name, icon: g.icon, descr: g.descr, open: g.open, n: g.n, me, created_at: g.created_at }
    if (!me && !g.open && !adm) return res.json({ ...base, closed: true })
    const members = await db.q(`select ${uCols}, m.role, m.at,
      (select coalesce(sum(r.xp),0)::int from results r where r.user_id=u.id and r.created_at > now() - interval '7 days') wxp,
      (select coalesce(max(r.wpm),0)::int from results r where r.user_id=u.id and r.created_at > now() - interval '7 days') wwpm,
      (select count(*)::int from results r where r.user_id=u.id and r.created_at > now() - interval '7 days') wruns
      from grp_members m join users u on u.id=m.user_id where m.group_id=$1 and not u.banned order by wxp desc, u.xp desc`, [g.id])
    const tot = members.reduce((a, x) => ({ xp: a.xp + x.wxp, runs: a.runs + x.wruns }), { xp: 0, runs: 0 })
    res.json({ ...base, code: me ? g.code : undefined, members, tot, owner: g.owner })
  })

  app.post('/api/groups/join', need, async (req, res) => {
    const c = String(req.body?.code || '').trim().replace(/.*\//, '')
    if (!lim('gjoin' + req.u.id, 20, 600e3)) return res.status(429).json({ e: 'Слишком много попыток, подожди немного' })
    const r = await db.one('select id from grps where code=$1', [c])
    if (!r) return res.status(404).json({ e: 'Приглашение не найдено или устарело' })
    const g = await info(r.id)
    const x = await join(g, req.u)
    res.status(x.e ? 400 : 200).json(x)
  })

  app.post('/api/groups/:id/join', need, async (req, res) => {
    const g = await info(+req.params.id)
    if (!g) return res.status(404).json({ e: 'Группа не найдена' })
    if (!g.open) return res.status(403).json({ e: 'Это закрытая группа, нужна ссылка-приглашение' })
    const x = await join(g, req.u)
    res.status(x.e ? 400 : 200).json(x)
  })

  app.post('/api/groups/:id/leave', need, async (req, res) => {
    const g = await info(+req.params.id)
    if (!g) return res.status(404).json({ e: 'Группа не найдена' })
    await db.q('delete from grp_members where group_id=$1 and user_id=$2', [g.id, req.u.id])
    if (g.owner === req.u.id) {
      const nx = await db.one('select user_id from grp_members where group_id=$1 order by (role=\'admin\') desc, at limit 1', [g.id])
      if (!nx) await db.q('delete from grps where id=$1', [g.id])
      else {
        await db.q('update grps set owner=$2 where id=$1', [g.id, nx.user_id])
        await db.q("update grp_members set role='owner' where group_id=$1 and user_id=$2", [g.id, nx.user_id])
      }
    }
    res.json({ ok: 1 })
  })

  const boss = async (req, res, next) => {
    const g = await info(+req.params.id)
    if (!g) return res.status(404).json({ e: 'Группа не найдена' })
    const r = await role(g.id, req.u.id)
    if (r !== 'owner' && r !== 'admin' && req.u.role !== 'admin') return res.status(403).json({ e: 'Это может только создатель группы' })
    req.g = g; req.gr = req.u.role === 'admin' ? 'owner' : r
    next()
  }

  app.patch('/api/groups/:id', need, boss, async (req, res) => {
    const f = form(req.body || {}, true)
    if (f.e) return res.status(400).json(f)
    const k = Object.keys(f)
    if (k.length) await db.q(`update grps set ${k.map((x, i) => `${x}=$${i + 2}`).join(',')} where id=$1`, [req.g.id, ...k.map(x => f[x])])
    res.json({ ok: 1 })
  })

  app.post('/api/groups/:id/code', need, boss, async (req, res) => {
    const c = code()
    await db.q('update grps set code=$2 where id=$1', [req.g.id, c])
    res.json({ code: c })
  })

  app.post('/api/groups/:id/kick', need, boss, async (req, res) => {
    const uid = +req.body?.uid
    const r = await role(req.g.id, uid)
    if (!r || r === 'owner' || (r === 'admin' && req.gr !== 'owner')) return res.status(400).json({ e: 'Этого участника убрать нельзя' })
    await db.q('delete from grp_members where group_id=$1 and user_id=$2', [req.g.id, uid])
    res.json({ ok: 1 })
  })

  app.post('/api/groups/:id/role', need, boss, async (req, res) => {
    if (req.gr !== 'owner') return res.status(403).json({ e: 'Это может только создатель группы' })
    const uid = +req.body?.uid, to = req.body?.role === 'admin' ? 'admin' : 'member'
    const r = await role(req.g.id, uid)
    if (!r || r === 'owner') return res.status(400).json({ e: 'Нельзя' })
    await db.q('update grp_members set role=$3 where group_id=$1 and user_id=$2', [req.g.id, uid, to])
    res.json({ ok: 1 })
  })

  app.delete('/api/groups/:id', need, boss, async (req, res) => {
    if (req.gr !== 'owner') return res.status(403).json({ e: 'Удалить группу может только создатель' })
    await db.q('delete from grps where id=$1', [req.g.id])
    res.json({ ok: 1 })
  })

  app.get('/api/groups/:id/msgs', need, async (req, res) => {
    const gid = +req.params.id
    if (!(await role(gid, req.u.id)) && req.u.role !== 'admin') return res.status(403).json({ e: 'Сначала вступи в группу' })
    const after = +req.query.after || 0
    const rows = await db.q(`select x.id mid,x.text,x.at,u.id uid,u.name,u.avatar,u.frame,u.ncolor from grp_msgs x join users u on u.id=x.user_id
      where x.group_id=$1 and x.id>$2 order by x.id desc limit 60`, [gid, after])
    res.json({ rows: rows.reverse().map(r => ({ id: r.mid, text: r.text, at: r.at, u: { id: r.uid, name: r.name, avatar: r.avatar, frame: r.frame, ncolor: r.ncolor } })) })
  })

  app.post('/api/groups/:id/msgs', need, async (req, res) => {
    const gid = +req.params.id
    if (!(await role(gid, req.u.id))) return res.status(403).json({ e: 'Сначала вступи в группу' })
    if (req.u.muted_until && new Date(req.u.muted_until) > new Date()) return res.status(403).json({ e: 'Ты в муте, писать пока нельзя' })
    if (!lim('gm' + req.u.id, 1, 1500) || !lim('gmm' + req.u.id, 15, 60e3)) return res.status(429).json({ e: 'Не так быстро' })
    const tx = censor(clean(req.body?.text)).slice(0, 400)
    if (!tx) return res.status(400).json({ e: 'Пустое сообщение' })
    const last = await db.one('select text from grp_msgs where group_id=$1 and user_id=$2 order by id desc limit 1', [gid, req.u.id])
    if (last?.text === tx) return res.status(400).json({ e: 'Ты это уже писал' })
    const r = await db.one('insert into grp_msgs(group_id,user_id,text) values($1,$2,$3) returning id,at', [gid, req.u.id, tx])
    if (Math.random() < 0.05) db.q('delete from grp_msgs where group_id=$1 and id < (select min(id) from (select id from grp_msgs where group_id=$1 order by id desc limit 500) z)', [gid]).catch(() => {})
    res.json({ id: r.id })
  })
}
