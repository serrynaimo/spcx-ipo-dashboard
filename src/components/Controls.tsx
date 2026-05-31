import type { ChannelMode } from '../lib/stats'
import InfoTip from './InfoTip'

const TIPS = {
  days: 'How many trading days to simulate from day 0 (the 12 Jun 2026 listing). Takes effect when you click Refresh.',
  channel: 'How the shaded price band is built. Volatility = a ±2σ band from recent daily returns. Rolling = the highest/lowest price over the look-back window. Percent = a fixed ±% envelope around price.',
  width: 'Volatility mode: the band half-width (±%) at TSLA-like volatility (~3.5%/day); it scales up/down with the model’s realised volatility. Percent mode: a fixed ±% envelope. Rolling mode: extra margin on the high/low band.',
  window: 'Look-back length (in trading days) used for the volatility (2σ) estimate or the rolling high/low band.',
  volume: 'Show daily volume as $B notional traded, or as millions of shares.',
}

interface Props {
  days: number
  setDays: (n: number) => void
  channelMode: ChannelMode
  setChannelMode: (m: ChannelMode) => void
  channelWidth: number
  setChannelWidth: (n: number) => void
  channelWindow: number
  setChannelWindow: (n: number) => void
  volMetric: 'notional' | 'shares'
  setVolMetric: (m: 'notional' | 'shares') => void
  onRefresh: () => void
  loading: boolean
}

export default function Controls(p: Props) {
  return (
    <div className="card p-3 flex flex-wrap items-end gap-4">
      <div className="knob min-w-[180px] grow">
        <span className="label flex items-center gap-1.5">Trading days · {p.days} <InfoTip text={TIPS.days} /></span>
        <input type="range" min={5} max={180} step={1} value={p.days}
          onChange={(e) => p.setDays(Number(e.target.value))} />
      </div>

      <div className="knob">
        <span className="label flex items-center gap-1.5">Channel <InfoTip text={TIPS.channel} /></span>
        <select className="bg-panel2 border border-edge rounded-lg px-2 py-1 text-sm"
          value={p.channelMode} onChange={(e) => p.setChannelMode(e.target.value as ChannelMode)}>
          <option value="percent">± Percent band</option>
          <option value="rolling">Rolling high/low</option>
          <option value="volatility">Volatility (2σ)</option>
        </select>
      </div>

      <div className="knob min-w-[150px]">
        <span className="label flex items-center gap-1.5">
          {p.channelMode === 'percent' ? `Width · ±${p.channelWidth}%` : `Margin · ${p.channelWidth}%`}
          <InfoTip text={TIPS.width} />
        </span>
        <input type="range" min={0} max={40} step={0.5} value={p.channelWidth}
          onChange={(e) => p.setChannelWidth(Number(e.target.value))} />
      </div>

      {p.channelMode !== 'percent' && (
        <div className="knob min-w-[130px]">
          <span className="label flex items-center gap-1.5">Window · {p.channelWindow}d <InfoTip text={TIPS.window} /></span>
          <input type="range" min={2} max={40} step={1} value={p.channelWindow}
            onChange={(e) => p.setChannelWindow(Number(e.target.value))} />
        </div>
      )}

      <div className="knob">
        <span className="label flex items-center gap-1.5">Volume <InfoTip text={TIPS.volume} /></span>
        <div className="flex rounded-lg overflow-hidden border border-edge text-sm">
          <button className={`px-2 py-1 ${p.volMetric === 'notional' ? 'bg-accent/25 text-accent' : 'bg-panel2'}`}
            onClick={() => p.setVolMetric('notional')}>$B</button>
          <button className={`px-2 py-1 ${p.volMetric === 'shares' ? 'bg-accent/25 text-accent' : 'bg-panel2'}`}
            onClick={() => p.setVolMetric('shares')}>Shares</button>
        </div>
      </div>

      <button className="btn btn-accent ml-auto" onClick={p.onRefresh} disabled={p.loading}>
        {p.loading ? 'Loading…' : '↻ Refresh'}
      </button>
    </div>
  )
}
