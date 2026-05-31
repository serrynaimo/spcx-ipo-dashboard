import { remoteSeries } from '../lib/l4-proxy.mjs'

// Vercel populates req.body for application/json; fall back to reading the stream.
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return {} } }
  return await new Promise((resolve) => {
    let s = ''
    req.on('data', (c) => (s += c))
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const body = await readBody(req)
  const days = Math.max(1, Math.min(360, Math.round(Number(body?.days) || 180))) // model caps recursion at 360
  const fromDay = Math.max(0, Math.round(Number(body?.fromDay) || 0))
  const config = body?.config || undefined
  try {
    const result = await remoteSeries({ days, fromDay, config })
    res.status(200).json({ days, mode: 'remote', ...result })
  } catch (e) {
    // No local fallback on Vercel — surface the cloud error (e.g. resource limit).
    res.status(e.status || 502).json({ error: e.message })
  }
}
