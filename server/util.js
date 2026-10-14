import { db } from './db.js'

export const DEF = {
  site: 'Indentra',
  reg: true,
  daily: 25,
  practice: true,
  shop: true,
  chat: { on: true, read: true, slow: 3, burst: 5, len: 300, xp: 0, age: 0, links: false, filter: true },
  ai: { on: true, model: 'llama-3.3-70b-versatile', day: 30, chat: true }
}

export const cfg = structuredClone(DEF)

function merge(a, b) {
  if (!b || typeof b !== 'object') return a
  for (const k in a) {
    if (!(k in b)) continue
    const v = b[k], d = a[k]
    if (d && typeof d === 'object') merge(d, v)
    else if (typeof d === 'number') a[k] = Math.max(0, Math.round(+v || 0))
    else if (typeof d === 'boolean') a[k] = v === true || v === 'true' || v === 1
    else a[k] = String(v ?? '').slice(0, 120)
  }
  return a
}

export async function loadCfg() {
  const r = await db.one("select v from kv where k='cfg'")
  if (r) merge(cfg, r.v)
  if (cfg.site === 'pytype') await saveCfg({ site: 'Indentra' })
}

export async function saveCfg(v) {
  merge(cfg, v)
  await db.q("insert into kv(k,v) values('cfg',$1) on conflict(k) do update set v=excluded.v", [JSON.stringify(cfg)])
}

export const oauthOn = () => ({ google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) })

export const pubCfg = () => ({
  oauth: oauthOn(),
  site: cfg.site,
  reg: cfg.reg,
  shop: cfg.shop,
  daily: cfg.daily,
  chat: { on: cfg.chat.on, read: cfg.chat.read, len: cfg.chat.len, slow: cfg.chat.slow, xp: cfg.chat.xp, links: cfg.chat.links },
  ai: { on: cfg.ai.on && !!process.env.GROQ_API_KEY, chat: cfg.ai.chat, day: cfg.ai.day }
})

const L = new Map()
export function lim(k, n, ms) {
  const t = Date.now(), a = (L.get(k) || []).filter(x => t - x < ms)
  if (a.length >= n) { L.set(k, a); return false }
  a.push(t)
  L.set(k, a)
  return true
}
setInterval(() => {
  const t = Date.now()
  for (const [k, a] of L) if (!a.length || t - a[a.length - 1] > 3600e3) L.delete(k)
}, 600e3).unref()

export const pu = u => u && {
  id: u.id, name: u.name, role: u.role, coins: u.coins, xp: u.xp, best_wpm: u.best_wpm,
  avatar: u.avatar, frame: u.frame, title: u.title, theme: u.theme, ncolor: u.ncolor, bio: u.bio,
  streak: u.st_live ?? u.streak, can_daily: !!u.can_daily, freeze: u.frz || 0, duel_w: u.duel_w || 0, duel_l: u.duel_l || 0, created_at: u.created_at, muted_until: u.muted_until
}

export const expChars = c => String(c || '')
  .replace(/\r\n?/g, '\n').replace(/\t/g, '    ')
  .split('\n').map(l => l.trimEnd()).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim()
  .split('\n').map(l => l.trimStart()).join('\n').length

export const uSel = `select *, (daily_at is null or daily_at < current_date) as can_daily, (case when daily_at >= current_date - 1 or (daily_at = current_date - 2 and frz > 0) then streak else 0 end) as st_live from users`
