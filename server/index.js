import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath, pathToFileURL } from 'url'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { db, schema, TZ } from './db.js'
import { seed } from './seed.js'
import { cfg, loadCfg, pubCfg, lim, pu, expChars, uSel } from './util.js'
import { ask, quota, left, SYS } from './ai.js'
import chat from './chat.js'
import admin from './admin.js'
import duel from './duel.js'
import oauth from './oauth.js'
import { setIo, bump, check, feed, note, questList, claim, feedList, react, ACH, lvl } from './social.js'
import { initPush, pushKey, remindStreaks } from './push.js'
import * as tourn from './tourn.js'

const dir = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const PROD = process.env.NODE_ENV === 'production'
const ADMINS = String(process.env.ADMIN || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)

await db.ex(schema)
await seed()
await loadCfg()
await initPush().catch(e => console.error('push init:', e.message))

process.on('unhandledRejection', e => console.error('unhandled:', e))

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
setIo(io)

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ytimg.com', 'https://img.youtube.com', 'https://lh3.googleusercontent.com', 'https://avatars.githubusercontent.com'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://cdn.jsdelivr.net'],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: PROD ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))
app.use(compression())
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
io.use(async (s, next) => { try { s.data.u = await who(s.handshake.headers.cookie) } catch (e) { s.data.u = null } next() })

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
oauth(app, { setTok, getUser, admins: ADMINS })

app.get('/api/me', async (req, res) => {
  const unread = req.u ? (await db.one('select count(*)::int n from notes where user_id=$1 and not read', [req.u.id])).n : 0
  res.json({ u: pu(req.u), cfg: pubCfg(), ai_left: req.u ? await left(req.u) : 0, unread })
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
  let u
  try {
    u = await db.one('insert into users(name,pass,role,coins) values($1,$2,$3,$4) returning id', [name, await bcrypt.hash(pass, 10), role, 50])
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ e: 'Такой ник уже занят' })
    throw e
  }
  setTok(res, u)
  feed(u.id, 'join', {}).catch(() => {})
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
  if (!lim('pass' + req.u.id, 6, 600e3)) return res.status(429).json({ e: 'Слишком много попыток, подожди 10 минут' })
  const u = await db.one('select pass from users where id=$1', [req.u.id])
  const viaOa = !req.body?.old && await db.one('select 1 from oauth where user_id=$1 limit 1', [req.u.id])
  if (!viaOa && !(await bcrypt.compare(String(req.body?.old || ''), u.pass))) return res.status(400).json({ e: 'Старый пароль не подходит' })
  const p = String(req.body?.pass || '')
  if (p.length < 6) return res.status(400).json({ e: 'Новый пароль минимум 6 символов' })
  await db.q('update users set pass=$2 where id=$1', [req.u.id, await bcrypt.hash(p, 10)])
  res.json({ ok: 1 })
})

app.patch('/api/me', need, async (req, res) => {
  const bio = String(req.body?.bio ?? req.u.bio).slice(0, 160)
  const name = String(req.body?.name ?? req.u.name).trim()
  if (name !== req.u.name) {
    if (!/^[A-Za-z0-9_а-яА-ЯёЁ]{3,20}$/.test(name)) return res.status(400).json({ e: 'Ник: 3-20 символов, буквы, цифры и _' })
    if (await db.one('select 1 from users where lower(name)=lower($1) and id<>$2', [name, req.u.id])) return res.status(400).json({ e: 'Такой ник уже занят' })
    if (ADMINS.includes(name.toLowerCase()) && req.u.role !== 'admin') return res.status(400).json({ e: 'Такой ник уже занят' })
    if (!lim('nm' + req.u.id, 3, 86400e3)) return res.status(429).json({ e: 'Ник можно менять не чаще трёх раз в день' })
  }
  try { await db.q('update users set bio=$2, name=$3 where id=$1', [req.u.id, bio, name]) } catch (e) {
    if (e.code === '23505') return res.status(400).json({ e: 'Такой ник уже занят' })
    throw e
  }
  res.json({ ok: 1, name })
})

app.post('/api/daily', need, async (req, res) => {
  const r = await db.one(`update users set
    coins = coins + $2 + case when daily_at = current_date - 1 then least(streak, 6) * 5 else 0 end,
    streak = case when daily_at = current_date - 1 then streak + 1 else 1 end,
    daily_at = current_date
    where id=$1 and (daily_at is null or daily_at < current_date) returning coins, streak`, [req.u.id, cfg.daily])
  if (!r) return res.status(400).json({ e: 'Бонус уже забран, приходи завтра' })
  check(req.u.id).catch(() => {})
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
  if (free.length) out.push({ id: 0, name: 'Головоломки', icon: '🧩', color: '#8a92a6', open: true, cup: false, reward: 0, tasks: free.map(t => ({ ...t, done: D[t.id] || null })) })
  res.json({ leagues: out })
})

const norm = s => String(s ?? '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '')
const loose = s => norm(s).split('\n').filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length + ':' + l.trim().replace(/\s+/g, '')).join('\n')
const outn = s => norm(s).split('\n').map(l => l.trim().replace(/\s+/g, ' ')).join('\n')
const BL = /\{\{([^{}\n]+?)\}\}/g

