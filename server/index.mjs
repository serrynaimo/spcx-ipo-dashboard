// ============================================================================
// Express proxy for the L4 SpaceX (SPCX) IPO model.
//
// Keeps the API key server-side. Two modes (L4_MODE):
//   remote -> POST to the deployed Legalese Cloud API with a bearer token.
//   local  -> shell out to the local `l4` CLI on the .l4 file (days-only).
//
// Frontend talks only to /api/* — the key is never sent to the browser.
// ============================================================================
import express from 'express'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = (k, d = '') => (process.env[k] ?? d).trim()

const PORT = Number(env('PORT', '8787'))
const MODE = env('L4_MODE', 'remote').toLowerCase()
const API_BASE = env('L4_API_BASE', 'https://api.legalese.cloud/legalese').replace(/\/+$/, '')
const DEPLOYMENT = env('L4_DEPLOYMENT', 'spacex-ipo-model')
const API_KEY = env('L4_API_KEY')
const AUTH_SCHEME = env('L4_AUTH_SCHEME', 'Bearer')
// One merged range endpoint: `the SpaceX SPCX market from day _ to day _ using _`.
// Route is the leading keyword run; args are the binder names (with MAYBEs).
const FN_MARKET = env('L4_FN_MARKET', 'the-SpaceX-SPCX-market-from-day')
const FN_UPDATED = env('L4_FN_UPDATED', 'the-model-was-last-updated-on')
const L4_BIN = env('L4_BIN')
const L4_FILE = env('L4_FILE')

// Field order of the L4 `Daily Market` record (declaration order).
const FIELDS = [
  'tradingDay',
  'calendarDayOffset',
  'price',
  'buyPressure',
  'sellPressure',
  'netPressure',
  'volumeNotional',
  'volumeShares',
]

// ---- helpers ---------------------------------------------------------------

const canon = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const FIELD_BY_CANON = Object.fromEntries(FIELDS.map((f) => [canon(f), f]))

// Map one record (object keyed by L4 field name, or an array) -> typed point.
function toPoint(rec) {
  if (Array.isArray(rec)) {
    const nums = rec.map(Number)
    if (nums.length >= FIELDS.length && nums.every((n) => Number.isFinite(n))) {
      return Object.fromEntries(FIELDS.map((f, i) => [f, nums[i]]))
    }
    return null
  }
  if (rec && typeof rec === 'object') {
    // Candidates: the object itself, plus any object-valued child (one level).
    // The API wraps each row as { "`Daily Market`": { ...fields } }.
    const candidates = [rec, ...Object.values(rec).filter((v) => v && typeof v === 'object' && !Array.isArray(v))]
    for (const cand of candidates) {
      const out = {}
      let hits = 0
      for (const [k, v] of Object.entries(cand)) {
        const f = FIELD_BY_CANON[canon(k)]
        if (f && Number.isFinite(Number(v))) {
          out[f] = Number(v)
          hits++
        }
      }
      if (hits >= 6) {
        for (const f of FIELDS) if (!(f in out)) out[f] = NaN
        return out
      }
    }
  }
  return null
}

// Recursively find the first array of Daily-Market-looking records.
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

// Fallback: parse the L4 string form "LIST `Daily Market` OF a, b, ... " by
// chunking every flat number into groups of 8.
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

function normalize(payload) {
  // Try structured first, then string form found anywhere in the payload.
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

// ---- remote mode -----------------------------------------------------------

async function remoteSeries({ days, config, fromDay }) {
  // MAYBE params: omit `the first day` → defaults to 0; omit `the config` → SpaceX.
  const args = { 'the last day': days - 1 }
  if (fromDay && fromDay > 0) args['the first day'] = fromDay
  if (config) args['the config'] = config
  const url = `${API_BASE}/${DEPLOYMENT}/fn/${FN_MARKET}/evaluation`
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (API_KEY) headers.Authorization = AUTH_SCHEME ? `${AUTH_SCHEME} ${API_KEY}` : API_KEY

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ arguments: args }),
  })
  const text = await resp.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
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
  return { source: 'remote', fn: FN_MARKET, url, points, raw: json }
}

// ---- local mode ------------------------------------------------------------

