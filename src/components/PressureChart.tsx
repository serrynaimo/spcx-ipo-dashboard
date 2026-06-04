import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { ChartRow } from '../lib/stats'
import { fmt } from '../lib/stats'
import type { MarketEvent } from '../lib/events'

function TT({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r: ChartRow = payload[0].payload
  return (
    <div className="card px-3 py-2 text-xs space-y-0.5">
      <div className="font-semibold text-accent">Day {r.tradingDay} · {r.date}</div>
      <div className="text-buy">Buy <span className="font-mono">{fmt.b(r.buyPressure)}</span></div>
      <div className="text-sell">Sell <span className="font-mono">{fmt.b(r.sellPressure)}</span></div>
      <div>Net <span className="font-mono">{fmt.b(r.netPressure)}</span></div>
    </div>
  )
}

// Diverging order-flow: buy above zero, sell below zero, net as a line.
export default function PressureChart({ rows, events }: { rows: ChartRow[]; events: MarketEvent[] }) {
  const maxDay = rows.length ? rows[rows.length - 1].tradingDay : 0
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }} stackOffset="sign">
        <CartesianGrid stroke="#1e2942" strokeDasharray="3 3" />
        <XAxis dataKey="tradingDay" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => `${v}`}
          label={{ value: '$B', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
        <Tooltip content={<TT />} />
        <ReferenceLine y={0} stroke="#334155" />
        <Bar dataKey="buyPressure" stackId="p" fill="#22c55e" fillOpacity={0.75} isAnimationActive={false} />
        <Bar dataKey="sellNeg" stackId="p" fill="#ef4444" fillOpacity={0.75} isAnimationActive={false} />
        <Line dataKey="netPressure" stroke="#e5ecff" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        {events.filter((e) => e.day <= maxDay).map((e) => (
          <ReferenceLine key={e.day} x={e.day} stroke="#475569" strokeOpacity={0.5} strokeDasharray="2 4" />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
