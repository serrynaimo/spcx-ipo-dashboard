import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchLastUpdated, fetchMeta, fetchSeries } from './api'
import type { DailyMarket, IpoConfig, Meta } from './types'
import { DEFAULT_CONFIG } from './lib/defaultConfig'
import { buildChartRows, summarize, type ChannelMode } from './lib/stats'
import Controls from './components/Controls'
import ConfigPanel from './components/ConfigPanel'
import StatCards from './components/StatCards'
import PriceChannelChart from './components/PriceChannelChart'
import PressureChart from './components/PressureChart'
import VolumeChart from './components/VolumeChart'
import DataTable from './components/DataTable'

// Link to the deployed model source (jl4 viewer). Set VITE_MODEL_CODE_URL in .env.
const MODEL_CODE_URL = import.meta.env.VITE_MODEL_CODE_URL as string | undefined

// "2026-05-31" → "31 May 2026" (falls back to the raw string if it isn't ISO).
function formatModelDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [points, setPoints] = useState<DailyMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelUpdated, setModelUpdated] = useState<string | null>(null)

  const [days, setDays] = useState(180)
  const [config, setConfig] = useState<IpoConfig>(() => structuredClone(DEFAULT_CONFIG))
  const [useConfig, setUseConfig] = useState(false)

  const [channelMode, setChannelMode] = useState<ChannelMode>('volatility')
  const [channelWidth, setChannelWidth] = useState(20)
  const [channelWindow, setChannelWindow] = useState(10)
  const [volMetric, setVolMetric] = useState<'notional' | 'shares'>('notional')

  // keep latest params in a ref so the loader always reads fresh values
  const paramsRef = useRef({ days, config, useConfig })
  paramsRef.current = { days, config, useConfig }

  // Single-flight guard: the model eval is expensive (and the deployed service caps
  // concurrency), so never let two /api/series requests run at once. If a load is
  // requested while one is in flight, mark it pending and fire exactly one more —
  // with the latest params — when the current request settles. Latest-wins, no overlap.
  const inFlight = useRef(false)
  const pending = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runLoad = useCallback(async () => {
    if (inFlight.current) { pending.current = true; return }
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const { days: d, config: c, useConfig: uc } = paramsRef.current
      const resp = await fetchSeries(d, uc ? c : undefined)
      setPoints(resp.points)
    } catch (e: any) {
      setError(e.message || 'request failed')
    } finally {
      inFlight.current = false
      if (pending.current) {
        // params changed while we were loading — run once more with the latest values.
        pending.current = false
        runLoad()
      } else {
        setLoading(false)
      }
    }
  }, [])

  // Debounce triggers by 1s so rapid Refresh / Apply / revert clicks collapse into a
  // single eval. setLoading(true) up front gives immediate feedback during the wait.
  const load = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setLoading(true)
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null
      runLoad()
    }, 1000)
  }, [runLoad])

  // Clear a pending debounce on unmount.
  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }, [])

  // Header metadata only — these are one-time and never re-fire on interaction.
  useEffect(() => { fetchMeta().then(setMeta).catch(() => {}) }, [])
  useEffect(() => { fetchLastUpdated().then(setModelUpdated).catch(() => {}) }, [])
  // Load the model once on first page load; after that it only runs on Refresh / Apply.
  useEffect(() => { runLoad() }, [runLoad])

  const rows = useMemo(
    () => buildChartRows(points, channelMode, channelWidth, channelWindow),
    [points, channelMode, channelWidth, channelWindow],
  )
  const summary = useMemo(() => summarize(points, config['offer price']), [points, config])

  const applyConfig = () => { setUseConfig(true); load() }

  return (
    <div className="min-h-full p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SPCX <span className="text-accent">IPO Model Explorer</span>
          </h1>
          <p className="text-sm text-slate-400">
            <a href="https://legalese.com/l4" target="_blank" rel="noreferrer" className="text-accent hover:underline">Modelled in L4 rules-as-code</a>
            {' · '}
            <a href="https://legalese.cloud" target="_blank" rel="noreferrer" className="text-accent hover:underline">Deployed on Legalese Cloud</a>
            {MODEL_CODE_URL && (
              <>
                {' · '}
                <a href={MODEL_CODE_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">view the model L4 code</a>
              </>
            )}
            {' · '}
            <a href="https://vercel.com">Hosted on Vercel</a> 
            {' · '}
            <a href="https://github.com/legalese/spcx-ipo-model" target="_blank" rel="noreferrer" className="text-accent hover:underline">Source code</a>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {modelUpdated && <span className="text-slate-500">Last updated {formatModelDate(modelUpdated)}</span>}
        </div>
      </header>
      
      <Controls
        days={days} setDays={setDays}
        channelMode={channelMode} setChannelMode={setChannelMode}
        channelWidth={channelWidth} setChannelWidth={setChannelWidth}
        channelWindow={channelWindow} setChannelWindow={setChannelWindow}
        volMetric={volMetric} setVolMetric={setVolMetric}
        onRefresh={load} loading={loading}
      />

      {error && (
        <div className="card border-sell/50 bg-sell/10 px-4 py-3 text-sm text-rose-200">
          <b>Error:</b> {error}
          {meta?.mode === 'remote' && !meta?.hasKey && ' — add L4_API_KEY to .env and restart the server.'}
          {useConfig && / resource limit/i.test(error) && ' — custom-config eval runs live on the cloud; reduce the day count (≤ ~30) to stay under the per-call budget.'}
        </div>
      )}

      {!points.length && !loading && !error && (
        <div className="card px-4 py-8 text-center text-sm text-slate-400">
          Press <span className="text-accent font-semibold">↻ Refresh</span> to run the model.
        </div>
      )}

      {summary && <StatCards s={summary} />}

      <section className="card p-3">
        <div className="flex items-center justify-between mb-1 px-1">
          <h2 className="font-semibold">Price channel</h2>
          <span className="text-xs text-slate-400">
            white = price · blue band = {channelMode === 'percent' ? `±${channelWidth}% envelope` : channelMode === 'rolling' ? `${channelWindow}-day high/low` : `±${channelWidth}% volatility band`} · amber = offer
          </span>
        </div>
        <div className="h-[360px]">
          <PriceChannelChart rows={rows} offer={config['offer price']} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-3">
          <h2 className="font-semibold mb-1 px-1">Order-flow pressure <span className="text-xs text-slate-400">(buy ▲ / sell ▼ / net —, $B)</span></h2>
          <div className="h-[240px]"><PressureChart rows={rows} /></div>
        </section>
        <section className="card p-3">
          <h2 className="font-semibold mb-1 px-1">Volume <span className="text-xs text-slate-400">({volMetric === 'notional' ? '$B traded' : 'M shares'}, coloured by net flow)</span></h2>
          <div className="h-[240px]"><VolumeChart rows={rows} metric={volMetric} /></div>
        </section>
      </div>

      <ConfigPanel config={config} setConfig={setConfig} editable={Boolean(meta?.configEditable)} onApply={applyConfig} />
      {useConfig && (
        <div className="text-xs text-slate-400 px-1 -mt-2">
          Using a custom configuration (sent to the deployed model).{' '}
          <button className="text-accent underline" onClick={() => { setUseConfig(false); load() }}>revert to deployed defaults</button>
        </div>
      )}

      <DataTable rows={rows} />

      <footer className="text-xs text-slate-500 pt-2 pb-6">
        Modelling assumptions only — not investment advice.
      </footer>
    </div>
  )
}