function runL4(file) {
  return new Promise((resolve, reject) => {
    const p = spawn(L4_BIN, ['run', file, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', errb = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (errb += d))
    p.on('error', reject)
    p.on('close', (code) => (code === 0 || out ? resolve(out) : reject(new Error(errb || `l4 exited ${code}`))))
  })
}

async function localSeries({ days }) {
  if (!L4_BIN || !L4_FILE) throw new Error('L4_BIN / L4_FILE not set for local mode.')
  await access(L4_BIN)
  const src = await readFile(L4_FILE, 'utf8')
  const dir = await mkdtemp(join(tmpdir(), 'spcx-'))
  const tmp = join(dir, 'model.l4')
  try {
    await writeFile(tmp, `${src}\n#EVAL \`the SpaceX SPCX market from day\` NOTHING \`to day\` ${days - 1} \`using\` NOTHING\n`)
    const out = await runL4(tmp)
    const json = JSON.parse(out)
    const results = json.results || []
    const last = results[results.length - 1]
    const points = normalize(last?.value ?? json)
    if (!points) {
      const err = new Error('Local l4 eval produced no parseable series.')
      err.raw = json
      throw err
    }
    return { source: 'local', fn: 'l4 run --json', points }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

// ---- routes ----------------------------------------------------------------

const app = express()
app.use(express.json({ limit: '4mb' }))

app.get('/api/meta', (_req, res) => {
  res.json({
    mode: MODE,
    base: API_BASE,
    deployment: DEPLOYMENT,
    hasKey: Boolean(API_KEY),
    configEditable: MODE === 'remote', // local mode is days-only
    functions: { market: FN_MARKET },
  })
})

const localAvailable = Boolean(L4_BIN && L4_FILE)

// The model's self-reported last-updated date, via the `the model was last
// updated on` export (returns an ISO yyyy-mm-dd DATE).
async function remoteDate() {
  const url = `${API_BASE}/${DEPLOYMENT}/fn/${FN_UPDATED}/evaluation`
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (API_KEY) headers.Authorization = AUTH_SCHEME ? `${AUTH_SCHEME} ${API_KEY}` : API_KEY
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ arguments: {} }) })
  const j = await r.json()
  const v = j?.contents?.result?.value
  return typeof v === 'string' ? v : null
}

async function localDate() {
  if (!localAvailable) return null
  const src = await readFile(L4_FILE, 'utf8')
  const dir = await mkdtemp(join(tmpdir(), 'spcx-'))
  const tmp = join(dir, 'model.l4')
  try {
    await writeFile(tmp, `${src}\n#EVAL TOSTRING (\`the model was last updated on\`)\n`)
    const out = await runL4(tmp)
    const m = out.match(/\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : null
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

app.get('/api/last-updated', async (_req, res) => {
  try {
    const date = (MODE === 'remote' ? await remoteDate().catch(() => null) : null) || (await localDate().catch(() => null))
    res.json({ date })
  } catch {
    res.json({ date: null })
  }
})

app.post('/api/series', async (req, res) => {
  const days = Math.max(1, Math.min(360, Math.round(Number(req.body?.days) || 180))) // model caps recursion at 360
  const fromDay = Math.max(0, Math.round(Number(req.body?.fromDay) || 0))
  const config = req.body?.config && MODE === 'remote' ? req.body.config : undefined
  try {
    if (MODE === 'local') {
      return res.json({ days, mode: MODE, ...(await localSeries({ days })) })
    }
    try {
      return res.json({ days, mode: MODE, ...(await remoteSeries({ days, config, fromDay })) })
    } catch (e) {
      // The deployed evaluator caps reductions per call; large day counts can
      // 5xx with "resource limit exceeded". Transparently fall back to the local
      // CLI (same model file) for non-config requests until the optimized model
      // is redeployed. Auth/4xx errors are surfaced, not masked.
      const recoverable = !e.status || e.status >= 500
      if (recoverable && !config && localAvailable) {
        console.warn(`[/api/series] remote failed (${e.message}); using local fallback`)
        const local = await localSeries({ days })
        return res.json({ days, mode: MODE, ...local, source: 'local-fallback', note: e.message })
      }
      throw e
    }
  } catch (e) {
    console.error('[/api/series]', e.message)
    res.status(e.status || 502).json({ error: e.message, raw: e.raw ?? null })
  }
})

// Serve the production build if present (single-process prod).
const dist = join(__dirname, '..', 'dist')
access(join(dist, 'index.html'))
  .then(() => {
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
  })
  .catch(() => {})

app.listen(PORT, () => {
  console.log(`[spcx] proxy on :${PORT}  mode=${MODE}  base=${API_BASE}  key=${API_KEY ? 'set' : 'MISSING'}`)
})
