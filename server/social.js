import { db } from './db.js'
import { push } from './push.js'

let io = null
export const setIo = x => { io = x }

export const lvl = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1

const QP = [
  { k: 'runs', t: 'Сделай 3 захода', g: 3, r: 20, i: '⌨️' },
  { k: 'chars', t: 'Напечатай 800 символов', g: 800, r: 25, i: '📜' },
  { k: 'tasks', t: 'Пройди любое задание', g: 1, r: 25, i: '🚩' },
  { k: 'acc95', t: 'Заход с точностью от 95%', g: 1, r: 20, i: '🎯' },
  { k: 'duels', t: 'Сыграй дуэль', g: 1, r: 30, i: '⚔️' },
  { k: 'chat', t: 'Напиши в общий чат', g: 1, r: 10, i: '💬' },
  { k: 'stars', t: 'Собери 2 звезды', g: 2, r: 25, i: '⭐' },
  { k: 'reacts', t: 'Поставь 3 реакции в ленте', g: 3, r: 10, i: '🔥' },
  { k: 'wpm30', t: 'Заход быстрее 30 WPM', g: 1, r: 20, i: '⚡' }
]
export const CHEST = 40

export function quests() {
  let s = Math.floor(Date.now() / 864e5) * 9301 + 49297
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const a = QP.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, 3)
}

export async function bump(uid, inc) {
  const add = {}
  for (const k in inc) if (inc[k]) add[k] = Math.round(+inc[k] || 0)
  if (!Object.keys(add).length) return
  const r = await db.one(`insert into uq(user_id,day,data) values($1,current_date,$2::jsonb)
    on conflict(user_id,day) do update set data = (
      select coalesce(jsonb_object_agg(k, coalesce((uq.data->>k)::int, 0) + coalesce((excluded.data->>k)::int, 0)), '{}'::jsonb)
      from (select jsonb_object_keys(uq.data) k union select jsonb_object_keys(excluded.data)) s)
    returning data`, [uid, JSON.stringify(add)])
  const d = r?.data || {}
  for (const q of quests()) {
    const now = d[q.k] || 0, before = now - (add[q.k] || 0)
    if (before < q.g && now >= q.g) io?.to('u' + uid).emit('quest', { k: q.k, t: q.t, i: q.i })
  }
}

export async function questList(uid) {
  const r = uid ? await db.one('select data,claimed from uq where user_id=$1 and day=current_date', [uid]) : null
  const d = r?.data || {}, c = r?.claimed || []
  const end = (Math.floor(Date.now() / 864e5) + 1) * 864e5
  return { list: quests().map(q => ({ ...q, p: Math.min(d[q.k] || 0, q.g), got: c.includes(q.k) })), chest: CHEST, opened: c.includes('chest'), ends: end - Date.now() }
}

export async function claim(uid, k) {
  const qs = quests(), q = qs.find(x => x.k === k)
  if (!q) return { e: 'Такого задания сегодня нет' }
  const r = await db.one('select data from uq where user_id=$1 and day=current_date', [uid])
  if (((r?.data || {})[k] || 0) < q.g) return { e: 'Задание ещё не выполнено' }
  const got = await db.one(`update uq set claimed = claimed || jsonb_build_array($2::text)
    where user_id=$1 and day=current_date and not (claimed ? $2) returning claimed`, [uid, k])
  if (!got) return { e: 'Награда уже получена' }
  let gain = q.r, chest = false
  const ch = await db.one(`update uq set claimed = claimed || '["chest"]'::jsonb
    where user_id=$1 and day=current_date and not (claimed ? 'chest') and claimed ?& $2::text[] returning 1 ok`, [uid, qs.map(x => x.k)])
  if (ch) { gain += CHEST; chest = true }
  await db.q('update users set coins=coins+$2 where id=$1', [uid, gain])
  if (chest) await check(uid, ['quests'])
  return { gain, chest }
}

export const ACH = [
  { k: 'first', t: 'Первые шаги', d: 'Закончи первый заход', i: '👣', r: 10 },
  { k: 'task1', t: 'Первое задание', d: 'Пройди любое задание', i: '🚩', r: 15 },
  { k: 'task10', t: 'Десятка', d: 'Пройди 10 заданий', i: '🔟', r: 60 },
  { k: 'stars30', t: 'Звездочёт', d: 'Собери 30 звёзд', i: '🌟', r: 80 },
  { k: 'wpm40', t: 'Разгон', d: 'Скорость от 40 WPM', i: '🚀', r: 40 },
  { k: 'wpm60', t: 'Скорострел', d: 'Скорость от 60 WPM', i: '⚡', r: 80 },
  { k: 'wpm80', t: 'Молния', d: 'Скорость от 80 WPM', i: '🌩', r: 150 },
  { k: 'clean', t: 'Чистая работа', d: 'Пройди задание без единой ошибки', i: '💎', r: 40 },
  { k: 'cup1', t: 'Первый кубок', d: 'Получи кубок любой лиги', i: '🏆', r: 50 },
  { k: 'cups', t: 'Коллекционер', d: 'Собери кубки всех лиг', i: '👑', r: 300 },
  { k: 'duel1', t: 'Дуэлянт', d: 'Выиграй дуэль', i: '⚔️', r: 30 },
  { k: 'duel10', t: 'Гладиатор', d: 'Выиграй 10 дуэлей', i: '🛡', r: 120 },
  { k: 'streak7', t: 'Неделя огня', d: 'Заходи 7 дней подряд', i: '🔥', r: 70 },
  { k: 'friends3', t: 'Своя компания', d: 'Подпишись на троих', i: '🤝', r: 20 },
  { k: 'chat50', t: 'Душа чата', d: 'Напиши 50 сообщений в чат', i: '💬', r: 40 },
  { k: 'quests', t: 'Охотник за сундуками', d: 'Открой сундук дня', i: '🎁', r: 30 }
]

