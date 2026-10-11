import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath, pathToFileURL } from 'url'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { db, schema } from './db.js'
import { seed } from './seed.js'
import { cfg, loadCfg, pubCfg, lim, pu, expChars, uSel } from './util.js'
import { ask, quota, left, SYS } from './ai.js'
import chat from './chat.js'
import admin from './admin.js'

const dir = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const PROD = process.env.NODE_ENV === 'production'
const ADMINS = String(process.env.ADMIN || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)

await db.ex(schema)
await seed()
await loadCfg()

let SECRET = process.env.JWT_SECRET
if (!SECRET) {
  const r = await db.one("select v from kv where k='secret'")
  SECRET = r?.v?.s
  if (!SECRET) {
    SECRET = crypto.randomBytes(32).toString('hex')
    await db.q("insert into kv(k,v) values('secret',$1)", [JSON.stringify({ s: SECRET })])
  }
}

const app = express()
const srv = http.createServer(app)
const io = new Server(srv, { cors: { origin: false }, maxHttpBufferSize: 1e4 })

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://cdn.jsdelivr.net'],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: PROD ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

async function getUser(tok) {
  if (!tok) return null
  try {
    const p = jwt.verify(tok, SECRET)
    const u = await db.one(uSel + ' where id=$1', [p.id])
    if (!u || u.banned) return null
    return u
  } catch (e) {
    return null
  }
}

const who = c => getUser(String(c || '').split(';').map(s => s.trim()).find(s => s.startsWith('tk='))?.slice(3))

app.use(async (req, res, next) => {
  req.u = null
  if (req.path.startsWith('/api/')) {
    req.u = await getUser(req.cookies.tk)
    if (req.u && Date.now() - new Date(req.u.seen_at) > 120e3) db.q('update users set seen_at=now() where id=$1', [req.u.id]).catch(() => {})
  }
  next()
})

const need = (req, res, next) => req.u ? next() : res.status(401).json({ e: 'Нужно войти' })
const adm = (req, res, next) => req.u?.role === 'admin' ? next() : res.status(403).json({ e: 'Только для админа' })
const modr = (req, res, next) => ['admin', 'mod'].includes(req.u?.role) ? next() : res.status(403).json({ e: 'Нет прав' })

function setTok(res, u) {
  res.cookie('tk', jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' }), {
    httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 30 * 864e5
  })
}

app.get('/healthz', (req, res) => res.send('ok'))

app.get('/api/me', async (req, res) => {
  res.json({ u: pu(req.u), cfg: pubCfg(), ai_left: req.u ? await left(req.u) : 0 })
})

app.post('/api/register', async (req, res) => {
  if (!cfg.reg) return res.status(403).json({ e: 'Регистрация сейчас закрыта' })
  if (!lim('reg' + req.ip, 5, 3600e3)) return res.status(429).json({ e: 'Слишком много регистраций, попробуй позже' })
  const name = String(req.body?.name || '').trim(), pass = String(req.body?.pass || '')
  if (!/^[A-Za-z0-9_а-яА-ЯёЁ]{3,20}$/.test(name)) return res.status(400).json({ e: 'Ник: 3-20 символов, буквы, цифры и _' })
  if (pass.length < 6 || pass.length > 100) return res.status(400).json({ e: 'Пароль минимум 6 символов' })
  if (await db.one('select 1 from users where lower(name)=lower($1)', [name])) return res.status(400).json({ e: 'Такой ник уже занят' })
  const first = (await db.one('select count(*)::int n from users')).n === 0
  const role = first || ADMINS.includes(name.toLowerCase()) ? 'admin' : 'user'
  const u = await db.one('insert into users(name,pass,role,coins) values($1,$2,$3,$4) returning id', [name, await bcrypt.hash(pass, 10), role, 50])
  setTok(res, u)
  res.json({ u: pu(await db.one(uSel + ' where id=$1', [u.id])) })
})

app.post('/api/login', async (req, res) => {
  if (!lim('login' + req.ip, 12, 600e3)) return res.status(429).json({ e: 'Слишком много попыток, подожди 10 минут' })
  const name = String(req.body?.name || '').trim(), pass = String(req.body?.pass || '')
  const u = await db.one(uSel + ' where lower(name)=lower($1)', [name])
  if (!u || !(await bcrypt.compare(pass, u.pass))) return res.status(400).json({ e: 'Неверный ник или пароль' })
  if (u.banned) return res.status(403).json({ e: 'Аккаунт заблокирован' })
  if (ADMINS.includes(u.name.toLowerCase()) && u.role !== 'admin') {
    await db.q("update users set role='admin' where id=$1", [u.id])
    u.role = 'admin'
  }
  setTok(res, u)
  res.json({ u: pu(u) })
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('tk')
  res.json({ ok: 1 })
})

