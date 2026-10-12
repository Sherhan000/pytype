import { db, TZ } from './db.js'

const WK = `date_trunc('week', now() at time zone '${TZ}')`
import { feed, note } from './social.js'

export const PRIZE = [500, 300, 200, 100, 100, 100, 100, 100, 100, 100]
export const PART = 25

export async function current() {
  let t = await db.one(`select * from tourn where week = ${WK}::date`)
  if (t) return t
  const k = await db.one(`select id,title,code from tasks where active and kind='type' and length(code) between 200 and 650
    and id not in (select task_id from tourn where task_id is not null order by week desc limit 4) order by random() limit 1`)
    || await db.one("select id,title,code from tasks where active and kind='type' order by random() limit 1")
  if (!k) return null
  await db.q(`insert into tourn(week,task_id,title,code) values(${WK}::date,$1,$2,$3) on conflict(week) do nothing`, [k.id, k.title, k.code])
  return db.one(`select * from tourn where week = ${WK}::date`)
}

export const ends = () => db.one(`select extract(epoch from (${WK} + interval '7 days') at time zone '${TZ}' - now()) * 1000 as ms`).then(r => Math.max(0, +r.ms))

export async function board(tid, me, n = 50) {
  const rows = await db.q(`select e.user_id id, e.wpm, e.acc, e.ms, e.tries, u.name, u.avatar, u.frame, u.ncolor, u.title
    from tentry e join users u on u.id=e.user_id where e.tourn_id=$1 and not u.banned order by e.wpm desc, e.acc desc, e.at limit $2`, [tid, n])
  let mine = null
  if (me) {
    mine = await db.one(`select e.wpm, e.acc, e.ms, e.tries,
      (select count(*)::int + 1 from tentry x join users u on u.id=x.user_id where x.tourn_id=e.tourn_id and not u.banned
        and (x.wpm > e.wpm or (x.wpm = e.wpm and x.acc > e.acc) or (x.wpm = e.wpm and x.acc = e.acc and x.at < e.at))) place
      from tentry e where e.tourn_id=$1 and e.user_id=$2`, [tid, me])
  }
  const total = (await db.one('select count(*)::int n from tentry where tourn_id=$1', [tid])).n
  return { rows, mine, total }
}

export async function enter(tid, uid, wpm, acc, ms) {
  const before = await db.one('select wpm from tentry where tourn_id=$1 and user_id=$2', [tid, uid])
  await db.q(`insert into tentry(tourn_id,user_id,wpm,acc,ms) values($1,$2,$3,$4,$5)
    on conflict(tourn_id,user_id) do update set tries=tentry.tries+1,
      wpm=case when excluded.wpm > tentry.wpm then excluded.wpm else tentry.wpm end,
      acc=case when excluded.wpm > tentry.wpm then excluded.acc else tentry.acc end,
      ms=case when excluded.wpm > tentry.wpm then excluded.ms else tentry.ms end,
      at=case when excluded.wpm > tentry.wpm then now() else tentry.at end`, [tid, uid, wpm, acc, ms])
  const b = await board(tid, uid, 0)
  return { best: b.mine?.wpm || wpm, place: b.mine?.place || null, total: b.total, improved: !before || wpm > before.wpm, first: !before }
}

export async function payout() {
  const old = await db.q(`select id,title from tourn where not prized and week < ${WK}::date order by week`)
  for (const t of old) {
    const lock = await db.one('update tourn set prized=true where id=$1 and not prized returning id', [t.id])
    if (!lock) continue
    const { rows } = await board(t.id, null, 100000)
    for (const [i, r] of rows.entries()) {
      const c = PRIZE[i] ?? PART
      await db.q('update users set coins=coins+$2 where id=$1', [r.id, c])
      await note(r.id, 'tourn', { p: i + 1, c, t: t.title, n: rows.length })
      if (i < 3) await feed(r.id, 'tourn', { p: i + 1, t: t.title })
    }
    if (rows.length) console.log(`турнир ${t.id}: награды выданы ${rows.length} игрокам`)
  }
}