export async function note(uid, kind, data) {
  if (!uid) return
  const n = await db.one('insert into notes(user_id,kind,data) values($1,$2,$3) returning *', [uid, kind, JSON.stringify(data)])
  io?.to('u' + uid).emit('note', n)
  if (['follow', 'duel', 'tourn'].includes(kind)) push(uid, kind, data).catch(() => {})
  if (Math.random() < 0.03) db.q("delete from notes where created_at < now() - interval '30 days'").catch(() => {})
}

const uPub = 'select id,name,avatar,frame,ncolor,title from users where id=$1'

export async function feed(uid, kind, data) {
  const e = await db.one('insert into events(user_id,kind,data) values($1,$2,$3) returning *', [uid, kind, JSON.stringify(data)])
  const u = await db.one(uPub, [uid])
  io?.emit('feed', { ...e, u, r: [] })
  if (Math.random() < 0.03) db.q("delete from events where created_at < now() - interval '14 days'").catch(() => {})
}

export async function check(uid, extra = []) {
  const s = await db.one(`select best_wpm, streak, duel_w, msgs,
    (select count(*)::int from done where user_id=$1) d,
    (select coalesce(sum(stars),0)::int from done where user_id=$1) st,
    (select count(*)::int from cups where user_id=$1) c,
    (select count(*)::int from leagues) lc,
    (select count(*)::int from follows where follower=$1) f,
    (select count(*)::int from results where user_id=$1) runs
    from users where id=$1`, [uid])
  if (!s) return []
  const has = new Set((await db.q('select code from ach where user_id=$1', [uid])).map(x => x.code))
  const want = [...extra]
  if (s.runs >= 1) want.push('first')
  if (s.d >= 1) want.push('task1')
  if (s.d >= 10) want.push('task10')
  if (s.st >= 30) want.push('stars30')
  if (s.best_wpm >= 40) want.push('wpm40')
  if (s.best_wpm >= 60) want.push('wpm60')
  if (s.best_wpm >= 80) want.push('wpm80')
  if (s.c >= 1) want.push('cup1')
  if (s.lc && s.c >= s.lc) want.push('cups')
  if (s.duel_w >= 1) want.push('duel1')
  if (s.duel_w >= 10) want.push('duel10')
  if (s.streak >= 7) want.push('streak7')
  if (s.f >= 3) want.push('friends3')
  if (s.msgs >= 50) want.push('chat50')
  const got = []
  for (const k of [...new Set(want)]) {
    if (has.has(k)) continue
    const a = ACH.find(x => x.k === k)
    if (!a) continue
    const r = await db.one('insert into ach(user_id,code) values($1,$2) on conflict do nothing returning code', [uid, k])
    if (!r) continue
    await db.q('update users set coins=coins+$2 where id=$1', [uid, a.r])
    await note(uid, 'ach', { t: a.t, i: a.i, r: a.r })
    if (a.r >= 50) await feed(uid, 'ach', { t: a.t, i: a.i })
    got.push(a)
  }
  return got
}

export const EMO = ['🔥', '👏', '😮', '💪']

export async function feedList(me, scope) {
  const p = []
  let w = ''
  if (scope === 'friends' && me) { p.push(me); w = 'where e.user_id=$1 or e.user_id in (select followee from follows where follower=$1)' }
  else if (/^\d+$/.test(scope || '')) { p.push(+scope); w = 'where e.user_id=$1' }
  else if (/^g\d+$/.test(scope || '')) { p.push(+scope.slice(1)); w = 'where e.user_id in (select user_id from grp_members where group_id=$1)' }
  const rows = await db.q(`select e.id,e.kind,e.data,e.created_at,e.user_id,u.name,u.avatar,u.frame,u.ncolor,u.title
    from events e join users u on u.id=e.user_id ${w} order by e.id desc limit 40`, p)
  if (!rows.length) return []
  const ids = rows.map(r => +r.id).join(',')
  const rs = await db.q(`select event_id, emoji, count(*)::int n, bool_or(user_id=$1) mine from reacts where event_id in (${ids}) group by 1,2`, [me || 0])
  return rows.map(r => ({
    id: r.id, kind: r.kind, data: r.data, created_at: r.created_at,
    u: { id: r.user_id, name: r.name, avatar: r.avatar, frame: r.frame, ncolor: r.ncolor, title: r.title },
    r: rs.filter(x => x.event_id === r.id).map(x => ({ e: x.emoji, n: x.n, mine: x.mine }))
  }))
}

export async function react(me, id, e) {
  if (!EMO.includes(e)) return { e: 'Такой реакции нет' }
  const ev = await db.one('select id,user_id,kind from events where id=$1', [id])
  if (!ev) return { e: 'Запись не найдена' }
  const del = await db.one('delete from reacts where event_id=$1 and user_id=$2 and emoji=$3 returning emoji', [id, me.id, e])
  if (!del) {
    await db.q('insert into reacts(event_id,user_id,emoji) values($1,$2,$3) on conflict do nothing', [id, me.id, e])
    await bump(me.id, { reacts: 1 })
    if (ev.user_id !== me.id) await note(ev.user_id, 'react', { e, name: me.name, avatar: me.avatar, ev: id })
  }
  const n = (await db.one('select count(*)::int n from reacts where event_id=$1 and emoji=$2', [id, e])).n
  io?.emit('react', { id, e, n })
  return { on: !del, n }
}
