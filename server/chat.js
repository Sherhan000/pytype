import { db } from './db.js'
import { cfg, lim } from './util.js'
import { ask, quota, SYS } from './ai.js'

const online = new Map()
export const onlineN = () => online.size

const LINK = /(https?:\/\/|www\.|t\.me\/|discord\.gg|\b[a-z0-9-]{2,}\.(com|ru|net|org|io|me|tj|uz|kz|xyz|top|gg|ly|link|site|online|app|dev|info|pro|club|shop)\b)/i
const ZW = /[\u0000-\u0009\u000b-\u001f\u007f​-‏‪-‮⁠-⁤﻿]/g

const LAT = { a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', x: 'х', y: 'у', k: 'к', m: 'м', h: 'н', t: 'т', b: 'в', u: 'и', '3': 'з', '0': 'о', '@': 'а', '6': 'б' }
const RU = /^(на|по|за|вы|от|у|до|про|раз|об|долбо|)(ху[йеёяи]|пизд|[её]б[аеуиылн]|бля|сук[аи]$|сучк|мудак|мудил|гандон|шлюх|пид[оа]р|залуп)/
const EN = /^(fuck|shit|bitch|cunt|nigg|fagg|dick|whore)/

function bad(w) {
  const l = w.toLowerCase().replace(/[*._\-]/g, '')
  if (EN.test(l.replace(/[^a-z]/g, ''))) return true
  const r = l.replace(/[a-z0-9@]/g, c => LAT[c] || c).replace(/[^а-яё]/g, '').replace(/(.)\1+/g, '$1')
  return RU.test(r)
}

export const censor = t => t.split(/(\s+)/).map(w => /\S/.test(w) && bad(w) ? '•'.repeat(Math.min(w.length, 6)) : w).join('')

export function clean(t) {
  return String(t || '')
    .replace(ZW, '')
    .replace(/\r/g, '')
    .replace(/(.)\1{9,}/g, '$1$1$1$1$1$1$1$1')
    .split('\n').slice(0, 5).join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const shape = (m, u) => ({
  id: m.id, text: m.text, at: m.created_at, bot: !!m.bot,
  u: u ? { id: u.id, name: u.name, avatar: u.avatar, frame: u.frame, ncolor: u.ncolor, title: u.title, role: u.role }
       : { id: 0, name: 'ИИ-наставник', avatar: '🤖', frame: 'neon', ncolor: 'grad', title: 'бот', role: 'bot' }
})

export async function history(n = 60) {
  const r = await db.q(`select m.id,m.text,m.created_at,m.bot,u.id uid,u.name,u.avatar,u.frame,u.ncolor,u.title,u.role
    from msgs m left join users u on u.id=m.user_id where not m.deleted order by m.id desc limit $1`, [n])
  return r.reverse().map(x => shape(x, x.bot || !x.uid ? null : { id: x.uid, name: x.name, avatar: x.avatar, frame: x.frame, ncolor: x.ncolor, title: x.title, role: x.role }))
}

export default function chat(io, who) {
  const last = new Map()

  async function post(text) {
    const m = await db.one('insert into msgs(user_id,bot,text) values(null,true,$1) returning *', [text.slice(0, 2000)])
    io.to('g').emit('msg', shape(m, null))
  }

  async function bot(u, t) {
    const q = t.replace(/^(\/ai|@ии|@ai)\s+/i, '').trim()
    if (!q) return
    const qt = await quota(u)
    if (!qt.ok) return post(`@${u.name}, лимит вопросов к ИИ на сегодня закончился`)
    try {
      const a = await ask([{ role: 'system', content: SYS + ' Сейчас ты отвечаешь в общем чате сайта, поэтому коротко: до 6 предложений, код только если очень нужен.' }, { role: 'user', content: q.slice(0, 1500) }], { max: 600 })
      await post(`@${u.name}, ${a}`)
    } catch (e) {
      await post(`@${u.name}, не получилось ответить: ${e.message}`)
    }
  }

  io.on('connection', async s => {
    let u = null
    try { u = await who(s.handshake.headers.cookie) } catch (e) {}
    s.data.uid = u?.id || 0
    if (u) online.set(u.id, (online.get(u.id) || 0) + 1)
    const can = !!u || cfg.chat.read
    if (can) {
      s.join('g')
      s.emit('hist', await history().catch(() => []))
    }
    s.emit('hello', { can, online: online.size })
    io.emit('online', online.size)

    s.on('msg', async (raw, cb) => {
      const ok = e => typeof cb === 'function' && cb(e ? { e } : { ok: 1 })
      try {
        if (!s.data.uid) return ok('Войди, чтобы писать в чат')
        if (!lim('chs' + s.id, 20, 60000)) return ok('Слишком много запросов')
        const me = await db.one('select * from users where id=$1', [s.data.uid])
        if (!me || me.banned) return ok('Доступ закрыт')
        const st = me.role === 'admin' || me.role === 'mod'
        const c = cfg.chat
        if (!c.on && !st) return ok('Чат сейчас выключен')
        if (me.muted_until && new Date(me.muted_until) > new Date()) {
          return ok('Ты в муте до ' + new Date(me.muted_until).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
        }
        if (!st && me.xp < c.xp) return ok(`Писать в чат можно с ${c.xp} XP. Пройди пару заданий`)
        if (!st && c.age && Date.now() - new Date(me.created_at) < c.age * 60000) return ok(`Писать можно через ${c.age} мин после регистрации`)
        let t = clean(raw)
        if (!t) return ok('Пустое сообщение')
        if (t.length > c.len && !st) return ok(`Максимум ${c.len} символов`)
        if (!st && !c.links && LINK.test(t)) return ok('Ссылки в чате запрещены')
        if (!st) {
          const l = last.get(me.id)
          if (l && Date.now() - l.at < c.slow * 1000) return ok(`Медленный режим: одно сообщение в ${c.slow} сек`)
          if (l && l.t === t.toLowerCase()) return ok('Не повторяй одно и то же')
          if (!lim('chat' + me.id, c.burst, 30000)) return ok('Слишком часто, подожди немного')
        }
        last.set(me.id, { at: Date.now(), t: t.toLowerCase() })
        if (c.filter) t = censor(t)
        const m = await db.one('insert into msgs(user_id,text) values($1,$2) returning *', [me.id, t])
        io.to('g').emit('msg', shape(m, me))
        ok()
        if (cfg.ai.on && cfg.ai.chat && process.env.GROQ_API_KEY && /^(\/ai|@ии|@ai)\s+/i.test(t)) bot(me, t)
      } catch (e) {
        console.error(e)
        ok('Ошибка сервера')
      }
    })

    s.on('del', async (id, cb) => {
      const me = await db.one('select role from users where id=$1', [s.data.uid]).catch(() => null)
      if (!me || !['admin', 'mod'].includes(me.role)) return cb?.({ e: 'Нет прав' })
      await db.q('update msgs set deleted=true where id=$1', [+id || 0])
      io.to('g').emit('del', +id)
      cb?.({ ok: 1 })
    })

    s.on('mute', async (o, cb) => {
      const me = await db.one('select role from users where id=$1', [s.data.uid]).catch(() => null)
      if (!me || !['admin', 'mod'].includes(me.role)) return cb?.({ e: 'Нет прав' })
      const min = Math.min(Math.max(+o?.min || 10, 1), 60 * 24 * 30)
      const t = await db.one(`update users set muted_until=now()+($2::int * interval '1 minute') where id=$1 and role='user' returning name`, [+o?.uid || 0, min])
      if (!t) return cb?.({ e: 'Нельзя замутить этого пользователя' })
      io.to('g').emit('sys', `${t.name} получил мут на ${min} мин`)
      cb?.({ ok: 1 })
    })

    s.on('disconnect', () => {
      if (u) {
        const n = (online.get(u.id) || 1) - 1
        n ? online.set(u.id, n) : online.delete(u.id)
      }
      io.emit('online', online.size)
    })
  })
}
