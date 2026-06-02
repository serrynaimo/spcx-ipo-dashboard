// Milestone events, keyed by trading-day index, drawn as reference lines.
export interface MarketEvent {
  day: number
  label: string
  kind: 'buy' | 'sell' | 'info'
}

export const EVENTS: MarketEvent[] = [
  { day: 0, label: 'Listing (12 Jun)', kind: 'info' },
  { day: 5, label: 'FTSE/Russell entry', kind: 'buy' },
  { day: 15, label: 'Nasdaq-100 entry', kind: 'buy' },
  { day: 30, label: 'Q2 earnings · 20% lock-up', kind: 'sell' },
  { day: 95, label: 'Q3 earnings · 28% lock-up', kind: 'sell' },
  { day: 125, label: 'S&P 500 inclusion (12 Dec)', kind: 'buy' },
  // S-1/A (2 Jun 2026): full release deferred to Q2-2027 results + Musk's 366-day
  // lock — both beyond this 180-day horizon, so no 100% unlock prints here anymore.
  { day: 126, label: 'Full release deferred → Q2 2027', kind: 'info' },
]

const LISTING = new Date(Date.UTC(2026, 5, 12)) // 12 Jun 2026

export function dateForOffset(calendarDayOffset: number): string {
  const d = new Date(LISTING)
  d.setUTCDate(d.getUTCDate() + Math.round(calendarDayOffset))
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}
