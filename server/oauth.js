import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { cfg, lim, oauthOn } from './util.js'
import { feed } from './social.js'

const env = process.env
const P = {
  google: {
    id: () => env.GOOGLE_CLIENT_ID, sec: () => env.GOOGLE_CLIENT_SECRET,
    auth: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'openid email profile', extra: '&prompt=select_account',
    async me(code, cb) {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: this.id(), client_secret: this.sec(), redirect_uri: cb, grant_type: 'authorization_code' })
      }).then(r => r.json())
      if (!r.access_token) throw new Error('Google не выдал доступ')
      const u = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } }).then(r => r.json())
      if (!u.sub) throw new Error('Google не вернул профиль')
      return { pid: String(u.sub), name: u.given_name || u.name || (u.email || '').split('@')[0], email: u.email }
    }
  },
  github: {
    id: () => env.GITHUB_CLIENT_ID, sec: () => env.GITHUB_CLIENT_SECRET,
    auth: 'https://github.com/login/oauth/authorize', scope: 'read:user', extra: '',
    async me(code, cb) {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client_id: this.id(), client_secret: this.sec(), redirect_uri: cb })
      }).then(r => r.json())
      if (!r.access_token) throw new Error('GitHub не выдал доступ')
      const u = await fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + r.access_token, 'User-Agent': 'indentra', Accept: 'application/vnd.github+json' } }).then(r => r.json())
      if (!u.id) throw new Error('GitHub не вернул профиль')
      return { pid: String(u.id), name: u.login || u.name }
    }
  }
}


const base = req => (env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')

async function freeName(raw) {
  let n = String(raw || '').normalize('NFKC').replace(/[^A-Za-z0-9_а-яА-ЯёЁ]/g, '').slice(0, 16)
  if (n.length < 3) n = 'coder' + n
  for (let i = 0; i < 50; i++) {
    const c = i ? n.slice(0, 16) + (i < 10 ? i : Math.floor(Math.random() * 9000 + 1000)) : n
    if (!(await db.one('select 1 from users where lower(name)=lower($1)', [c]))) return c
  }
  return 'coder' + crypto.randomInt(1e5, 1e6)
}

export default function oauth(app, { setTok, getUser, admins }) {
  app.get('/auth/:p', async (req, res) => {
    const p = P[req.params.p]
    if (!p || !p.id()) return res.redirect('/?auth_err=' + encodeURIComponent('Вход через этот сервис ещё не настроен') + '#/')
    const st = crypto.randomBytes(16).toString('hex')
    res.cookie('os', st, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 600e3 })
    const cb = base(req) + '/auth/' + req.params.p + '/cb'
    res.redirect(`${p.auth}?client_id=${encodeURIComponent(p.id())}&redirect_uri=${encodeURIComponent(cb)}&response_type=code&scope=${encodeURIComponent(p.scope)}&state=${st}${p.extra}`)
  })

  app.get('/auth/:p/cb', async (req, res) => {
    const pn = req.params.p, p = P[pn]
    const fail = m => res.redirect('/?auth_err=' + encodeURIComponent(m) + '#/')
    try {
      if (!p || !p.id()) return fail('Вход через этот сервис не настроен')
      if (!req.query.code || !req.query.state || req.query.state !== req.cookies.os) return fail('Сессия входа устарела, попробуй ещё раз')
      res.clearCookie('os')
      if (!lim('oa' + req.ip, 20, 600e3)) return fail('Слишком много попыток, подожди 10 минут')
      const me = await p.me(String(req.query.code), base(req) + '/auth/' + pn + '/cb')
      const cur = await getUser(req.cookies.tk)
      const link = await db.one('select user_id from oauth where provider=$1 and pid=$2', [pn, me.pid])
      let uid
      if (link) {
        uid = link.user_id
      } else if (cur) {
        await db.q('insert into oauth(provider,pid,user_id) values($1,$2,$3) on conflict do nothing', [pn, me.pid, cur.id])
        uid = cur.id
      } else {
        if (!cfg.reg) return fail('Регистрация сейчас закрыта')
        let name = await freeName(me.name)
        if (admins.includes(name.toLowerCase())) name = await freeName(name + '_')
        const first = (await db.one('select count(*)::int n from users')).n === 0
        const role = first ? 'admin' : 'user'
        const u = await db.one('insert into users(name,pass,role,coins) values($1,$2,$3,50) returning id', [name, await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10), role])
        await db.q('insert into oauth(provider,pid,user_id) values($1,$2,$3)', [pn, me.pid, u.id])
        feed(u.id, 'join', {}).catch(() => {})
        uid = u.id
        setTok(res, { id: uid })
        return res.redirect('/?welcome=' + pn + '#/')
      }
      const u = await db.one('select id,banned from users where id=$1', [uid])
      if (!u) return fail('Аккаунт не найден')
      if (u.banned) return fail('Аккаунт заблокирован')
      setTok(res, u)
      res.redirect(cur && !link ? '/?linked=' + pn + '#/me' : '/#/')
    } catch (e) {
      console.error('oauth', pn, e.message)
      fail('Не получилось войти, попробуй ещё раз')
    }
  })

  app.get('/api/me/links', async (req, res) => {
    const u = await getUser(req.cookies.tk)
    if (!u) return res.status(401).json({ e: 'Нужно войти' })
    res.json({ on: oauthOn(), have: (await db.q('select provider from oauth where user_id=$1', [u.id])).map(x => x.provider) })
  })
}
