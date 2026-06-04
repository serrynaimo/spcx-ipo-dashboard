import type { IpoConfig } from '../types'

// Milestone events drawn as chart reference lines. These are derived from the
// deployed model's flow windows (see `eventsFromConfig`) rather than hand-listed,
// so the chart annotations always track the model — add, remove or retime a flow
// window in the L4 and the charts follow with no edit here.
export interface MarketEvent {
  day: number
  label: string
  kind: 'buy' | 'sell' | 'info'
}

// Condense a verbose flow-window label to its leading phrase for a chart annotation:
// drop any parenthetical or colon-introduced detail and surrounding whitespace.
// e.g. "retail IPO surge (30% of float, RH/Fidelity/Schwab)" → "retail IPO surge".
function shortLabel(label: string): string {
  const cut = label.split(/[(:]/)[0].trim()
  return cut || label.trim()
}

// Derive the chart's milestone reference lines straight from the model's flow
// windows. Each window contributes a line at its `start day`, labelled with the
// window's own (condensed) label and coloured by side. Windows that share a start
// day are merged into a single line — their label phrases joined — and a day that
// carries both buy and sell windows is drawn neutral.
export function eventsFromConfig(config: IpoConfig | null | undefined): MarketEvent[] {
  if (!config) return []
  const byDay = new Map<number, { labels: string[]; sides: Set<'buy' | 'sell'> }>()
  for (const w of config['flow windows']) {
    const day = w['start day']
    const entry = byDay.get(day) ?? { labels: [], sides: new Set<'buy' | 'sell'>() }
    const s = shortLabel(w.label)
    if (!entry.labels.includes(s)) entry.labels.push(s)
    entry.sides.add(w.side)
    byDay.set(day, entry)
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, { labels, sides }]) => ({
      day,
      label: labels.join(' · '),
      kind: sides.size === 1 ? [...sides][0] : 'info',
    }))
}

const LISTING = new Date(Date.UTC(2026, 5, 12)) // 12 Jun 2026

export function dateForOffset(calendarDayOffset: number): string {
  const d = new Date(LISTING)
  d.setUTCDate(d.getUTCDate() + Math.round(calendarDayOffset))
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}
