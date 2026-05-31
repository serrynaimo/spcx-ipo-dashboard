import type { DailyMarket } from '../types'
import { dateForOffset } from './events'

export type ChannelMode = 'percent' | 'rolling' | 'volatility'

export interface ChartRow extends DailyMarket {
  date: string
  channelLower: number
  channelUpper: number
  channelBand: number // upper - lower, for the stacked-area band trick
  sellNeg: number // negative sell pressure, for diverging bars
}

// Build the price channel (a band with top/bottom margin around the price path).
export function buildChartRows(points: DailyMarket[], mode: ChannelMode, widthPct: number, window: number): ChartRow[] {
  const w = Math.max(0, widthPct) / 100
  const rollWin = Math.max(2, Math.round(window))

  // Per-day return volatility (rolling stdev) for the volatility channel.
  const rets = points.map((p, i) => (i === 0 ? 0 : p.price / points[i - 1].price - 1))

  return points.map((p, i) => {
    let lower: number
    let upper: number
    if (mode === 'rolling') {
      const lo = Math.max(0, i - rollWin + 1)
      const slice = points.slice(lo, i + 1).map((q) => q.price)
      lower = Math.min(...slice)
      upper = Math.max(...slice)
      // Add a small static margin so the band is visible even when flat.
      const pad = p.price * w * 0.25
      lower -= pad
      upper += pad
    } else if (mode === 'volatility') {
      const lo = Math.max(0, i - rollWin + 1)
      const slc = rets.slice(lo, i + 1)
      const mean = slc.reduce((a, b) => a + b, 0) / slc.length
      const variance = slc.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, slc.length)
      const sd = Math.sqrt(variance)
      // The band half-width equals `w` (the Margin %) when realised volatility is
      // TSLA-like (~3.5%/day ≈ ~55% annualised), and breathes with the model's
      // actual volatility, clamped to 0.4×–2× so it stays a readable channel.
      const SIGMA_REF = 0.035
      const scale = Math.min(2, Math.max(0.4, sd / SIGMA_REF))
      const margin = p.price * w * scale
      lower = p.price - margin
      upper = p.price + margin
    } else {
      lower = p.price * (1 - w)
      upper = p.price * (1 + w)
    }
    return {
      ...p,
      date: dateForOffset(p.calendarDayOffset),
      channelLower: lower,
      channelUpper: upper,
      channelBand: upper - lower,
      sellNeg: -p.sellPressure,
    }
  })
}

export interface Summary {
  open: number
  offer: number
  peak: number
  peakDay: number
  trough: number
  troughDay: number
  final: number
  maxDrawdown: number
  totalBuy: number
  totalSell: number
  totalVolume: number
}

export function summarize(points: DailyMarket[], offerPrice: number): Summary | null {
  if (!points.length) return null
  let peak = -Infinity, peakDay = 0, trough = Infinity, troughDay = 0
  let runMax = -Infinity, maxDD = 0
  let totalBuy = 0, totalSell = 0, totalVolume = 0
  for (const p of points) {
    if (p.price > peak) { peak = p.price; peakDay = p.tradingDay }
    if (p.price < trough) { trough = p.price; troughDay = p.tradingDay }
    runMax = Math.max(runMax, p.price)
    maxDD = Math.min(maxDD, p.price / runMax - 1)
    totalBuy += p.buyPressure
    totalSell += p.sellPressure
    totalVolume += p.volumeNotional
  }
  return {
    open: points[0].price,
    offer: offerPrice,
    peak, peakDay, trough, troughDay,
    final: points[points.length - 1].price,
    maxDrawdown: maxDD,
    totalBuy, totalSell, totalVolume,
  }
}

export const fmt = {
  usd: (n: number) => `$${n.toFixed(2)}`,
  usd0: (n: number) => `$${n.toFixed(0)}`,
  b: (n: number) => `$${n.toFixed(1)}B`,
  pct: (n: number) => `${(n * 100).toFixed(1)}%`,
  m: (n: number) => `${n.toFixed(0)}M`,
}
