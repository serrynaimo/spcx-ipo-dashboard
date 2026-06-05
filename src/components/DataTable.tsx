import { useState } from 'react'
import type { ChartRow } from '../lib/stats'
import { fmt } from '../lib/stats'

export default function DataTable({ rows }: { rows: ChartRow[] }) {
  const [open, setOpen] = useState(true)
  const exportCsv = () => {
    const head = ['tradingDay', 'date', 'calendarDayOffset', 'price', 'buyPressure', 'sellPressure', 'netPressure', 'volumeNotional', 'volumeShares']
    const body = rows.map((r) => head.map((h) => (r as any)[h]).join(','))
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'spcx-market.csv'
    a.click()
  }
  return (
    <div className="card">
      <div className="w-full flex items-center justify-between px-4 py-2.5">
        <button className="font-semibold text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? '▲' : '▼'} Data table ({rows.length} days)
        </button>
        <button className="btn text-xs" onClick={exportCsv}>⤓ CSV</button>
      </div>
      {open && (
        <div className="max-h-80 overflow-auto border-t border-edge">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-panel2 text-slate-400">
              <tr>
                {['Day', 'Date', 'Price', 'Buy $B', 'Sell $B', 'Net $B', 'Vol $B', 'Vol M sh'].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-right first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tradingDay} className="border-t border-edge/40 hover:bg-panel2/60">
                  <td className="px-3 py-1 text-left text-slate-400">{r.tradingDay}</td>
                  <td className="px-3 py-1 text-right text-slate-400">{r.date}</td>
                  <td className="px-3 py-1 text-right text-accent">{fmt.usd(r.price)}</td>
                  <td className="px-3 py-1 text-right text-buy">{r.buyPressure.toFixed(2)}</td>
                  <td className="px-3 py-1 text-right text-sell">{r.sellPressure.toFixed(2)}</td>
                  <td className={`px-3 py-1 text-right ${r.netPressure >= 0 ? 'text-buy' : 'text-sell'}`}>{r.netPressure.toFixed(2)}</td>
                  <td className="px-3 py-1 text-right">{r.volumeNotional.toFixed(1)}</td>
                  <td className="px-3 py-1 text-right text-slate-400">{r.volumeShares.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
