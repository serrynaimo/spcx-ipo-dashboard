import { getMeta } from '../lib/l4-proxy.mjs'

export default function handler(_req, res) {
  res.status(200).json(getMeta())
}
