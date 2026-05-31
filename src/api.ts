import type { IpoConfig, Meta, SeriesResponse } from './types'

export async function fetchMeta(): Promise<Meta> {
  const r = await fetch('/api/meta')
  if (!r.ok) throw new Error('meta failed')
  return r.json()
}

export async function fetchLastUpdated(): Promise<string | null> {
  try {
    const r = await fetch('/api/last-updated')
    const j = await r.json()
    return j?.date ?? null
  } catch {
    return null
  }
}

export async function fetchSeries(days: number, config?: IpoConfig): Promise<SeriesResponse> {
  const r = await fetch('/api/series', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, config }),
  })
  const json = await r.json()
  if (!r.ok) throw new Error(json?.error || `request failed (${r.status})`)
  return json
}
