import fs from 'fs'
import pg from 'pg'

let q, ex
const url = process.env.DATABASE_URL

if (url) {
  const local = /localhost|127\.0\.0\.1/.test(url)
  const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 6, idleTimeoutMillis: 30000 })
  pool.on('error', e => console.error('pg pool:', e.message))
  q = async (s, p = []) => (await pool.query(s, p)).rows
  ex = async s => { await pool.query(s) }
  console.log('db: postgres')
} else {
  const { PGlite } = await import('@electric-sql/pglite')
  fs.mkdirSync('data', { recursive: true })
  const d = new PGlite('data/pg')
  await d.waitReady
  q = async (s, p = []) => (await d.query(s, p)).rows
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
`
