import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Brush,
} from 'recharts'
import type { ChartRow } from '../lib/stats'
import { fmt } from '../lib/stats'
import type { MarketEvent } from '../lib/events'

const evColor = (k: string) => (k === 'buy' ? '#22c55e' : k === 'sell' ? '#ef4444' : '#94a3b8')

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r: ChartRow = payload[0].payload
  return (
    <div className="card px-3 py-2 text-xs space-y-0.5">
      <div className="font-semibold text-accent">Day {r.tradingDay} · {r.date}</div>
      <div>Price <span className="font-mono">{fmt.usd(r.price)}</span></div>
      <div className="text-slate-400">Channel <span className="font-mono">{fmt.usd(r.channelLower)} – {fmt.usd(r.channelUpper)}</span></div>
      <div className="text-buy">Buy <span className="font-mono">{fmt.b(r.buyPressure)}</span></div>
      <div className="text-sell">Sell <span className="font-mono">{fmt.b(r.sellPressure)}</span></div>
      <div>Net <span className="font-mono">{fmt.b(r.netPressure)}</span></div>
      <div className="text-slate-400">Vol <span className="font-mono">{fmt.b(r.volumeNotional)} · {fmt.m(r.volumeShares)}</span></div>
    </div>
  )
}

export default function PriceChannelChart({ rows, offer, events }: { rows: ChartRow[]; offer: number; events: MarketEvent[] }) {
  const maxDay = rows.length ? rows[rows.length - 1].tradingDay : 0
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e2942" strokeDasharray="3 3" />
        <XAxis dataKey="tradingDay" stroke="#64748b" tick={{ fontSize: 11 }}
          tickFormatter={(d) => `${d}`} minTickGap={24} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']}
          tickFormatter={(v) => `$${v}`} width={52} />
        <Tooltip content={<ChartTooltip />} />

        {/* Channel band: invisible lower area + visible band area stacked on top. */}
        <Area dataKey="channelLower" stackId="ch" stroke="none" fill="transparent" isAnimationActive={false} />
        <Area dataKey="channelBand" stackId="ch" stroke="none" fill="url(#bandGrad)" isAnimationActive={false} />

        {/* Channel edges */}
        <Line dataKey="channelUpper" stroke="#60a5fa" strokeOpacity={0.45} strokeDasharray="4 3" dot={false} strokeWidth={1} isAnimationActive={false} />
        <Line dataKey="channelLower" stroke="#60a5fa" strokeOpacity={0.45} strokeDasharray="4 3" dot={false} strokeWidth={1} isAnimationActive={false} />

        {/* Price path */}
        <Line dataKey="price" stroke="#e5ecff" dot={false} strokeWidth={2} isAnimationActive={false} />

        <ReferenceLine y={offer} stroke="#f59e0b" strokeDasharray="5 4" strokeOpacity={0.7}
          label={{ value: `offer $${offer}`, position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10 }} />

        {events.filter((e) => e.day <= maxDay).map((e) => (
          <ReferenceLine key={e.day} x={e.day} stroke={evColor(e.kind)} strokeOpacity={0.5} strokeDasharray="2 4"
            label={{ value: e.label, angle: -90, position: 'insideTop', fill: evColor(e.kind), fontSize: 9, offset: 8 }} />
        ))}

        <Brush dataKey="tradingDay" height={20} stroke="#334155" fill="#0e1730" travellerWidth={8} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