function pubTask(t) {
  if (!t || t.kind === 'type') return t
  const m = t.meta || {}
  if (t.kind === 'quiz' || t.kind === 'next') {
    const opts = Array.isArray(m.options) ? m.options.map(String) : null
    return { ...t, meta: { q: String(m.q || ''), options: opts, multi: !opts && String(m.answer ?? '').includes('\n'), hint: String(m.hint || '') } }
  }
  if (t.kind === 'test') return { ...t, meta: { qs: (Array.isArray(m.qs) ? m.qs : []).map(x => ({ q: String(x.q || ''), code: String(x.code || ''), options: (x.options || []).map(String) })) } }
  if (t.kind === 'trim') return { ...t, meta: { hint: String(m.hint || ''), n: Array.isArray(m.extra) ? m.extra.length : 0 } }
  if (t.kind === 'fix') return { ...t, meta: { hint: String(m.hint || '') } }
  if (t.kind === 'fill') {
    const w = []
    const code = String(t.code).replace(BL, (_, a) => { w.push(a.split('|')[0].trim().length); return '{{' + (w.length - 1) + '}}' })
    return { ...t, code, meta: { w, hint: String(m.hint || '') } }
  }
  return { ...t, meta: {} }
}

app.get('/api/tasks/:id', async (req, res) => {
  const t = await db.one('select * from tasks where id=$1 and active', [+req.params.id])
  if (!t) return res.status(404).json({ e: 'Задание не найдено' })
  if (!(await opened(req.u, t.league_id))) return res.status(403).json({ e: 'Эта лига ещё закрыта. Получи кубок предыдущей лиги' })
  const lg = t.league_id ? await db.one('select id,name,icon,color from leagues where id=$1', [t.league_id]) : null
  const d = req.u ? await db.one('select stars,best_wpm,best_acc from done where user_id=$1 and task_id=$2', [req.u.id, t.id]) : null
  res.json({ task: pubTask(t), league: lg, done: d })
})

app.post('/api/run/start', need, async (req, res) => {
  if (!lim('run' + req.u.id, 40, 60000)) return res.status(429).json({ e: 'Слишком часто' })
  let tid = req.body?.task ? +req.body.task : null, trn = null
  if (req.body?.tourn) {
    const t = await tourn.current()
    if (!t) return res.status(404).json({ e: 'Турнир сейчас не проводится' })
    trn = t.id; tid = null
  } else if (tid) {
    const t = await db.one("select id,league_id from tasks where id=$1 and active and kind='type'", [tid])
    if (!t || !(await opened(req.u, t.league_id))) return res.status(403).json({ e: 'Задание недоступно' })
  }
  const id = crypto.randomUUID()
  await db.q('insert into runs(id,user_id,task_id,tourn) values($1,$2,$3,$4)', [id, req.u.id, tid, trn])
  if (Math.random() < 0.05) db.q("delete from runs where started_at < now() - interval '1 day'").catch(() => {})
  res.json({ run: id })
})

async function grant(u, task, stars, wpm, acc) {
  let gc = 0, gx = 0, newStars = 0, firstPass = false, cup = null
  const ins = await db.one('insert into done(user_id,task_id,best_wpm,best_acc,stars) values($1,$2,$3,$4,$5) on conflict do nothing returning stars', [u.id, task.id, wpm, acc, stars])
  if (ins) {
    firstPass = true; newStars = stars; gc = task.coins; gx = task.xp
  } else {
    const o = await db.one(`with o as (select stars from done where user_id=$1 and task_id=$2 for update)
      update done d set best_wpm=greatest(d.best_wpm,$3), best_acc=greatest(d.best_acc,$4), stars=greatest(d.stars,$5)
      from o where d.user_id=$1 and d.task_id=$2 returning o.stars old`, [u.id, task.id, wpm, acc, stars])
    const old = o?.old ?? stars
    if (stars > old) { gc = Math.round(task.coins * 0.5 * (stars - old)); newStars = stars - old }
    gx = Math.max(1, Math.round(task.xp / 5))
  }
  if (task.league_id) {
    const lg = await db.one(`select l.*,
      (select count(*)::int from tasks t where t.league_id=l.id and t.active) total,
      (select count(*)::int from done d join tasks t on t.id=d.task_id where d.user_id=$2 and t.league_id=l.id and t.active) got
      from leagues l where l.id=$1`, [task.league_id, u.id])
    if (lg && lg.total > 0 && lg.got >= lg.total) {
      const c = await db.one('insert into cups(user_id,league_id) values($1,$2) on conflict do nothing returning league_id', [u.id, lg.id])
      if (c) {
        cup = { id: lg.id, name: lg.name, icon: lg.icon, color: lg.color, reward: lg.reward }
        gc += lg.reward
      }
    }
  }
  return { gc, gx, newStars, firstPass, cup }
}

async function after(u, task, g, stars) {
  if (g.firstPass) await feed(u.id, 'task', { t: task.title, s: stars })
  else if (g.newStars && stars === 3) await feed(u.id, 'task3', { t: task.title })
  if (g.cup) await feed(u.id, 'cup', { n: g.cup.name, i: g.cup.icon })
}

async function saveGhost(uid, tid, wpm, ms, tl, step) {
  step = Math.round(+step || 0)
  if (!Array.isArray(tl) || tl.length < 2 || tl.length > 3001 || step < 100 || step > 2000) return
  const a = tl.map(x => Math.max(0, Math.min(20000, x | 0)))
  const dur = (a.length - 1) * step
  if (Math.abs(dur - ms) > Math.max(1500, ms * 0.25)) return
  await db.q(`insert into ghosts(user_id,task_id,wpm,ms,step,tl) values($1,$2,$3,$4,$5,$6)
    on conflict(user_id,task_id) do update set wpm=excluded.wpm, ms=excluded.ms, step=excluded.step, tl=excluded.tl, at=now()
    where excluded.wpm > ghosts.wpm`, [uid, tid, wpm, Math.round(ms), step, JSON.stringify(a)])
}