app.post('/api/me/pass', need, async (req, res) => {
  const u = await db.one('select pass from users where id=$1', [req.u.id])
  if (!(await bcrypt.compare(String(req.body?.old || ''), u.pass))) return res.status(400).json({ e: 'Старый пароль не подходит' })
  const p = String(req.body?.pass || '')
  if (p.length < 6) return res.status(400).json({ e: 'Новый пароль минимум 6 символов' })
  await db.q('update users set pass=$2 where id=$1', [req.u.id, await bcrypt.hash(p, 10)])
  res.json({ ok: 1 })
})

app.patch('/api/me', need, async (req, res) => {
  const bio = String(req.body?.bio ?? req.u.bio).slice(0, 160)
  await db.q('update users set bio=$2 where id=$1', [req.u.id, bio])
  res.json({ ok: 1 })
})

app.post('/api/daily', need, async (req, res) => {
  const r = await db.one(`update users set
    coins = coins + $2 + case when daily_at = current_date - 1 then least(streak, 6) * 5 else 0 end,
    streak = case when daily_at = current_date - 1 then streak + 1 else 1 end,
    daily_at = current_date
    where id=$1 and (daily_at is null or daily_at < current_date) returning coins, streak`, [req.u.id, cfg.daily])
  if (!r) return res.status(400).json({ e: 'Бонус уже забран, приходи завтра' })
  res.json({ coins: r.coins, streak: r.streak, gain: cfg.daily + Math.min(r.streak - 1, 6) * 5 })
})

async function opened(u, lid) {
  if (!lid || u?.role === 'admin') return true
  const ls = await db.q('select id from leagues order by ord,id')
  const i = ls.findIndex(x => x.id === lid)
  if (i <= 0) return true
  if (!u) return false
  return !!(await db.one('select 1 from cups where user_id=$1 and league_id=$2', [u.id, ls[i - 1].id]))
}

app.get('/api/leagues', async (req, res) => {
  const u = req.u
  const ls = await db.q('select * from leagues order by ord,id')
  const ts = await db.q('select id,league_id,title,descr,kind,lvl,min_wpm,min_acc,coins,xp,ord,length(code)::int len from tasks where active order by ord,id')
  const dn = u ? await db.q('select task_id,stars,best_wpm,best_acc from done where user_id=$1', [u.id]) : []
  const cp = u ? await db.q('select league_id from cups where user_id=$1', [u.id]) : []
  const D = Object.fromEntries(dn.map(d => [d.task_id, d])), C = new Set(cp.map(c => c.league_id))
  let op = true
  const out = ls.map(l => {
    const o = op || u?.role === 'admin'
    op = C.has(l.id)
    return { ...l, open: o, cup: C.has(l.id), tasks: ts.filter(t => t.league_id === l.id).map(t => ({ ...t, done: D[t.id] || null })) }
  })
  const free = ts.filter(t => !t.league_id)
  if (free.length) out.push({ id: 0, name: 'Разное', icon: '🧩', color: '#8a92a6', open: true, cup: false, reward: 0, tasks: free.map(t => ({ ...t, done: D[t.id] || null })) })
  res.json({ leagues: out })
})

app.get('/api/tasks/:id', async (req, res) => {
  const t = await db.one('select * from tasks where id=$1 and active', [+req.params.id])
  if (!t) return res.status(404).json({ e: 'Задание не найдено' })
  if (!(await opened(req.u, t.league_id))) return res.status(403).json({ e: 'Эта лига ещё закрыта. Получи кубок предыдущей лиги' })
  const lg = t.league_id ? await db.one('select id,name,icon,color from leagues where id=$1', [t.league_id]) : null
  const d = req.u ? await db.one('select stars,best_wpm,best_acc from done where user_id=$1 and task_id=$2', [req.u.id, t.id]) : null
  res.json({ task: t, league: lg, done: d })
})

