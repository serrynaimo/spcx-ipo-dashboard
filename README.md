# SPCX IPO Model Explorer

A live dashboard that polls the deployed **L4 `spacex-ipo-model`** API and renders the
post‑IPO **price / buy / sell / net pressure / volume** path — one point per trading day
from the 12 Jun 2026 SpaceX listing.

- **Price channel** — the price line inside a shaded band (percent envelope, rolling
  high/low, or 2σ volatility) with a top/bottom margin.
- **Order‑flow pressure** — diverging buy (▲) / sell (▼) bars with the net line.
- **Volume** — $B or shares, coloured by net flow.
- **Milestone markers** — FTSE (day 5), Nasdaq‑100 (day 15), Q2/Q3 earnings lock‑ups,
  S&P 500 inclusion (day 125), 180‑day full release.
- **Live config panel** — edit the IPO config (offer price, float, impact, flow‑window
  timeframes) and re‑evaluate against the deployment's `the-market-path-for` function.
- **Auto‑poll**, CSV export, summary stats.

## Quick start

```bash
cp .env.example .env      # then paste your key into L4_API_KEY (already done if you see one)
npm install
npm run dev               # web on http://localhost:5173, API proxy on :8787
```

`npm run dev` runs the Vite app + the Express proxy together. Open
**http://localhost:5173**. (Or `npm run build && npm start` for a single‑process build
served from http://localhost:8787.)

## How it talks to the model

The browser only ever calls `/api/*`. A small **Express proxy** (`server/index.mjs`) holds
the API key server‑side and forwards to the deployment — the key is never bundled into the
frontend.

```
browser ──/api/series──▶ Express proxy ──▶ https://api.legalese.cloud/legalese
                              │                 /spacex-ipo-model/fn/<fn>/evaluation
                              └─(fallback)──▶ local `l4` CLI on the .l4 file
```

`.env` knobs (see `.env.example`):

| var | meaning |
|---|---|
| `L4_MODE` | `remote` (cloud API) or `local` (run the `l4` CLI directly) |
| `L4_API_KEY` | bearer token for Legalese Cloud |
| `L4_API_BASE` / `L4_DEPLOYMENT` | `https://api.legalese.cloud/legalese` / `spacex-ipo-model` |
| `L4_BIN` / `L4_FILE` | local `l4` binary + the `.l4` model (for local mode & fallback) |

## ⚠️ The per‑call horizon limit (important)

The managed L4 evaluator enforces a **per‑evaluation resource budget**. Because the model
is a *cumulative* path (day *d* depends on days 0…*d*), a single call that asks for a long
horizon exceeds that budget: **direct cloud calls currently succeed up to ~20–25 trading
days**, then return `Evaluation resource limit exceeded`.

This dashboard handles that automatically:

- **Short horizons** (≤ ~20 days) are served **straight from the cloud API** (`source: remote`).
- **Long horizons** (e.g. the full 180‑day view) are transparently served by the **local
  `l4` CLI fallback** on the same model file (`source: local-fallback`) — identical numbers.
  The source badge and a banner tell you which path served the data.
- **Custom‑config** evaluations (`the-market-path-for`) run **only on the cloud** and do not
  fall back, so keep the day count ≤ ~25 when editing the config live.

To get the **full 180‑day path from the cloud itself**, the deployment's evaluation resource
limit would need to be raised on the Legalese Cloud side (a platform setting, not a model
change). The model has already been optimised (closed‑form powers, single pressure
computation per day) to push the horizon as far as the current budget allows.

## Project layout

```
server/index.mjs        Express proxy: remote + local-fallback, response normaliser
src/App.tsx             dashboard shell, polling, state
src/components/         PriceChannelChart, PressureChart, VolumeChart, ConfigPanel, …
src/lib/stats.ts        channel construction + summary stats
src/lib/defaultConfig.ts  mirrors the `SpaceX IPO` config baked into the .l4 model
```

Modelling assumptions only — not investment advice.
