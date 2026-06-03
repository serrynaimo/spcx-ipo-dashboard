import { useState } from 'react'
import type { IpoConfig, FlowWindow } from '../types'
import { SCALAR_KNOBS } from '../lib/defaultConfig'
import InfoTip from './InfoTip'

const COL_TIPS = {
  window: 'A named timeframe of interest. Buy windows = fund acquisition / retail demand; sell windows = supply (flippers, lock-up tranches, profit-taking).',
  side: '“buy” adds acquisition pressure; “sell” adds supply pressure on those days.',
  start: 'First trading day of the window (0 = the 12 Jun 2026 listing day).',
  len: 'Number of trading days the window spans.',
  notional: 'Total interest ($B) spread across the window’s days.',
  bias: 'Forward-bias, 0–1. Lower = more front-loaded (interest realised earlier in the window); near 1 = spread evenly.',
}

interface Props {
  config: IpoConfig
  setConfig: (c: IpoConfig) => void
  onReset: () => void
  editable: boolean
  onApply: () => void
}

export default function ConfigPanel({ config, setConfig, onReset, editable, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const set = (k: keyof IpoConfig, v: number) => setConfig({ ...config, [k]: v })
  const setWin = (i: number, patch: Partial<FlowWindow>) => {
    const fw = config['flow windows'].map((w, j) => (j === i ? { ...w, ...patch } : w))
    setConfig({ ...config, 'flow windows': fw })
  }

  return (
    <div className="card">
      <button className="w-full flex items-center justify-between px-4 py-2.5" onClick={() => setOpen((o) => !o)}>
        <span className="font-semibold text-sm">⚙ Model configuration {!editable && <span className="text-amber-400 text-xs">(remote mode only)</span>}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`px-4 pb-4 space-y-4 ${editable ? '' : 'opacity-50 pointer-events-none'}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {SCALAR_KNOBS.map((k) => (
              <div key={String(k.key)} className="knob">
                <span className="label flex items-center gap-1.5">
                  <span>{k.label} · <span className="font-mono text-slate-300">{Number(config[k.key]).toLocaleString()}</span></span>
                  <InfoTip text={k.tip} />
                </span>
                <input type="range" min={k.min} max={k.max} step={k.step} value={config[k.key] as number}
                  onChange={(e) => set(k.key, Number(e.target.value))} />
              </div>
            ))}
          </div>

          <div>
            <div className="label mb-1">Flow windows (timeframes) — buy = acquisition, sell = supply</div>
            <div className="max-h-64 overflow-auto border border-edge rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-panel2 text-slate-400">
                  <tr>
                    <th className="text-left px-2 py-1"><span className="inline-flex items-center gap-1">Window <InfoTip text={COL_TIPS.window} native /></span></th>
                    <th className="px-2"><span className="inline-flex items-center gap-1">Side <InfoTip text={COL_TIPS.side} native /></span></th>
                    <th className="px-2"><span className="inline-flex items-center gap-1">Start <InfoTip text={COL_TIPS.start} native /></span></th>
                    <th className="px-2"><span className="inline-flex items-center gap-1">Len <InfoTip text={COL_TIPS.len} native /></span></th>
                    <th className="px-2"><span className="inline-flex items-center gap-1">$B <InfoTip text={COL_TIPS.notional} native /></span></th>
                    <th className="px-2"><span className="inline-flex items-center gap-1">Bias <InfoTip text={COL_TIPS.bias} native /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {config['flow windows'].map((w, i) => (
                    <tr key={i} className="border-t border-edge/60">
                      <td className="px-2 py-1 max-w-[260px] truncate" title={w.label}>
                        <span className={w.side === 'buy' ? 'text-buy' : 'text-sell'}>●</span> {w.label}
                      </td>
                      <td className="px-1 text-center text-slate-400">{w.side}</td>
                      <NumCell v={w['start day']} on={(v) => setWin(i, { 'start day': v })} />
                      <NumCell v={w.length} on={(v) => setWin(i, { length: v })} />
                      <NumCell v={w['total notional']} step={0.5} on={(v) => setWin(i, { 'total notional': v })} />
                      <NumCell v={w.bias} step={0.01} on={(v) => setWin(i, { bias: v })} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={onApply} disabled={!editable}>Apply config →</button>
            <button className="btn" onClick={onReset}>Reset to default assumptions</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NumCell({ v, on, step = 1 }: { v: number; on: (n: number) => void; step?: number }) {
  return (
    <td className="px-1 py-0.5">
      <input type="number" step={step} value={v} onChange={(e) => on(Number(e.target.value))}
        className="w-16 bg-panel border border-edge rounded px-1 py-0.5 text-right font-mono" />
    </td>
  )
}
