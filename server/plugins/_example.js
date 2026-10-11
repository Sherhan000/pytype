export default function ({ app, need, adm, db, io, cfg, ask }) {
  app.get('/api/ping', (req, res) => res.json({ pong: Date.now(), user: req.u?.name || null }))
}
