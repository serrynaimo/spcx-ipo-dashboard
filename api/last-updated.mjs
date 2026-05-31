import { remoteDate } from '../lib/l4-proxy.mjs'

export default async function handler(_req, res) {
  try {
    res.status(200).json({ date: await remoteDate() })
  } catch {
    res.status(200).json({ date: null })
  }
}
