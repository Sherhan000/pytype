import crypto from 'crypto'
import { db } from './db.js'
import { expChars, lim } from './util.js'
import { bump, check, feed, note, lvl } from './social.js'

const pub = u => ({ id: u.id, name: u.name, avatar: u.avatar, frame: u.frame, ncolor: u.ncolor, title: u.title, duel_w: u.duel_w })
const Q = []
const R = new Map()

async function pick() {
  const t = await db.one("select id,title,code from tasks where active and kind='type' and length(code) between 120 and 460 order by random() limit 1")
  return t || { title: 'Разминка', code: 'for i in range(10):\n    print(i * i)' }
}

export default function duel(io) {
  const other = (r, sid) => r.p.find(p => p.sid !== sid)

  async function start(r) {
    r.state = 'count'
    const t = await pick()
    r.code = t.code
    r.title = t.title
    r.need = expChars(t.code)
    r.start = Date.now() + 4000
    for (const p of r.p) {
      const o = other(r, p.sid)
      io.to(p.sid).emit('duel:start', { id: r.id, code: r.code, title: r.title, start: r.start, now: Date.now(), opp: pub(o.u) })
    }
    r.timer = setTimeout(() => end(r, null, 'time'), 5 * 60e3 + 4000)
  }

  async function end(r, win, why) {
    if (r.state === 'end') return
    const started = r.state === 'count' || r.state === 'run'
    r.state = 'end'
    clearTimeout(r.timer)
    R.delete(r.id)
    const lose = win ? other(r, win.sid) : null
    const real = started && win && why !== 'cancel'
    try {
      if (real) {
        const ww = win.res?.wpm || win.w || 0, lw = lose?.res?.wpm || lose?.w || 0
        const before = await db.one('select xp from users where id=$1', [win.u.id])
        await db.q('update users set coins=coins+20, xp=xp+15, duel_w=duel_w+1 where id=$1', [win.u.id])
        if (lose && why !== 'leave') await db.q('update users set coins=coins+5, xp=xp+5, duel_l=duel_l+1 where id=$1', [lose.u.id])
        else if (lose) await db.q('update users set duel_l=duel_l+1 where id=$1', [lose.u.id])
        await db.q('insert into duels(a,b,winner,a_wpm,b_wpm,title,reason) values($1,$2,$3,$4,$5,$6,$7)', [win.u.id, lose?.u.id || null, win.u.id, ww, lw, r.title, why])
        await bump(win.u.id, { duels: 1 })
        if (lose && why !== 'leave') await bump(lose.u.id, { duels: 1 })
        await feed(win.u.id, 'duel', { o: lose?.u.name || '', w: ww })
        if (lvl(before.xp + 15) > lvl(before.xp)) await feed(win.u.id, 'level', { l: lvl(before.xp + 15) })
        await check(win.u.id)
        if (lose) await check(lose.u.id)
      }
    } catch (e) { console.error('duel end', e) }
    for (const p of r.p) {
      const o = other(r, p.sid)
      const me = p === win
      io.to(p.sid).emit('duel:end', {
        id: r.id, why, win: !!win && me, draw: !win,
        me: p.res || { wpm: p.w || 0 }, opp: o ? (o.res || { wpm: o.w || 0 }) : null, oppU: o ? pub(o.u) : null,
        gain: real ? (me ? { coins: 20, xp: 15 } : why === 'leave' ? null : { coins: 5, xp: 5 }) : null
      })
    }
  }

  function leaveAll(s) {
    const i = Q.findIndex(q => q.sid === s.id)
    if (i >= 0) Q.splice(i, 1)
    for (const r of R.values()) {
      const p = r.p.find(x => x.sid === s.id)
      if (!p) continue
      if (r.state === 'wait') R.delete(r.id)
      else if (r.state !== 'end') end(r, other(r, s.id), 'leave')
    }
  }

  function room(priv) {
    const id = crypto.randomBytes(5).toString('hex')
    const r = { id, p: [], state: 'wait', priv }
    R.set(id, r)
    return r
  }

  io.on('connection', s => {
    const ok = (cb, d) => typeof cb === 'function' && cb(d)
    const busy = () => [...R.values()].some(r => r.state !== 'end' && r.p.some(p => p.u.id === s.data.u?.id))

    s.on('duel:find', async (x, cb) => {
      const u = s.data.u
      if (!u) return ok(cb, { e: 'Войди, чтобы играть дуэли' })
      if (!lim('df' + s.id, 20, 60000)) return ok(cb, { e: 'Слишком часто' })
      if (busy()) return ok(cb, { e: 'Ты уже в дуэли' })
      if (Q.some(q => q.sid === s.id)) return ok(cb, { ok: 1 })
      const i = Q.findIndex(q => q.u.id !== u.id)
      if (i < 0) { Q.push({ sid: s.id, u }); return ok(cb, { wait: 1 }) }
      const o = Q.splice(i, 1)[0]
      const r = room(false)
      r.p = [{ sid: o.sid, u: o.u }, { sid: s.id, u }]
      ok(cb, { ok: 1 })
      start(r)
    })

    s.on('duel:cancel', () => leaveAll(s))

    s.on('duel:create', (x, cb) => {
      const u = s.data.u
      if (!u) return ok(cb, { e: 'Войди, чтобы играть дуэли' })
      if (busy()) return ok(cb, { e: 'Ты уже в дуэли' })
      const r = room(true)
      r.p = [{ sid: s.id, u }]
      ok(cb, { id: r.id })
    })

    s.on('duel:invite', async (x, cb) => {
      const u = s.data.u
      if (!u) return ok(cb, { e: 'Войди, чтобы играть дуэли' })
      if (!lim('di' + u.id, 6, 60000)) return ok(cb, { e: 'Слишком много вызовов, подожди минуту' })
      const t = +x?.uid
      if (!t || t === u.id) return ok(cb, { e: 'Нельзя вызвать себя' })
      if (busy()) return ok(cb, { e: 'Ты уже в дуэли' })
      const r = room(true)
      r.p = [{ sid: s.id, u }]
      await note(t, 'duel', { room: r.id, name: u.name, avatar: u.avatar })
      io.to('u' + t).emit('duel:invite', { room: r.id, u: pub(u) })
      ok(cb, { id: r.id })
    })

    s.on('duel:join', (x, cb) => {
      const u = s.data.u
      if (!u) return ok(cb, { e: 'Войди, чтобы играть дуэли' })
      const r = R.get(String(x?.id || ''))
      if (!r || r.state !== 'wait') return ok(cb, { e: 'Комната уже закрыта или дуэль началась' })
      if (r.p[0].u.id === u.id) return ok(cb, { mine: 1 })
      if (busy()) return ok(cb, { e: 'Ты уже в дуэли' })
      r.p.push({ sid: s.id, u })
      ok(cb, { ok: 1 })
      start(r)
    })

    s.on('duel:prog', x => {
      if (!lim('dp' + s.id, 12, 1000)) return
      const r = R.get(String(x?.id || ''))
      if (!r || r.state === 'end') return
      const p = r.p.find(q => q.sid === s.id)
      if (!p) return
      if (r.state === 'count' && Date.now() >= r.start) r.state = 'run'
      p.prog = Math.max(0, Math.min(1, +x.p || 0))
      p.w = Math.max(0, Math.min(250, Math.round(+x.w || 0)))
      const o = other(r, s.id)
      if (o) io.to(o.sid).emit('duel:opp', { p: p.prog, w: p.w })
    })

    s.on('duel:done', x => {
      const r = R.get(String(x?.id || ''))
      if (!r || r.state === 'end') return
      const p = r.p.find(q => q.sid === s.id)
      if (!p || p.res) return
      const t = Date.now() - r.start
      if (t < 1500) return
      const chars = Math.max(0, x.chars | 0), keys = Math.max(chars, x.keys | 0), errs = Math.max(0, Math.min(keys, x.errs | 0))
      if (chars < r.need * 0.95 || (x.left | 0) > 0) return io.to(s.id).emit('duel:bad', { e: 'Исправь ошибки до конца кода' })
      const wpm = Math.round(chars / 5 / (t / 60000))
      if (wpm > 220) return io.to(s.id).emit('duel:bad', { e: 'Слишком быстро, не засчитано' })
      p.res = { wpm, acc: keys ? Math.round((keys - errs) / keys * 100) : 0, ms: t }
      end(r, p, 'done')
    })

    s.on('duel:online', async (x, cb) => {
      const ss = await io.fetchSockets()
      const m = new Map()
      for (const z of ss) if (z.data.u && z.data.u.id !== s.data.u?.id) m.set(z.data.u.id, pub(z.data.u))
      ok(cb, [...m.values()].slice(0, 50))
    })

    s.on('disconnect', () => leaveAll(s))
  })
}
