import type { IpoConfig, Meta, SeriesResponse } from './types'

// A freshly-deployed model compiles for a few seconds; the proxy returns HTTP 202
// ({ compiling: true }) until it's ready. These helpers transparently keep polling
// on 202 so the dashboard loads the moment the deployment finishes compiling.
const COMPILE_POLL_MS = 2000
const COMPILE_MAX_TRIES = 60 // ~2 min ceiling

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchMeta(): Promise<Meta> {
  const r = await fetch('/api/meta')
  if (!r.ok) throw new Error('meta failed')
  return r.json()
}

export async function fetchLastUpdated(): Promise<string | null> {
  for (let i = 0; i < COMPILE_MAX_TRIES; i++) {
    try {
      const r = await fetch('/api/last-updated')
      if (r.status === 202) { await sleep(COMPILE_POLL_MS); continue }
      const j = await r.json()
      return j?.date ?? null
    } catch {
      return null
    }
  }
  return null
}

// The model's canonical default IPO config. Polls through 202 (compiling), and
// returns null on any hard failure so the caller can fall back to its baked-in default.
export async function fetchDefaultConfig(): Promise<IpoConfig | null> {
  for (let i = 0; i < COMPILE_MAX_TRIES; i++) {
    try {
      const r = await fetch('/api/default-config')
      if (r.status === 202) { await sleep(COMPILE_POLL_MS); continue }
      const j = await r.json()
      if (!r.ok || !j?.config) return null
      return j.config as IpoConfig
    } catch {
      return null
    }
  }
  return null
}

export async function fetchSeries(days: number, config?: IpoConfig): Promise<SeriesResponse> {
  for (let i = 0; ; i++) {
    const r = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, config }),
    })
    // 202 = deployment still compiling — wait and retry until it's ready (or we give up).
    if (r.status === 202 && i < COMPILE_MAX_TRIES) { await sleep(COMPILE_POLL_MS); continue }
    const json = await r.json()
    if (!r.ok) throw new Error(json?.error || `request failed (${r.status})`)
    return json
  }
}
