const LANGS = { ru: 'Русский', en: 'English', uz: "O'zbekcha", tg: 'Тоҷикӣ' }
const LANG = (() => {
  let l = null
  try { l = JSON.parse(localStorage.getItem('pt_lang')) } catch (e) {}
  if (!LANGS[l]) {
    const n = String(navigator.language || 'ru').slice(0, 2).toLowerCase()
    l = ['ru', 'be', 'uk', 'kk', 'ky'].includes(n) ? 'ru' : n === 'uz' ? 'uz' : n === 'tg' ? 'tg' : 'en'
  }
  return l
})()
const LOC = (() => {
  const l = { ru: 'ru-RU', en: 'en-GB', uz: 'uz-Latn-UZ', tg: 'tg-TJ' }[LANG]
  try { return Intl.DateTimeFormat.supportedLocalesOf([l]).length ? l : LANG === 'tg' ? 'ru-RU' : 'en-GB' } catch (e) { return 'ru-RU' }
})()
document.documentElement.lang = LANG

const I18N = (() => {
  const LI = { en: 0, uz: 1, tg: 2 }[LANG]
  const ex = new Map(), pats = [], plr = new Map(), miss = new Set()
  const rx = k => new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d)\}/g, (_, i) => `(?<a${i}>[\\s\\S]+?)`) + '$')
  function add(d) {
    if (LI == null) return
    for (const k in d) {
      const v = d[k]?.[LI]
      if (v == null) continue
      if (/\{\d\}/.test(k)) pats.push([rx(k), v, k.length])
      else ex.set(k, v)
    }
    pats.sort((a, b) => b[2] - a[2])
  }
  function pl(d) { if (LI != null) for (const k in d) plr.set(k, d[k][LI]) }
  function look(s) {
    if (LI == null) return null
    const e = ex.get(s)
    if (e != null) return e
    for (const [r, v] of pats) {
      const m = r.exec(s)
      if (m) return v.replace(/\{(\d)\}/g, (_, i) => { const g = m.groups['a' + i] ?? ''; return ex.get(g) ?? g })
    }
    return null
  }
  return { add, pl, look, miss, plr, on: LI != null }
})()

function t(s, ...a) {
  let r = I18N.look(s)
  if (r == null) r = s
  return a.length ? r.replace(/\{(\d)\}/g, (_, i) => a[i] ?? '') : r
}

function plx(n, c) {
  const f = I18N.plr.get(c)
  if (f == null) return c
  return Array.isArray(f) ? (n === 1 ? f[0] : f[1]) : f
}

const SKIP = 'script,style,code,pre,textarea,.code,.ed .scr,.ed-top,.exl,.ls-b,.lw-i,.lw-r,.msgs .t,.bub,.nm,.tx b,.qcode,[data-notr]'
const CYR = /[а-яё]/i

function trNode(n) {
  const v = n.nodeValue
  if (!CYR.test(v)) return
  const p = n.parentElement
  if (!p || p.closest(SKIP)) return
  const s = v.trim()
  const r = I18N.look(s)
  if (r == null) { if (I18N.miss.size < 500) I18N.miss.add(s); return }
  if (r !== s) n.nodeValue = v.replace(s, r)
}

function trAttr(el) {
  for (const a of ['placeholder', 'title', 'aria-label']) {
    const v = el.getAttribute(a)
    if (!v || !CYR.test(v)) continue
    const r = I18N.look(v.trim())
    if (r != null) el.setAttribute(a, r)
    else if (I18N.miss.size < 500) I18N.miss.add(v.trim())
  }
}

function trTree(root) {
  if (root.nodeType === 3) return trNode(root)
  if (root.nodeType !== 1 || root.closest?.(SKIP)) return
  trAttr(root)
  root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(trAttr)
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const a = []
  while (w.nextNode()) a.push(w.currentNode)
  a.forEach(trNode)
}

if (I18N.on) {
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(trTree) }).observe(document.body, { childList: true, subtree: true })
  addEventListener('DOMContentLoaded', () => trTree(document.body))
}
