import webpush from 'web-push'
import { db } from './db.js'

let KEY = null

export async function initPush() {
  let pub = process.env.VAPID_PUBLIC, priv = process.env.VAPID_PRIVATE
  if (!pub || !priv) {
    const r = await db.one("select v from kv where k='vapid'")
    if (r?.v?.pub) ({ pub, priv } = r.v)
    else {
      const k = webpush.generateVAPIDKeys()
      pub = k.publicKey; priv = k.privateKey
      await db.q("insert into kv(k,v) values('vapid',$1) on conflict(k) do nothing", [JSON.stringify({ pub, priv })])
      const again = await db.one("select v from kv where k='vapid'")
      ;({ pub, priv } = again.v)
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@pytype.app', pub, priv)
  KEY = pub
}

export const pushKey = () => KEY

const TX = {
  follow: { ru: d => `${d.name} подписался на тебя`, en: d => `${d.name} followed you`, uz: d => `${d.name} sizga obuna bo'ldi`, tg: d => `${d.name} ба шумо обуна шуд` },
  duel: { ru: d => `${d.name} вызывает тебя на дуэль ⚔️`, en: d => `${d.name} challenges you to a duel ⚔️`, uz: d => `${d.name} sizni duelga chorlamoqda ⚔️`, tg: d => `${d.name} шуморо ба дуэл даъват мекунад ⚔️` },
  tourn: { ru: d => `Турнир недели: ${d.p} место, +${d.c} 🪙`, en: d => `Weekly tournament: place ${d.p}, +${d.c} 🪙`, uz: d => `Hafta turniri: ${d.p}-o'rin, +${d.c} 🪙`, tg: d => `Мусобиқаи ҳафта: ҷойи ${d.p}, +${d.c} 🪙` },
  streak: { ru: d => `🔥 Серия ${d.n} дн. сгорит через 2 часа. Забери бонус!`, en: d => `🔥 Your ${d.n}-day streak burns out in 2 hours. Grab the bonus!`, uz: d => `🔥 ${d.n} kunlik seriya 2 soatdan keyin yonib ketadi. Bonusni oling!`, tg: d => `🔥 Силсилаи ${d.n}-рӯза пас аз 2 соат месӯзад. Бонусро гиред!` }
}
const URL_ = { follow: d => '/#/u/' + encodeURIComponent(d.name), duel: d => '/#/duel/' + d.room, tourn: () => '/#/tourn', streak: () => '/#/' }

export async function push(uid, kind, data = {}) {
  if (!KEY || !TX[kind]) return
  const subs = await db.q('select endpoint, sub, lang from push where user_id=$1', [uid])
  for (const s of subs) {
    const f = TX[kind][s.lang] || TX[kind].ru
    const body = JSON.stringify({ title: 'pytype', body: f(data), url: URL_[kind](data), tag: kind })
    try {
      await webpush.sendNotification(s.sub, body, { TTL: kind === 'duel' ? 300 : 86400 })
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await db.q('delete from push where endpoint=$1', [s.endpoint]).catch(() => {})
      else console.error('push:', e.statusCode || e.message)
    }
  }
}

export async function remindStreaks() {
  if (!KEY || new Date().getUTCHours() !== 22) return
  const rows = await db.q(`update users u set remind_on=current_date
    where u.daily_at = current_date - 1 and u.streak >= 2 and not u.banned
      and (u.remind_on is null or u.remind_on < current_date)
      and exists(select 1 from push p where p.user_id=u.id)
    returning u.id, u.streak`)
  for (const r of rows) await push(r.id, 'streak', { n: r.streak }).catch(() => {})
}
