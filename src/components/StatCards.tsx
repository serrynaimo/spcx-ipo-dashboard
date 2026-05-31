import type { Summary } from '../lib/stats'
import { fmt } from '../lib/stats'

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card px-3 py-2">
      <div className="label">{label}</div>
      <div className={`text-lg font-semibold font-mono ${tone ?? ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

export default function StatCards({ s }: { s: Summary }) {
  const popPct = s.open / s.offer - 1
  const fromOffer = s.final / s.offer - 1
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Card label="Day-0 open" value={fmt.usd(s.open)} sub={`${fmt.pct(popPct)} pop vs $${s.offer}`} tone="text-accent" />
      <Card label="Peak" value={fmt.usd(s.peak)} sub={`day ${s.peakDay}`} tone="text-buy" />
      <Card label="Trough" value={fmt.usd(s.trough)} sub={`day ${s.troughDay}`} tone="text-sell" />
      <Card label="Final" value={fmt.usd(s.final)} sub={`${fmt.pct(fromOffer)} vs offer`} tone={fromOffer >= 0 ? 'text-buy' : 'text-sell'} />
      <Card label="Max drawdown" value={fmt.pct(s.maxDrawdown)} sub="peak→trough" tone="text-sell" />
      <Card label="Σ Buy / Sell" value={`${fmt.b(s.totalBuy)}`} sub={`sell ${fmt.b(s.totalSell)} · vol ${fmt.b(s.totalVolume)}`} />
    </div>
  )
}
