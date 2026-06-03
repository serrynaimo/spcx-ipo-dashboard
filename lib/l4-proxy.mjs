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
  fnConfig: env('L4_FN_CONFIG', 'the-default-SpaceX-IPO-config'),
}

// Scalar fields of the L4 `IPO Config` record, in declaration order — the order
// the evaluator serialises them in the positional `IPO Config OF …` form.
const CONFIG_SCALARS = [
  'offer price', 'valuation', 'raise', 'float shares', 'total shares',
  'ipo pop coefficient', 'ipo pop cap', 'impact coefficient',
  'max daily up', 'max daily down', 'base turnover fraction', 'turnover decay',
]
// Scalar fields of each nested `Flow Window`, in declaration order.
const FLOW_FIELDS = ['start day', 'length', 'total notional', 'bias']

// Parse the evaluator's positional record string for `the default SpaceX IPO config`,
// e.g. `IPO Config` OF 135, 1800, …, (LIST `Flow Window` OF "label", "buy", 0, 20, 45, 0.85, …)
// into a plain IpoConfig object. The only quoted strings in that form are flow-window
// labels and "buy"/"sell" sides, and every other token is a number — so a single
// string/number tokeniser recovers the full structure positionally.
export function parseL4Config(s) {
  if (typeof s !== 'string') return null
  // Anchor on the `IPO Config` OF marker and tokenise only what follows it — otherwise
  // numbers in any diagnostics preamble that merely mentions "IPO Config" get mis-parsed.
  const marker = s.match(/`?IPO Config`?\s+OF\b/)
  if (!marker) return null
  const body = s.slice(marker.index + marker[0].length)
  const toks = []
  const re = /"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/g
  let m
  while ((m = re.exec(body))) {
    toks.push(m[1] !== undefined ? { t: 'str', v: m[1] } : { t: 'num', v: Number(m[2]) })
  }
  if (toks.length < CONFIG_SCALARS.length) return null
  const cfg = {}
  for (let i = 0; i < CONFIG_SCALARS.length; i++) {
    if (toks[i].t !== 'num') return null
    cfg[CONFIG_SCALARS[i]] = toks[i].v
  }
  const windows = []
  for (let i = CONFIG_SCALARS.length; i + 2 + FLOW_FIELDS.length <= toks.length; i += 2 + FLOW_FIELDS.length) {
    const label = toks[i], side = toks[i + 1]
    if (label.t !== 'str' || side.t !== 'str') break
    const w = { label: label.v, side: side.v }
    let ok = true
    for (let j = 0; j < FLOW_FIELDS.length; j++) {
      const tok = toks[i + 2 + j]
      if (tok.t !== 'num') { ok = false; break }
      w[FLOW_FIELDS[j]] = tok.v
    }
    if (!ok) break
    windows.push(w)
  }
  if (!windows.length) return null // a real config always has flow windows; reject false matches
  cfg['flow windows'] = windows
  return cfg
}

// Unwrap a `{ "`RecordName`": {fields} }` wrapper to its inner field object.
function recordFields(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return o
  const keys = Object.keys(o)
  if (keys.length === 1 && /^`.*`$/.test(keys[0]) && o[keys[0]] && typeof o[keys[0]] === 'object') return o[keys[0]]
  return o
}

// Structured form (Legalese Cloud): the value is a nested record object keyed by field
// name, each record wrapped as { "`IPO Config`": {…} } / { "`Flow Window`": {…} }.
function configFromStructured(payload) {
  let found = null
  const walk = (n, depth = 0) => {
    if (found || depth > 12 || n == null) return
    if (Array.isArray(n)) { n.forEach((x) => walk(x, depth + 1)); return }
    if (typeof n === 'object') {
      const inner = recordFields(n)
      if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'offer price' in inner && 'flow windows' in inner) {
        found = inner; return
      }
      Object.values(n).forEach((x) => walk(x, depth + 1))
    }
  }
  walk(payload)
  if (!found) return null
  const cfg = {}
  for (const k of CONFIG_SCALARS) cfg[k] = Number(found[k])
  const fw = Array.isArray(found['flow windows']) ? found['flow windows'] : []
  cfg['flow windows'] = fw.map((w) => {
    const f = recordFields(w)
    return {
      label: String(f.label), side: String(f.side),
      'start day': Number(f['start day']), length: Number(f.length),
      'total notional': Number(f['total notional']), bias: Number(f.bias),
    }
  })
  return cfg
}

// Recover an IpoConfig from an evaluation payload. Remote returns structured JSON;
// the local `l4 run --json` CLI returns the positional `IPO Config OF …` string.
export function configFromPayload(payload) {
  const structured = configFromStructured(payload)
  if (structured) return structured
  let hit = null
  const walk = (node, depth = 0) => {
    if (hit || depth > 8 || node == null) return
    if (typeof node === 'string') { const c = parseL4Config(node); if (c) hit = c }
    else if (Array.isArray(node)) node.forEach((x) => walk(x, depth + 1))
    else if (typeof node === 'object') Object.values(node).forEach((x) => walk(x, depth + 1))
  }
  walk(payload)
  return hit
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
  if (resp.status === 202) { const err = new Error('compiling'); err.status = 202; err.compiling = true; throw err }
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

// The model's canonical default `IPO Config`, via the `the default SpaceX IPO config`
// export. Parses the positional record string into an IpoConfig the UI can edit directly.
export async function remoteDefaultConfig() {
  const url = `${CFG.base}/${CFG.deployment}/fn/${CFG.fnConfig}/evaluation`
  const r = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ arguments: {} }) })
  if (r.status === 202) { const err = new Error('compiling'); err.status = 202; err.compiling = true; throw err }
  const text = await r.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  if (!r.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json)
    const err = new Error(`L4 API ${r.status}: ${msg.slice(0, 400)}`)
    err.status = r.status
    throw err
  }
  const cfg = configFromPayload(json)
  if (!cfg) {
    const err = new Error('Could not locate an IPO Config in the API response.')
    err.raw = json
    throw err
  }
  return cfg
}
