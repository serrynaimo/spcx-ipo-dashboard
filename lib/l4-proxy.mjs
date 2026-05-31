// ============================================================================
// Shared L4 proxy logic (remote / Legalese Cloud only).
// Used by BOTH the Vercel serverless functions in /api and the local Express
// server. Keeps the API key server-side; the browser only ever calls /api/*.
//
// NOTE: this module is remote-only. The local `l4` CLI fallback lives in
// server/index.mjs and only runs in local dev (Vercel has no l4 binary).
// ============================================================================

const env = (k, d = '') => (process.env[k] ?? d).trim()

export const CFG = {
  base: env('L4_API_BASE', 'https://api.legalese.cloud/legalese').replace(/\/+$/, ''),
  deployment: env('L4_DEPLOYMENT', 'spacex-ipo-model'),
  apiKey: env('L4_API_KEY'),
  authScheme: env('L4_AUTH_SCHEME', 'Bearer'),
  fnMarket: env('L4_FN_MARKET', 'the-SpaceX-SPCX-market-from-day'),
  fnUpdated: env('L4_FN_UPDATED', 'the-model-was-last-updated-on'),
}

// Field order of the L4 `Daily Market` record (declaration order).
export const FIELDS = [
  'tradingDay', 'calendarDayOffset', 'price', 'buyPressure',
  'sellPressure', 'netPressure', 'volumeNotional', 'volumeShares',
]

const canon = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const FIELD_BY_CANON = Object.fromEntries(FIELDS.map((f) => [canon(f), f]))

// Map one record (possibly wrapped as { "`Daily Market`": {...} }) → typed point.
function toPoint(rec) {
  if (Array.isArray(rec)) {
    const nums = rec.map(Number)
    if (nums.length >= FIELDS.length && nums.every((n) => Number.isFinite(n))) {
      return Object.fromEntries(FIELDS.map((f, i) => [f, nums[i]]))
    }
    return null
  }
  if (rec && typeof rec === 'object') {
    const candidates = [rec, ...Object.values(rec).filter((v) => v && typeof v === 'object' && !Array.isArray(v))]
    for (const cand of candidates) {
      const out = {}
      let hits = 0
      for (const [k, v] of Object.entries(cand)) {
        const f = FIELD_BY_CANON[canon(k)]
        if (f && Number.isFinite(Number(v))) { out[f] = Number(v); hits++ }
      }
      if (hits >= 6) {
        for (const f of FIELDS) if (!(f in out)) out[f] = NaN
        return out
      }
    }
  }
  return null
}

function findSeries(node, depth = 0) {
  if (depth > 8 || node == null) return null
  if (Array.isArray(node)) {
    const pts = node.map(toPoint)
    if (pts.length && pts.every(Boolean)) return pts
    for (const el of node) {
      const found = findSeries(el, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node === 'object') {
    for (const v of Object.values(node)) {
      const found = findSeries(v, depth + 1)
      if (found) return found
    }
  }
  return null
}

function parseL4String(s) {
  if (typeof s !== 'string' || !s.includes('Daily Market')) return null
  const nums = (s.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) || []).map(Number)
  const n = FIELDS.length
  if (nums.length < n) return null
  const out = []
  for (let i = 0; i + n <= nums.length; i += n) {
    out.push(Object.fromEntries(FIELDS.map((f, j) => [f, nums[i + j]])))
  }
  return out
}

export function normalize(payload) {
  const structured = findSeries(payload)
  if (structured) return structured
  let stringHit = null
  const walk = (node, depth = 0) => {
    if (stringHit || depth > 8 || node == null) return
    if (typeof node === 'string') {
      const p = parseL4String(node)
      if (p) stringHit = p
    } else if (Array.isArray(node)) node.forEach((x) => walk(x, depth + 1))
    else if (typeof node === 'object') Object.values(node).forEach((x) => walk(x, depth + 1))
  }
  walk(payload)
  return stringHit
}

function authHeaders() {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (CFG.apiKey) h.Authorization = CFG.authScheme ? `${CFG.authScheme} ${CFG.apiKey}` : CFG.apiKey
  return h
}

export function getMeta() {
  return {
    mode: 'remote',
    base: CFG.base,
    deployment: CFG.deployment,
    hasKey: Boolean(CFG.apiKey),
    configEditable: true,
    functions: { market: CFG.fnMarket },
  }
}

// Evaluate the merged range function on the deployed model.
export async function remoteSeries({ days, fromDay = 0, config }) {
  const args = { 'the last day': days - 1 }
  if (fromDay && fromDay > 0) args['the first day'] = fromDay
  if (config) args['the config'] = config
  const url = `${CFG.base}/${CFG.deployment}/fn/${CFG.fnMarket}/evaluation`
  const resp = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ arguments: args }) })
  const text = await resp.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  if (!resp.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json)
    const err = new Error(`L4 API ${resp.status}: ${msg.slice(0, 400)}`)
    err.status = resp.status
    err.raw = json
    throw err
  }
  const points = normalize(json)
  if (!points) {
    const err = new Error('Could not locate a Daily Market series in the API response.')
    err.raw = json
    throw err
  }
  return { source: 'remote', points }
}

export async function remoteDate() {
  const url = `${CFG.base}/${CFG.deployment}/fn/${CFG.fnUpdated}/evaluation`
  const r = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ arguments: {} }) })
  const j = await r.json()
  const v = j?.contents?.result?.value
  return typeof v === 'string' ? v : null
}