app.post('/api/run/finish', need, async (req, res) => {
  const b = req.body || {}, u = req.u
  const r = await db.one(`update runs set used=true where id=$1 and user_id=$2 and not used
    and started_at > now() - interval '3 hours' returning task_id, tourn, extract(epoch from now() - started_at) * 1000 as el`, [String(b.run || ''), u.id])
  if (!r) return res.status(400).json({ e: 'Сессия устарела, результат не засчитан' })
  const chars = Math.max(0, Math.min(50000, b.chars | 0))
  const keys = Math.max(chars, Math.min(100000, b.keys | 0))
  const errs = Math.max(0, Math.min(keys, b.errs | 0))
  const lft = Math.max(0, b.left | 0)
  const t = Math.max(+b.ms || 0, +r.el - 2500, 1500)
  const wpm = Math.round(chars / 5 / (t / 60000))
  const acc = keys ? Math.round((keys - errs) / keys * 100) : 0
  if (wpm > 220) return res.status(400).json({ e: 'Подозрительно быстро, результат не засчитан' })

  let task = null, passed = false, stars = 0, gc = 0, gx = 0, why = [], g = null, tr = null
  if (r.tourn) {
    const tt = await db.one('select * from tourn where id=$1', [r.tourn])
    if (tt) {
      if (chars < expChars(tt.code) * 0.95) why.push('код набран не полностью')
      if (lft) why.push('остались неисправленные ошибки')
      if (acc < 85) why.push('точность ниже 85%')
      if (tt.prized) why.push('турнир уже закончился')
      passed = !why.length
      if (passed) tr = await tourn.enter(tt.id, u.id, wpm, acc, Math.round(t))
      if (acc >= 75) gx = Math.floor(chars / 25)
    }
  } else if (r.task_id) {
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
        g = await grant(u, task, stars, wpm, acc)
        gc = g.gc; gx = g.gx
        await saveGhost(u.id, task.id, wpm, t, b.tl, b.step).catch(e => console.error('ghost', e.message))
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
  const nu0 = await db.one('update users set coins=coins+$2, xp=xp+$3, best_wpm=greatest(best_wpm,$4), emap=$5 where id=$1 returning xp', [u.id, gc, gx, best, JSON.stringify(Object.fromEntries(emk))])
  await db.q('insert into results(user_id,task_id,wpm,acc,ms,chars,errs,xp,passed) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [u.id, r.task_id, wpm, acc, Math.round(t), chars, errs, gx, passed])
  const inc = { runs: 1, chars }
  if (acc >= 95 && chars >= 60) inc.acc95 = 1
  if (wpm >= 30 && chars >= 60) inc.wpm30 = 1
  if (passed && task) inc.tasks = 1
  if (g?.newStars) inc.stars = g.newStars
  await bump(u.id, inc)
  if (g) await after(u, task, g, stars)
  if (nb && best >= 25) await feed(u.id, 'record', { w: best })
  if (lvl(nu0.xp) > lvl(nu0.xp - gx)) await feed(u.id, 'level', { l: lvl(nu0.xp) })
  const ach = await check(u.id, passed && acc === 100 && task ? ['clean'] : [])
  const nu = await db.one(uSel + ' where id=$1', [u.id])
  let beat = null
  if (task && passed) {
    const b = await db.one('select count(*)::int n, count(*) filter (where best_wpm < $3)::int s from done where task_id=$1 and user_id<>$2', [task.id, u.id, wpm])
    if (b.n) beat = Math.round(b.s / b.n * 100)
  }
  res.json({ wpm, acc, passed, stars, why, coins: gc, xp: gx, cup: g?.cup || null, best: nb, ach, tourn: tr, beat, u: pu(nu) })
})

app.post('/api/tasks/:id/answer', need, async (req, res) => {
  if (!lim('ans' + req.u.id, 20, 60000)) return res.status(429).json({ e: 'Слишком часто, подожди минуту' })
  const t = await db.one("select * from tasks where id=$1 and active and kind<>'type'", [+req.params.id])
  if (!t) return res.status(404).json({ e: 'Задание не найдено' })
  if (!(await opened(req.u, t.league_id))) return res.status(403).json({ e: 'Задание недоступно' })
  const m = t.meta || {}, a = req.body?.answer
  let ok = false, bad = [], picks = []
  if (t.kind === 'quiz' || t.kind === 'next') {
    if (Array.isArray(m.options)) { ok = a !== '' && a != null && Number(a) === Number(m.answer); picks.push([0, String(+a), ok]) }
    else ok = [m.answer, ...(Array.isArray(m.accept) ? m.accept : [])].filter(x => x != null).some(x => outn(x) === outn(a))
  } else if (t.kind === 'fix') {
    ok = [m.fixed, ...(Array.isArray(m.accept) ? m.accept : [])].filter(Boolean).some(x => loose(x) === loose(a))
  } else if (t.kind === 'fill') {
    const ans = [...String(t.code).matchAll(BL)].map(x => x[1].split('|').map(y => y.trim().replace(/\s+/g, '')))
    const g = Array.isArray(a) ? a : []
    bad = ans.map((alts, i) => alts.includes(String(g[i] ?? '').trim().replace(/\s+/g, '')) ? -1 : i).filter(i => i >= 0)
    ok = ans.length > 0 && !bad.length
  } else if (t.kind === 'test') {
    const qs = Array.isArray(m.qs) ? m.qs : [], g = Array.isArray(a) ? a : []
    bad = qs.map((q, i) => Number(g[i]) === Number(q.answer) && g[i] !== '' && g[i] != null ? -1 : i).filter(i => i >= 0)
    ok = qs.length > 0 && !bad.length
    qs.forEach((q, i) => { if (g[i] != null && g[i] !== '') picks.push([i, String(+g[i]), Number(g[i]) === Number(q.answer)]) })
  } else if (t.kind === 'trim') {
    const want = [...new Set((m.extra || []).map(Number))].sort((x, y) => x - y).join(',')
    const got = [...new Set((Array.isArray(a) ? a : []).map(Number))].sort((x, y) => x - y).join(',')
    ok = !!want && want === got
    if (!ok) bad = [Math.abs((Array.isArray(a) ? a.length : 0) - (m.extra || []).length)]
  }
  for (const [q, val, k] of picks) await db.q('insert into picks(task_id,user_id,q,val,ok) values($1,$2,$3,$4,$5) on conflict do nothing', [t.id, req.u.id, q, val, k])
  const dist = picks.length ? await pickDist(t.id) : null
  if (!ok) {
    const r = await db.one('insert into att(user_id,task_id,n) values($1,$2,1) on conflict(user_id,task_id) do update set n=att.n+1 returning n', [req.u.id, t.id])
    return res.json({ ok: false, tries: r.n, bad: t.kind === 'trim' ? [] : bad, dist: null })
  }
  const r = await db.one('delete from att where user_id=$1 and task_id=$2 returning n', [req.u.id, t.id])
  const n = r?.n || 0, stars = n === 0 ? 3 : n === 1 ? 2 : 1
  const g = await grant(req.u, t, stars, 0, 100)
  const nu0 = await db.one('update users set coins=coins+$2, xp=xp+$3 where id=$1 returning xp', [req.u.id, g.gc, g.gx])
  await bump(req.u.id, { tasks: 1, stars: g.newStars })
  await after(req.u, t, g, stars)
  if (lvl(nu0.xp) > lvl(nu0.xp - g.gx)) await feed(req.u.id, 'level', { l: lvl(nu0.xp) })
  const ach = await check(req.u.id, n === 0 ? ['clean'] : [])
  const qx = t.kind === 'test' ? (m.qs || []).map(q => String(q.explain || '')) : null
  res.json({ ok: true, stars, coins: g.gc, xp: g.gx, cup: g.cup, ach, explain: String(m.explain || ''), qx, dist, extra: t.kind === 'trim' ? m.extra : null, u: pu(await db.one(uSel + ' where id=$1', [req.u.id])) })
})

const LXN = { ru: 'русском', en: 'английском', uz: 'узбекском (латиница)', tg: 'таджикском' }
const lxWait = new Map()
app.post('/api/lines', need, async (req, res) => {
  const code = String(req.body?.code || '').replace(/\r/g, '').slice(0, 8000), lang = LXN[req.body?.lang] ? req.body.lang : 'ru'
  const L = code.split('\n')
  if (!code.trim() || L.length > 150) return res.json({ lines: null })
  const k = lang + ':' + crypto.createHash('sha1').update(code).digest('hex')
  const c = await db.one('select lines from lexp where k=$1', [k])
  if (c) return res.json({ lines: c.lines })
  if (!cfg.ai?.on || !process.env.GROQ_API_KEY) return res.json({ lines: null })
  if (!lxWait.has(k)) {
    if (!lim('lx' + req.u.id, 12, 3600e3)) return res.json({ lines: null })
    lxWait.set(k, (async () => {
      const txt = await ask([
        { role: 'system', content: 'Ты помогаешь новичкам понимать код на Python. Отвечай только JSON.' },
        { role: 'user', content: `Для каждой строки кода ниже напиши очень короткое пояснение (до 10 слов) на ${LXN[lang]} языке: что делает эта строка, простыми словами, без кавычек и без слова «строка». Для пустых строк и строк из одной закрывающей скобки верни пустую строку. Верни JSON {"lines": [...]} ровно из ${L.length} элементов, по порядку.

${L.map((l, i) => (i + 1) + ': ' + l).join('\n')}` }
      ], { json: true, max: 3000, temp: 0.2 })
      const j = JSON.parse(txt)
      const out = Array.isArray(j.lines) ? L.map((_, i) => String(j.lines[i] ?? '').replace(/^#\s*/, '').slice(0, 120)) : null
      if (out) await db.q('insert into lexp(k,lines) values($1,$2) on conflict(k) do nothing', [k, JSON.stringify(out)])
      return out
    })().finally(() => setTimeout(() => lxWait.delete(k), 1000)))
  }
  try { res.json({ lines: await lxWait.get(k) }) } catch (e) { console.error('lines:', e.message); res.json({ lines: null }) }
})

async function pickDist(tid) {
  const rows = await db.q('select q, val, count(*)::int n from picks where task_id=$1 group by 1,2', [tid])
  const out = {}
  for (const r of rows) { (out[r.q] ||= { n: 0, v: {} }); out[r.q].v[r.val] = r.n; out[r.q].n += r.n }
  return out
}

app.get('/api/tasks/:id/stats', async (req, res) => {
  const t = await db.one('select id,kind from tasks where id=$1 and active', [+req.params.id])
  if (!t) return res.status(404).json({ e: 'Задание не найдено' })
  const me = req.u?.id || 0
  const d = await db.one(`select count(*)::int done, round(avg(d.best_wpm))::int avg, coalesce(max(d.best_wpm),0)::int top,
    count(*) filter (where d.stars=3)::int s3,
    (select best_wpm from done where task_id=$1 and user_id=$2) mine
    from done d join users u on u.id=d.user_id where d.task_id=$1 and not u.banned`, [t.id, me])
  const tried = t.kind === 'type'
    ? (await db.one('select count(distinct user_id)::int n from results where task_id=$1', [t.id])).n
    : d.done + (await db.one('select count(*)::int n from att where task_id=$1', [t.id])).n
  let beat = null
  if (t.kind === 'type' && d.mine != null && d.done > 1) {
    const b = await db.one('select count(*)::int n from done where task_id=$1 and user_id<>$2 and best_wpm < $3', [t.id, me, d.mine])
    beat = Math.round(b.n / (d.done - 1) * 100)
  }
  const first = t.kind !== 'type' && d.done ? Math.round(d.s3 / d.done * 100) : null
  res.json({ tried: Math.max(tried, d.done), done: d.done, rate: tried ? Math.round(d.done / Math.max(tried, d.done) * 100) : null, avg: d.avg, top: d.top, mine: d.mine, beat, first })
})

app.get('/api/analytics', async (req, res) => {
  const me = req.u?.id || 0
  const g = await cache('an', 60e3, async () => {
    const tot = await db.one(`select (select count(*)::int from users where not banned) users,
      (select count(*)::int from users where seen_at > now() - interval '1 day') today,
      (select count(*)::int from users where seen_at > now() - interval '7 days') wk,
      (select count(*)::int from results where created_at > now() - interval '1 day') runs_day,
      (select count(*)::int from results) runs, (select coalesce(sum(chars),0)::bigint from results) chars,
      (select count(*)::int from duels) duels, (select count(*)::int from done) solved,
      (select round(avg(acc))::int from results where created_at > now() - interval '30 days') acc`)
    const hist = await db.q('select least(best_wpm / 10, 15) b, count(*)::int n from users where best_wpm > 0 and not banned group by 1 order by 1')
    const hours = await db.q(`select extract(hour from created_at at time zone '${TZ}')::int h, count(*)::int n from results where created_at > now() - interval '30 days' group by 1`)
    const cups = await db.q(`select l.id, l.name, l.icon, l.color, (select count(*)::int from cups c where c.league_id=l.id) n from leagues l order by l.ord, l.id`)
    const tasks = await db.q(`select t.id, t.title, t.kind,
      (select count(*)::int from done d where d.task_id=t.id) done,
      greatest((select count(distinct user_id)::int from results r where r.task_id=t.id) + (select count(*)::int from att a where a.task_id=t.id), (select count(*)::int from done d where d.task_id=t.id)) tried
      from tasks t where t.active`)
    const err = await db.q(`select e.key k, sum((e.value)::int)::int n from users u, jsonb_each_text(u.emap) e where not u.banned group by 1 order by 2 desc limit 12`)
    const quests = await db.one(`select count(*)::int n, count(*) filter (where claimed ? 'chest')::int c from uq where day = current_date`)
    const kinds = await db.q(`select t.kind, count(distinct d.user_id)::int n from done d join tasks t on t.id=d.task_id group by 1`)
    return { tot, hist, hours, cups, tasks, err, quests, kinds }
  })
  let you = null
  if (me) {
    const u = await db.one('select best_wpm, xp, duel_w, duel_l from users where id=$1', [me])
    const n = g.tot.users || 1
    const w = await db.one('select count(*)::int n from users where best_wpm > 0 and not banned and best_wpm < $1', [u.best_wpm])
    const wn = await db.one('select count(*)::int n from users where best_wpm > 0 and not banned')
    const x = await db.one('select count(*)::int n from users where not banned and xp < $1', [u.xp])
    const a = await db.one(`select round(avg(acc))::int a from results where user_id=$1 and created_at > now() - interval '30 days'`, [me])
    const ab = a.a == null ? null : await db.one(`select count(*)::int n, (select count(distinct user_id)::int from results where created_at > now() - interval '30 days') t from
      (select user_id, avg(acc) v from results where created_at > now() - interval '30 days' group by 1) s where s.v < $1`, [a.a])
    const sv = await db.one('select count(*)::int n from done where user_id=$1', [me])
    you = { wpm: u.best_wpm, fast: u.best_wpm && wn.n > 1 ? Math.round(w.n / (wn.n - 1) * 100) : null, xp: n > 1 ? Math.round(x.n / (n - 1) * 100) : null,
      acc: a.a, accb: ab && ab.t > 1 ? Math.round(ab.n / (ab.t - 1) * 100) : null, solved: sv.n, duel: u.duel_w + u.duel_l ? Math.round(u.duel_w / (u.duel_w + u.duel_l) * 100) : null }
  }
  res.json({ ...g, you })
})

const CH = new Map()
async function cache(k, ms, f) {
  const c = CH.get(k)
  if (c && Date.now() - c.t < ms) return c.v
  const v = await f()
  CH.set(k, { t: Date.now(), v })
  return v
}

app.post('/api/admin/media', adm, express.raw({ type: () => true, limit: '60mb' }), async (req, res) => {
  const buf = req.body
  if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ e: 'Пустой файл' })
  const mime = String(req.headers['content-type'] || '')
  if (!/^video\/(mp4|webm|ogg|quicktime)$/.test(mime)) return res.status(400).json({ e: 'Подойдёт видео mp4, webm или ogg' })
  const used = (await db.one('select coalesce(sum(size),0)::bigint n from media')).n
  if (+used + buf.length > 350e6) return res.status(400).json({ e: 'Место под видео в базе закончилось. Загрузи урок на YouTube и добавь ссылку' })
  const name = decodeURIComponent(String(req.headers['x-name'] || 'video')).slice(0, 120)
  const r = await db.one('insert into media(name,mime,size,data) values($1,$2,$3,$4) returning id', [name, mime, buf.length, buf])
  res.json({ id: r.id, size: buf.length, used: +used + buf.length })
})

app.get('/media/:id', async (req, res) => {
  const m = await db.one('select id,mime,size from media where id=$1', [+req.params.id || 0])
  if (!m) return res.status(404).end()
  res.set({ 'Accept-Ranges': 'bytes', 'Content-Type': m.mime, 'Cache-Control': 'public, max-age=86400' })
  let a = 0, b = m.size - 1
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
  if (rg) {
    if (rg[1] === '' && rg[2]) { a = Math.max(0, m.size - +rg[2]) } else { a = +rg[1] || 0; if (rg[2]) b = Math.min(+rg[2], m.size - 1) }
    if (a > b || a >= m.size) return res.status(416).set('Content-Range', `bytes */${m.size}`).end()
    b = Math.min(b, a + 2 * 1024 * 1024 - 1)
    res.status(206).set('Content-Range', `bytes ${a}-${b}/${m.size}`)
  }
  const d = await db.one('select substring(data from $2 for $3) d from media where id=$1', [m.id, a + 1, b - a + 1])
  res.set('Content-Length', String(b - a + 1)).end(Buffer.from(d.d))
})

app.get('/api/lessons', async (req, res) => {
  const rows = await db.q(`select l.id,l.title,l.descr,l.kind,l.src,l.media_id,l.task_id,t.title task_title,
    (select count(*)::int from lesson_seen s where s.lesson_id=l.id) views
    from lessons l left join tasks t on t.id=l.task_id where l.active order by l.ord, l.id`)
  const seen = req.u ? (await db.q('select lesson_id from lesson_seen where user_id=$1', [req.u.id])).map(x => x.lesson_id) : []
  res.json({ rows, seen })
})

app.post('/api/lessons/:id/seen', need, async (req, res) => {
  const l = await db.one('select id from lessons where id=$1 and active', [+req.params.id])
  if (!l) return res.status(404).json({ e: 'Урок не найден' })
  const r = await db.one('insert into lesson_seen(user_id,lesson_id) values($1,$2) on conflict do nothing returning lesson_id', [req.u.id, l.id])
  if (r) await db.q('update users set xp=xp+10 where id=$1', [req.u.id])
  res.json({ xp: r ? 10 : 0, u: pu(await db.one(uSel + ' where id=$1', [req.u.id])) })
})

app.get('/api/news', async (req, res) => {
  res.json({ rows: await db.q('select id,title,body,icon,at from news order by id desc limit 30') })
})

app.get('/api/ghost/:id', async (req, res) => {
  const tid = +req.params.id
  const sel = 'select g.user_id,g.wpm,g.ms,g.step,g.tl,u.name,u.avatar from ghosts g join users u on u.id=g.user_id'
  let g
  if (req.query.who === 'me') {
    if (!req.u) return res.status(401).json({ e: 'Нужно войти' })
    g = await db.one(sel + ' where g.user_id=$1 and g.task_id=$2', [req.u.id, tid])
  } else g = await db.one(sel + ' where g.task_id=$1 and not u.banned order by g.wpm desc, g.at limit 1', [tid])
  if (!g) return res.status(404).json({ e: req.query.who === 'me' ? 'Сначала пройди это задание, и твой заход станет призраком' : 'На этом задании ещё нет записей' })
  res.json({ name: g.name, avatar: g.avatar, wpm: g.wpm, ms: g.ms, step: g.step, tl: g.tl, me: g.user_id === req.u?.id })
})

app.get('/api/top', async (req, res) => {
  const by = String(req.query.by || 'xp')
  const base = `select u.id,u.name,u.avatar,u.frame,u.title,u.ncolor,u.xp,u.best_wpm,u.role,
    (select count(*)::int from cups c where c.user_id=u.id) cups,
    (select l.icon from cups c join leagues l on l.id=c.league_id where c.user_id=u.id order by l.ord desc limit 1) lg`
  let rows
  if (by === 'friends') {
    if (!req.u) return res.json({ rows: [] })
    rows = await db.q(`select * from (${base} from users u where u.id=$1 or u.id in (select followee from follows where follower=$1)) x order by xp desc limit 100`, [req.u.id])
  } else if (by === 'duel') {
    rows = await db.q(`select * from (${base}, u.duel_w score from users u where not u.banned and u.duel_w > 0) x order by duel_w desc, xp desc limit 50`)
  } else if (by === 'week') {
    rows = await db.q(`${base}, w.s::int score from users u join (select user_id, sum(xp) s from results where created_at > now() - interval '7 days' group by user_id) w on w.user_id=u.id where not u.banned order by w.s desc limit 50`)
  } else {
    const o = { wpm: 'best_wpm desc, xp desc', cups: 'cups desc, xp desc' }[by] || 'xp desc'
    rows = await db.q(`select * from (${base} from users u where not u.banned) x order by ${o} limit 50`)
  }
  res.json({ rows })
})

app.get('/api/u/:name', async (req, res) => {
  const u = await db.one(`select id,name,role,xp,best_wpm,avatar,frame,title,ncolor,bio,(case when daily_at >= current_date - 1 then streak else 0 end) streak,created_at,seen_at,emap,duel_w,duel_l,
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
  const fl = await db.one('select (select count(*)::int from follows where followee=$1) fans, (select count(*)::int from follows where follower=$1) subs', [u.id])
  const isf = req.u && !own ? !!(await db.one('select 1 from follows where follower=$1 and followee=$2', [req.u.id, u.id])) : false
  const got = await db.q('select code, at from ach where user_id=$1', [u.id])
  const ach = ACH.map(a => ({ ...a, at: got.find(g => g.code === a.k)?.at || null }))
  const pc = await db.one('select count(*)::int n, count(*) filter (where best_wpm < $1)::int s from users where best_wpm > 0 and not banned and id<>$2', [u.best_wpm, u.id])
  const fast = u.best_wpm && pc.n ? Math.round(pc.s / pc.n * 100) : null
  res.json({ u, cups, recent, st: { ...st, ms: +st.ms }, own, fl, isf, ach, fast })
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
  feed(req.u.id, 'buy', { n: it.name, k: it.kind, v: it.value }).catch(() => {})
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
  if (aiBusy.has(req.u.id)) return res.status(429).json({ e: 'Подожди, ИИ ещё отвечает на прошлый вопрос' })
  if (!lim('ai' + req.u.id, 6, 60000) || !lim('aih' + req.u.id, 40, 3600e3)) return res.status(429).json({ e: 'Слишком часто, подожди минуту' })
  const q = await quota(req.u)
  if (!q.ok) return res.status(429).json({ e: 'Лимит вопросов на сегодня закончился. Завтра будет новый' })
  const b = req.body || {}
  const LN = { en: 'English', uz: "o'zbek tili (lotin yozuvida)", tg: 'забони тоҷикӣ' }
  let msgs = [{ role: 'system', content: SYS + (LN[b.lang] ? ` Пользователь выбрал язык интерфейса: ${LN[b.lang]}. Отвечай на этом языке.` : '') }]
  if (b.mode === 'explain') {
    msgs.push({ role: 'user', content: 'Объясни этот код коротко и понятно новичку: что он делает в целом и что интересного в ключевых строках. Без пересказа каждой строки.\n\n```python\n' + String(b.code || '').slice(0, 6000) + '\n```' })
  } else if (b.mode === 'tips') {
    msgs.push({ role: 'user', content: 'Я тренирую скоростную печать кода. Чаще всего ошибаюсь на символах: ' + String(b.chars || '').slice(0, 100) + '. Моя скорость ' + (+b.wpm || 0) + ' WPM. Дай 5 конкретных советов, как перестать ошибаться на этих символах и печатать быстрее.' })
  } else {
    const h = Array.isArray(b.msgs) ? b.msgs.slice(-12) : []
    for (const m of h) if (['user', 'assistant'].includes(m?.role)) msgs.push({ role: m.role, content: String(m.content || '').slice(0, 4000) })
    if (msgs.length < 2) return res.status(400).json({ e: 'Пустой вопрос' })
  }
  const last = msgs[msgs.length - 1]?.content || ''
  if (b.mode === 'chat' && last.replace(/\s+/g, '').length < 2) return res.status(400).json({ e: 'Слишком короткий вопрос' })
  aiBusy.add(req.u.id)
  try {
    const text = await ask(msgs, { max: 1200 })
    res.json({ text, left: q.left })
  } catch (e) {
    res.status(502).json({ e: e.message })
  } finally { aiBusy.delete(req.u.id) }
})
const aiBusy = new Set()

app.get('/api/quests', async (req, res) => res.json(await questList(req.u?.id)))
app.post('/api/quests/claim', need, async (req, res) => {
  const r = await claim(req.u.id, String(req.body?.k || ''))
  if (r.e) return res.status(400).json(r)
  res.json({ ...r, u: pu(await db.one(uSel + ' where id=$1', [req.u.id])) })
})

app.get('/api/feed', async (req, res) => res.json({ rows: await feedList(req.u?.id, String(req.query.scope || '')) }))
app.post('/api/feed/:id/react', need, async (req, res) => {
  if (!lim('re' + req.u.id, 30, 60000)) return res.status(429).json({ e: 'Слишком часто' })
  const r = await react(req.u, +req.params.id, String(req.body?.e || ''))
  if (r.e) return res.status(400).json(r)
  res.json(r)
})

app.post('/api/follow/:id', need, async (req, res) => {
  const id = +req.params.id
  if (!id || id === req.u.id) return res.status(400).json({ e: 'Нельзя подписаться на себя' })
  if (!lim('fo' + req.u.id, 30, 60000)) return res.status(429).json({ e: 'Слишком часто' })
  const t = await db.one('select id from users where id=$1 and not banned', [id])
  if (!t) return res.status(404).json({ e: 'Пользователь не найден' })
  const del = await db.one('delete from follows where follower=$1 and followee=$2 returning followee', [req.u.id, id])
  if (!del) {
    await db.q('insert into follows(follower,followee) values($1,$2) on conflict do nothing', [req.u.id, id])
    await note(id, 'follow', { name: req.u.name, avatar: req.u.avatar })
    check(req.u.id).catch(() => {})
  }
  const n = (await db.one('select count(*)::int n from follows where followee=$1', [id])).n
  res.json({ on: !del, fans: n })
})

app.get('/api/users', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 30).replace(/[%_]/g, '')
  if (q.length < 2) return res.json({ rows: [] })
  res.json({ rows: await db.q(`select id,name,avatar,frame,ncolor,xp,best_wpm from users where not banned and name ilike $1 order by xp desc limit 20`, ['%' + q + '%']) })
})

app.get('/api/notes', need, async (req, res) => {
  res.json({ rows: await db.q('select * from notes where user_id=$1 order by id desc limit 40', [req.u.id]) })
})
app.post('/api/notes/read', need, async (req, res) => {
  await db.q('update notes set read=true where user_id=$1 and not read', [req.u.id])
  res.json({ ok: 1 })
})

app.get('/api/duels', need, async (req, res) => {
  const rows = await db.q(`select d.*, ua.name an, ua.avatar aa, ub.name bn, ub.avatar ba from duels d
    left join users ua on ua.id=d.a left join users ub on ub.id=d.b where d.a=$1 or d.b=$1 order by d.id desc limit 15`, [req.u.id])
  res.json({ rows, w: req.u.duel_w, l: req.u.duel_l })
})

app.get('/api/u/:name/stats', async (req, res) => {
  const u = await db.one('select id from users where lower(name)=lower($1) and not banned', [String(req.params.name)])
  if (!u) return res.status(404).json({ e: 'Пользователь не найден' })
  const day = `to_char(created_at at time zone '${TZ}', 'YYYY-MM-DD')`
  const days = await db.q(`select ${day} d, count(*)::int runs, round(avg(wpm))::int avg, max(wpm)::int best, round(avg(acc))::int acc, sum(chars)::int chars
    from results where user_id=$1 and created_at > now() - interval '30 days' group by 1 order by 1`, [u.id])
  const cal = await db.q(`select ${day} d, count(*)::int n from results where user_id=$1 and created_at > now() - interval '182 days' group by 1`, [u.id])
  const wk = await db.one(`select
      round(avg(wpm) filter (where created_at > now() - interval '7 days'))::int w1,
      round(avg(wpm) filter (where created_at <= now() - interval '7 days'))::int w0,
      round(avg(acc) filter (where created_at > now() - interval '7 days'))::int a1,
      round(avg(acc) filter (where created_at <= now() - interval '7 days'))::int a0,
      count(*) filter (where created_at > now() - interval '7 days')::int r1,
      count(*) filter (where created_at <= now() - interval '7 days')::int r0
    from results where user_id=$1 and created_at > now() - interval '14 days'`, [u.id])
  const today = (await db.one("select to_char(current_date, 'YYYY-MM-DD') d")).d
  res.json({ days, cal, wk, today })
})

app.get('/api/tourn', async (req, res) => {
  const t = await tourn.current()
  if (!t) return res.json({ t: null })
  const b = await tourn.board(t.id, req.u?.id)
  const prev = await db.one('select id,title from tourn where week < $1 order by week desc limit 1', [t.week])
  const top = prev ? (await tourn.board(prev.id, null, 3)).rows : []
  res.json({ t: { id: t.id, title: t.title, code: t.code }, ends: await tourn.ends(), ...b, prize: tourn.PRIZE, part: tourn.PART, prev: prev ? { title: prev.title, top } : null })
})

const PUSH_HOST = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|notify\.windows\.com)$/i
app.get('/api/push/key', (req, res) => res.json({ key: pushKey() }))
app.post('/api/push/sub', need, async (req, res) => {
  const s = req.body?.sub, lang = ['ru', 'en', 'uz', 'tg'].includes(req.body?.lang) ? req.body.lang : 'ru'
  let host = ''
  try { host = new URL(String(s?.endpoint || '')).hostname } catch (e) {}
  if (!/^https:\/\//.test(s?.endpoint || '') || s.endpoint.length > 1000 || !PUSH_HOST.test(host) || typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') {
    return res.status(400).json({ e: 'Браузер прислал непонятную подписку' })
  }
  const sub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh.slice(0, 200), auth: s.keys.auth.slice(0, 100) } }
  await db.q(`insert into push(endpoint,user_id,sub,lang) values($1,$2,$3,$4)
    on conflict(endpoint) do update set user_id=excluded.user_id, sub=excluded.sub, lang=excluded.lang, at=now()`, [sub.endpoint, req.u.id, JSON.stringify(sub), lang])
  await db.q('delete from push where user_id=$1 and endpoint not in (select endpoint from push where user_id=$1 order by at desc limit 5)', [req.u.id])
  res.json({ ok: 1 })
})
app.post('/api/push/unsub', need, async (req, res) => {
  await db.q('delete from push where endpoint=$1 and user_id=$2', [String(req.body?.endpoint || ''), req.u.id])
  res.json({ ok: 1 })
})

const ctx = { app, io, db, cfg, need, adm, modr, ask, feed, note, bump, check }
admin(app, ctx)
chat(io)
duel(io)

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

const jobs = () => {
  tourn.payout().catch(e => console.error('турнир:', e.message))
  remindStreaks().catch(e => console.error('напоминания:', e.message))
}
setTimeout(jobs, 5000).unref()
setInterval(jobs, 10 * 60e3).unref()

srv.listen(PORT, () => console.log('pytype запущен: http://localhost:' + PORT))
