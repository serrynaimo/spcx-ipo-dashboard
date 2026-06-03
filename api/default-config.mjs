import { remoteDefaultConfig } from '../lib/l4-proxy.mjs'

// The model's canonical default IPO config, parsed from the deployed
// `the default SpaceX IPO config` export. The browser seeds its config panel
// from here so the dashboard always reflects the live model assumptions.
export default async function handler(_req, res) {
  try {
    res.status(200).json({ config: await remoteDefaultConfig() })
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message, config: null })
  }
}
