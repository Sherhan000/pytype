import fs from 'fs'
import pg from 'pg'

let q, ex
const url = process.env.DATABASE_URL
export const TZ = process.env.APP_TZ || 'Asia/Tashkent'
const TODAY = `(now() at time zone '${TZ}')::date`
const fix = s => s.replaceAll('current_date', TODAY)

if (url) {
  const local = /localhost|127\.0\.0\.1/.test(url)
  const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 6, idleTimeoutMillis: 30000 })
  pool.on('error', e => console.error('pg pool:', e.message))
  q = async (s, p = []) => (await pool.query(fix(s), p)).rows
  ex = async s => { await pool.query(s) }
  console.log('db: postgres')
} else {
  const { PGlite } = await import('@electric-sql/pglite')
  fs.mkdirSync('data', { recursive: true })
  const d = new PGlite('data/pg')
  await d.waitReady
  q = async (s, p = []) => (await d.query(fix(s), p)).rows
  ex = async s => { await d.exec(s) }
  console.log('db: локальная база в папке data/')
}

export const db = {
  q,
  ex,
  one: async (s, p) => (await q(s, p))[0] || null
}

export const schema = `
create table if not exists users(
  id serial primary key, name text not null, pass text not null, role text not null default 'user',
  coins int not null default 0, xp int not null default 0, best_wpm int not null default 0,
  avatar text not null default '🐍', frame text not null default '', title text not null default '',
  theme text not null default '', ncolor text not null default '', bio text not null default '',
  emap jsonb not null default '{}', muted_until timestamptz, banned boolean not null default false,
  daily_at date, streak int not null default 0, pc_day date, pc_n int not null default 0,
  created_at timestamptz not null default now(), seen_at timestamptz not null default now()
);
create unique index if not exists users_name on users(lower(name));
create table if not exists leagues(
  id serial primary key, name text not null, icon text not null default '🏆', color text not null default '#ffd43b',
  ord int not null default 0, reward int not null default 100
);
create table if not exists tasks(
  id serial primary key, league_id int references leagues(id) on delete set null, title text not null,
  descr text not null default '', kind text not null default 'type', code text not null default '',
  lvl int not null default 1, min_wpm int not null default 0, min_acc int not null default 80,
  coins int not null default 10, xp int not null default 20, ord int not null default 0,
  active boolean not null default true, meta jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists runs(
  id text primary key, user_id int not null, task_id int, started_at timestamptz not null default now(), used boolean not null default false
);
create table if not exists results(
  id serial primary key, user_id int not null references users(id) on delete cascade, task_id int,
  wpm int not null, acc int not null, ms int not null, chars int not null, errs int not null,
  xp int not null default 0, passed boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists results_u on results(user_id, created_at);
create index if not exists results_t on results(created_at);
create table if not exists done(
  user_id int not null references users(id) on delete cascade, task_id int not null references tasks(id) on delete cascade,
  best_wpm int not null, best_acc int not null, stars int not null, at timestamptz not null default now(),
  primary key(user_id, task_id)
);
create table if not exists cups(
  user_id int not null references users(id) on delete cascade, league_id int not null references leagues(id) on delete cascade,
  at timestamptz not null default now(), primary key(user_id, league_id)
);
create table if not exists items(
  id serial primary key, kind text not null, name text not null, value text not null,
  price int not null default 0, ord int not null default 0, active boolean not null default true
);
create table if not exists inv(
  user_id int not null references users(id) on delete cascade, item_id int not null references items(id) on delete cascade,
  at timestamptz not null default now(), primary key(user_id, item_id)
);
create table if not exists msgs(
  id serial primary key, user_id int references users(id) on delete set null, bot boolean not null default false,
  text text not null, deleted boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists ai_use(user_id int not null, day date not null, n int not null default 0, primary key(user_id, day));
create table if not exists kv(k text primary key, v jsonb not null);
alter table users add column if not exists duel_w int not null default 0;
alter table users add column if not exists duel_l int not null default 0;
alter table users add column if not exists msgs int not null default 0;
create table if not exists follows(
  follower int not null references users(id) on delete cascade, followee int not null references users(id) on delete cascade,
  at timestamptz not null default now(), primary key(follower, followee)
);
create table if not exists events(
  id serial primary key, user_id int not null references users(id) on delete cascade, kind text not null,
  data jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists reacts(
  event_id int not null references events(id) on delete cascade, user_id int not null references users(id) on delete cascade,
  emoji text not null, primary key(event_id, user_id, emoji)
);
create table if not exists uq(
  user_id int not null references users(id) on delete cascade, day date not null,
  data jsonb not null default '{}', claimed jsonb not null default '[]', primary key(user_id, day)
);
create table if not exists ach(
  user_id int not null references users(id) on delete cascade, code text not null,
  at timestamptz not null default now(), primary key(user_id, code)
);
create table if not exists notes(
  id serial primary key, user_id int not null references users(id) on delete cascade, kind text not null,
  data jsonb not null default '{}', read boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists notes_u on notes(user_id, id);
create table if not exists duels(
  id serial primary key, a int, b int, winner int, a_wpm int, b_wpm int, title text, reason text,
  created_at timestamptz not null default now()
);
create table if not exists ghosts(
  user_id int not null references users(id) on delete cascade, task_id int not null references tasks(id) on delete cascade,
  wpm int not null, ms int not null, step int not null, tl jsonb not null, at timestamptz not null default now(),
  primary key(user_id, task_id)
);
create index if not exists ghosts_t on ghosts(task_id, wpm);
create table if not exists att(
  user_id int not null references users(id) on delete cascade, task_id int not null references tasks(id) on delete cascade,
  n int not null default 0, primary key(user_id, task_id)
);
create table if not exists tourn(
  id serial primary key, week date not null unique, task_id int references tasks(id) on delete set null,
  title text not null, code text not null, prized boolean not null default false
);
create table if not exists tentry(
  tourn_id int not null references tourn(id) on delete cascade, user_id int not null references users(id) on delete cascade,
  wpm int not null, acc int not null, ms int not null, tries int not null default 1, at timestamptz not null default now(),
  primary key(tourn_id, user_id)
);
alter table runs add column if not exists tourn int;
create table if not exists push(
  endpoint text primary key, user_id int not null references users(id) on delete cascade, sub jsonb not null,
  lang text not null default 'ru', at timestamptz not null default now()
);
create index if not exists push_u on push(user_id);
alter table users add column if not exists remind_on date;
create table if not exists picks(
  task_id int not null references tasks(id) on delete cascade, user_id int not null references users(id) on delete cascade,
  q int not null default 0, val text not null, ok boolean not null default false, at timestamptz not null default now(),
  primary key(task_id, user_id, q)
);
create table if not exists oauth(
  provider text not null, pid text not null, user_id int not null references users(id) on delete cascade,
  at timestamptz not null default now(), primary key(provider, pid)
);
create table if not exists media(
  id serial primary key, name text not null default '', mime text not null, size int not null, data bytea not null,
  created_at timestamptz not null default now()
);
create table if not exists lessons(
  id serial primary key, title text not null, descr text not null default '', kind text not null default 'yt',
  src text not null default '', media_id int references media(id) on delete set null, task_id int references tasks(id) on delete set null,
  ord int not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists lesson_seen(
  user_id int not null references users(id) on delete cascade, lesson_id int not null references lessons(id) on delete cascade,
  at timestamptz not null default now(), primary key(user_id, lesson_id)
);
create table if not exists lexp(
  k text primary key, lines jsonb not null, at timestamptz not null default now()
);
create table if not exists news(
  id serial primary key, title text not null, body text not null default '', icon text not null default '✨',
  at timestamptz not null default now()
);
alter table news add column if not exists link text not null default '';
create table if not exists issues(
  id serial primary key, text text not null, active boolean not null default true, at timestamptz not null default now()
);
create table if not exists grps(
  id serial primary key, name text not null, icon text not null default '👥', descr text not null default '',
  code text not null unique, owner int references users(id) on delete set null, open boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists grp_members(
  group_id int not null references grps(id) on delete cascade, user_id int not null references users(id) on delete cascade,
  role text not null default 'member', at timestamptz not null default now(), primary key(group_id, user_id)
);
create index if not exists grp_members_u on grp_members(user_id);
create table if not exists grp_msgs(
  id serial primary key, group_id int not null references grps(id) on delete cascade, user_id int not null references users(id) on delete cascade,
  text text not null, at timestamptz not null default now()
);
create index if not exists grp_msgs_g on grp_msgs(group_id, id);
alter table users add column if not exists frz int not null default 0;
`