app.post('/api/run/start', need, async (req, res) => {
  if (!lim('run' + req.u.id, 40, 60000)) return res.status(429).json({ e: 'Слишком часто' })
  let tid = req.body?.task ? +req.body.task : null
  if (tid) {
    const t = await db.one('select id,league_id from tasks where id=$1 and active', [tid])
    if (!t || !(await opened(req.u, t.league_id))) return res.status(403).json({ e: 'Задание недоступно' })
  }
  const id = crypto.randomUUID()
  await db.q('insert into runs(id,user_id,task_id) values($1,$2,$3)', [id, req.u.id, tid])
  if (Math.random() < 0.05) db.q("delete from runs where started_at < now() - interval '1 day'").catch(() => {})
  res.json({ run: id })
})

app.post('/api/run/finish', need, async (req, res) => {
  const b = req.body || {}, u = req.u
  const r = await db.one(`update runs set used=true where id=$1 and user_id=$2 and not used
    and started_at > now() - interval '3 hours' returning task_id, extract(epoch from now() - started_at) * 1000 as el`, [String(b.run || ''), u.id])
  if (!r) return res.status(400).json({ e: 'Сессия устарела, результат не засчитан' })
  const chars = Math.max(0, Math.min(50000, b.chars | 0))
  const keys = Math.max(chars, Math.min(100000, b.keys | 0))
  const errs = Math.max(0, Math.min(keys, b.errs | 0))
  const lft = Math.max(0, b.left | 0)
  const t = Math.max(+b.ms || 0, +r.el - 2500, 1500)
  const wpm = Math.round(chars / 5 / (t / 60000))
  const acc = keys ? Math.round((keys - errs) / keys * 100) : 0
  if (wpm > 220) return res.status(400).json({ e: 'Подозрительно быстро, результат не засчитан' })

  let task = null, passed = false, stars = 0, gc = 0, gx = 0, cup = null, why = []
  if (r.task_id) {
    task = await db.one('select * from tasks where id=$1', [r.task_id])
    if (task) {
      const ex = expChars(task.code)
      if (chars < ex * 0.95) why.push('код набран не полностью')
      if (lft) why.push('остались неисправленные ошибки')
      if (acc < task.min_acc) why.push(`точность ниже ${task.min_acc}%`)
      if (wpm < task.min_wpm) why.push(`скорость ниже ${task.min_wpm} WPM`)
      passed = !why.length
      if (passed) {
        stars = 1 + (wpm >= task.min_wpm * 1.5 && acc >= 95 ? 1 : 0) + (wpm >= Math.max(task.min_wpm * 2, 20) && acc >= 98 ? 1 : 0)
        const d = await db.one('select * from done where user_id=$1 and task_id=$2', [u.id, task.id])
        if (!d) {
          gc = task.coins
          gx = task.xp
          await db.q('insert into done(user_id,task_id,best_wpm,best_acc,stars) values($1,$2,$3,$4,$5)', [u.id, task.id, wpm, acc, stars])
        } else {
          if (stars > d.stars) gc = Math.round(task.coins * 0.5 * (stars - d.stars))
          gx = Math.max(1, Math.round(task.xp / 5))
          await db.q('update done set best_wpm=greatest(best_wpm,$3),best_acc=greatest(best_acc,$4),stars=greatest(stars,$5) where user_id=$1 and task_id=$2', [u.id, task.id, wpm, acc, stars])
        }
        if (task.league_id) {
          const lg = await db.one(`select l.*,
            (select count(*)::int from tasks t where t.league_id=l.id and t.active) total,
            (select count(*)::int from done d join tasks t on t.id=d.task_id where d.user_id=$2 and t.league_id=l.id and t.active) got
            from leagues l where l.id=$1`, [task.league_id, u.id])
          if (lg && lg.total > 0 && lg.got >= lg.total) {
            const ins = await db.one('insert into cups(user_id,league_id) values($1,$2) on conflict do nothing returning league_id', [u.id, lg.id])
            if (ins) {
              cup = { id: lg.id, name: lg.name, icon: lg.icon, color: lg.color, reward: lg.reward }
              gc += lg.reward
            }
          }
        }
      }
    }
  } else if (acc >= 75 && chars >= 30) {
    gx = Math.floor(chars / 25)
    if (cfg.practice) {
      const want = Math.floor(chars / 80)
      const p = await db.one('update users set pc_n=case when pc_day=current_date then pc_n else 0 end, pc_day=current_date where id=$1 returning pc_n', [u.id])
      gc = Math.max(0, Math.min(want, 60 - p.pc_n))
      if (gc) await db.q('update users set pc_n=pc_n+$2 where id=$1', [u.id, gc])
    }
  }

  const em = { ...(u.emap || {}) }
  if (b.emap && typeof b.emap === 'object') {
    for (const [k, v] of Object.entries(b.emap).slice(0, 80)) {
      if ([...k].length !== 1) continue
      em[k] = Math.min(99999, (em[k] || 0) + Math.min(500, Math.max(0, v | 0)))
    }
  }
  const emk = Object.entries(em).sort((a, b) => b[1] - a[1]).slice(0, 60)
  const best = passed || (!task && chars >= 150 && acc >= 90) ? wpm : 0
  const nb = best > u.best_wpm
  await db.q('update users set coins=coins+$2, xp=xp+$3, best_wpm=greatest(best_wpm,$4), emap=$5 where id=$1', [u.id, gc, gx, best, JSON.stringify(Object.fromEntries(emk))])
  await db.q('insert into results(user_id,task_id,wpm,acc,ms,chars,errs,xp,passed) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [u.id, r.task_id, wpm, acc, Math.round(t), chars, errs, gx, passed])
  const nu = await db.one(uSel + ' where id=$1', [u.id])
  res.json({ wpm, acc, passed, stars, why, coins: gc, xp: gx, cup, best: nb, u: pu(nu) })
})

app.get('/api/top', async (req, res) => {
  const by = String(req.query.by || 'xp')
  const base = `select u.id,u.name,u.avatar,u.frame,u.title,u.ncolor,u.xp,u.best_wpm,u.role,
    (select count(*)::int from cups c where c.user_id=u.id) cups,
    (select l.icon from cups c join leagues l on l.id=c.league_id where c.user_id=u.id order by l.ord desc limit 1) lg`
  let rows
  if (by === 'week') {
    rows = await db.q(`${base}, w.s::int score from users u join (select user_id, sum(xp) s from results where created_at > now() - interval '7 days' group by user_id) w on w.user_id=u.id where not u.banned order by w.s desc limit 50`)
  } else {
    const o = { wpm: 'best_wpm desc, xp desc', cups: 'cups desc, xp desc' }[by] || 'xp desc'
    rows = await db.q(`select * from (${base} from users u where not u.banned) x order by ${o} limit 50`)
  }
  res.json({ rows })
})

app.get('/api/u/:name', async (req, res) => {
  const u = await db.one(`select id,name,role,xp,best_wpm,avatar,frame,title,ncolor,bio,streak,created_at,seen_at,emap,
    (select count(*)::int + 1 from users x where x.xp > users.xp and not x.banned) rank
    from users where lower(name)=lower($1) and not banned`, [String(req.params.name)])
  if (!u) return res.status(404).json({ e: 'Пользователь не найден' })
  const cups = await db.q('select l.id,l.name,l.icon,l.color,c.at from cups c join leagues l on l.id=c.league_id where c.user_id=$1 order by l.ord', [u.id])
  const recent = await db.q(`select r.wpm,r.acc,r.ms,r.chars,r.passed,r.xp,r.created_at,t.title from results r left join tasks t on t.id=r.task_id
    where r.user_id=$1 order by r.id desc limit 40`, [u.id])
  const st = await db.one(`select count(*)::int runs, coalesce(sum(chars),0)::int chars, coalesce(sum(ms),0)::bigint ms,
    (select count(*)::int from done where user_id=$1) done, (select coalesce(sum(stars),0)::int from done where user_id=$1) stars
    from results where user_id=$1`, [u.id])
  const own = req.u?.id === u.id
  if (!own) delete u.emap
  res.json({ u, cups, recent, st: { ...st, ms: +st.ms }, own })
})

app.get('/api/shop', async (req, res) => {
  const items = await db.q('select id,kind,name,value,price from items where active order by kind,ord,price')
  const own = req.u ? (await db.q('select item_id from inv where user_id=$1', [req.u.id])).map(x => x.item_id) : []
  res.json({ items, own })
})

const SLOT = { avatar: 'avatar', frame: 'frame', title: 'title', theme: 'theme', color: 'ncolor' }
const DEFV = { avatar: '🐍', frame: '', title: '', theme: '', color: '' }

app.post('/api/shop/buy', need, async (req, res) => {
  if (!cfg.shop) return res.status(403).json({ e: 'Магазин закрыт' })
  const it = await db.one('select * from items where id=$1 and active', [+req.body?.id])
  if (!it) return res.status(404).json({ e: 'Нет такого товара' })
  const ins = await db.one('insert into inv(user_id,item_id) values($1,$2) on conflict do nothing returning item_id', [req.u.id, it.id])
  if (!ins) return res.status(400).json({ e: 'Уже куплено' })
  const r = await db.one('update users set coins=coins-$2 where id=$1 and coins>=$2 returning coins', [req.u.id, it.price])
  if (!r) {
    await db.q('delete from inv where user_id=$1 and item_id=$2', [req.u.id, it.id])
    return res.status(400).json({ e: 'Не хватает монет' })
  }
  res.json({ coins: r.coins })
})

app.post('/api/shop/equip', need, async (req, res) => {
  const kind = String(req.body?.kind || ''), id = +req.body?.id || 0
  if (!SLOT[kind]) return res.status(400).json({ e: 'Неизвестный слот' })
  let v = DEFV[kind]
  if (id) {
    const it = await db.one('select * from items where id=$1 and kind=$2', [id, kind])
    if (!it) return res.status(404).json({ e: 'Нет такого товара' })
    if (it.price > 0 && !(await db.one('select 1 from inv where user_id=$1 and item_id=$2', [req.u.id, id]))) return res.status(403).json({ e: 'Сначала купи' })
    v = it.value
  }
  await db.q(`update users set ${SLOT[kind]}=$2 where id=$1`, [req.u.id, v])
  res.json({ u: pu(await db.one(uSel + ' where id=$1', [req.u.id])) })
})

app.post('/api/ai', need, async (req, res) => {
  if (!cfg.ai.on) return res.status(403).json({ e: 'ИИ выключен админом' })
  if (!lim('ai' + req.u.id, 8, 60000)) return res.status(429).json({ e: 'Слишком часто, подожди минуту' })
  const q = await quota(req.u)
  if (!q.ok) return res.status(429).json({ e: 'Лимит вопросов на сегодня закончился. Завтра будет новый' })
  const b = req.body || {}
  let msgs = [{ role: 'system', content: SYS }]
  if (b.mode === 'explain') {
    msgs.push({ role: 'user', content: 'Объясни этот код коротко и понятно новичку: что он делает в целом и что интересного в ключевых строках. Без пересказа каждой строки.\n\n```python\n' + String(b.code || '').slice(0, 6000) + '\n```' })
  } else if (b.mode === 'tips') {
    msgs.push({ role: 'user', content: 'Я тренирую скоростную печать кода. Чаще всего ошибаюсь на символах: ' + String(b.chars || '').slice(0, 100) + '. Моя скорость ' + (+b.wpm || 0) + ' WPM. Дай 5 конкретных советов, как перестать ошибаться на этих символах и печатать быстрее.' })
  } else {
    const h = Array.isArray(b.msgs) ? b.msgs.slice(-12) : []
    for (const m of h) if (['user', 'assistant'].includes(m?.role)) msgs.push({ role: m.role, content: String(m.content || '').slice(0, 4000) })
    if (msgs.length < 2) return res.status(400).json({ e: 'Пустой вопрос' })
  }
  try {
    const text = await ask(msgs, { max: 1200 })
    res.json({ text, left: q.left })
  } catch (e) {
    res.status(502).json({ e: e.message })
  }
})

const ctx = { app, io, db, cfg, need, adm, modr, ask }
admin(app, ctx)
chat(io, who)

const pdir = path.join(dir, 'plugins')
if (fs.existsSync(pdir)) {
  for (const f of fs.readdirSync(pdir).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
    try {
      const m = await import(pathToFileURL(path.join(pdir, f)).href)
      await m.default?.(ctx)
      console.log('плагин:', f)
    } catch (e) {
      console.error('плагин ' + f + ' упал:', e.message)
    }
  }
}

app.use('/api', (req, res) => res.status(404).json({ e: 'Нет такого адреса' }))
app.use(express.static(path.join(dir, '..', 'public'), { maxAge: PROD ? '1h' : 0 }))
app.use((req, res, next) => req.method === 'GET' ? res.sendFile(path.join(dir, '..', 'public', 'index.html')) : next())
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ e: err.type === 'entity.parse.failed' ? 'Кривой JSON' : 'Ошибка сервера' })
})

srv.listen(PORT, () => console.log('pytype запущен: http://localhost:' + PORT))
