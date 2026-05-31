import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import type { ChartRow } from '../lib/stats'
import { fmt } from '../lib/stats'
import { EVENTS } from '../lib/events'

function TT({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r: ChartRow = payload[0].payload
  return (
    <div className="card px-3 py-2 text-xs space-y-0.5">
      <div className="font-semibold text-accent">Day {r.tradingDay} · {r.date}</div>
      <div>Volume <span className="font-mono">{fmt.b(r.volumeNotional)}</span></div>
      <div className="text-slate-400"><span className="font-mono">{fmt.m(r.volumeShares)}</span> shares</div>
    </div>
  )
}

export default function VolumeChart({ rows, metric }: { rows: ChartRow[]; metric: 'notional' | 'shares' }) {
  const maxDay = rows.length ? rows[rows.length - 1].tradingDay : 0
  const key = metric === 'notional' ? 'volumeNotional' : 'volumeShares'
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="#1e2942" strokeDasharray="3 3" />
        <XAxis dataKey="tradingDay" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={52}
          tickFormatter={(v) => (metric === 'notional' ? `$${v}` : `${v}`)} />
        <Tooltip content={<TT />} cursor={{ fill: '#ffffff08' }} />
        <Bar dataKey={key} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.tradingDay} fill={r.netPressure >= 0 ? '#38bdf8' : '#fb7185'} fillOpacity={0.7} />
          ))}
        </Bar>
        {EVENTS.filter((e) => e.day <= maxDay).map((e) => (
          <ReferenceLine key={e.day} x={e.day} stroke="#475569" strokeOpacity={0.5} strokeDasharray="2 4" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
