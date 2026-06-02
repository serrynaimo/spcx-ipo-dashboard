import type { FlowWindow, IpoConfig } from '../types'

// Mirrors the `SpaceX IPO` config baked into spacex-ipo-model.l4, so the
// config panel starts from the exact deployed defaults.
export const DEFAULT_FLOW_WINDOWS: FlowWindow[] = [
  { label: 'retail IPO surge (30% of float, RH/Fidelity/Schwab)', side: 'buy', 'start day': 0, length: 20, 'total notional': 45, bias: 0.85 },
  { label: 'institutional / active-fund accumulation (13F)', side: 'buy', 'start day': 0, length: 130, 'total notional': 28, bias: 0.985 },
  { label: 'FTSE Russell Fast Entry front-run (~day 5, 19 Jun)', side: 'buy', 'start day': 1, length: 5, 'total notional': 5, bias: 0.75 },
  { label: 'Nasdaq-100 Fast Entry front-run (~day 15, ~3 Jul)', side: 'buy', 'start day': 10, length: 6, 'total notional': 7, bias: 0.7 },
  { label: 'retail echo chasing index-inclusion headlines', side: 'buy', 'start day': 5, length: 12, 'total notional': 8, bias: 0.8 },
  { label: 'S&P 500 inclusion front-run (~day 125, 12 Dec)', side: 'buy', 'start day': 118, length: 8, 'total notional': 11, bias: 0.72 },
  { label: 'IPO flippers (listing-day churn)', side: 'sell', 'start day': 0, length: 5, 'total notional': 9, bias: 0.65 },
  { label: 'friends & family allocation (5% of IPO shares, no lock-up) early flipping', side: 'sell', 'start day': 0, length: 10, 'total notional': 3, bias: 0.7 },
  { label: 'baseline profit-taking', side: 'sell', 'start day': 0, length: 130, 'total notional': 14, bias: 0.99 },
  { label: 'conditional 10% lock-up release (+30% for 5/10 days)', side: 'sell', 'start day': 14, length: 12, 'total notional': 4, bias: 0.8 },
  { label: 'lock-up tranche 1: 20% after first earnings (Q2)', side: 'sell', 'start day': 30, length: 10, 'total notional': 9, bias: 0.7 },
  { label: 'lock-up 7% @ 70 calendar days', side: 'sell', 'start day': 50, length: 4, 'total notional': 3, bias: 0.7 },
  { label: 'lock-up 7% @ 90 calendar days', side: 'sell', 'start day': 64, length: 4, 'total notional': 3, bias: 0.7 },
  { label: 'lock-up 7% @ 105 calendar days', side: 'sell', 'start day': 75, length: 4, 'total notional': 3, bias: 0.7 },
  { label: 'lock-up 7% @ 120 calendar days', side: 'sell', 'start day': 86, length: 4, 'total notional': 3, bias: 0.7 },
  { label: 'lock-up 7% @ 135 calendar days', side: 'sell', 'start day': 96, length: 4, 'total notional': 3, bias: 0.7 },
  { label: 'lock-up 28% after Q3 earnings (~late Oct)', side: 'sell', 'start day': 95, length: 12, 'total notional': 12, bias: 0.72 },
  // S-1/A (2 Jun 2026): the old "100% at 180 days" full release is removed — the final
  // release for extended-lock-up holders moves to Q2-2027 results and Musk's 366-day lock,
  // both beyond this model's 180-trading-day horizon. See spacex-ipo-model.l4.
]

export const DEFAULT_CONFIG: IpoConfig = {
  'offer price': 105.32,
  valuation: 1800,
  raise: 75,
  'float shares': 712,
  'total shares': 17090,
  'ipo pop coefficient': 3.0,
  'ipo pop cap': 0.45,
  'impact coefficient': 0.9,
  'max daily up': 0.18,
  'max daily down': 0.15,
  'base turnover fraction': 0.5,
  'turnover decay': 0.93,
  'flow windows': DEFAULT_FLOW_WINDOWS,
}

// Scalar knobs surfaced as sliders in the config panel.
export const SCALAR_KNOBS: { key: keyof IpoConfig; label: string; min: number; max: number; step: number; tip: string }[] = [
  { key: 'offer price', label: 'Offer price ($)', min: 20, max: 200, step: 1,
    tip: 'IPO offer price per share (post 5-for-1 split reference ≈ $105.32). The day-0 open = offer × (1 + IPO pop).' },
  { key: 'valuation', label: 'Valuation ($B)', min: 500, max: 3000, step: 10,
    tip: 'Fully-diluted market cap at the offer, in $B. With the offer price it implies total shares = valuation ÷ offer.' },
  { key: 'raise', label: 'Raise ($B)', min: 10, max: 150, step: 1,
    tip: 'Primary capital raised ($B) = free-float notional at the offer. It is the denominator for the IPO pop and sets float = raise ÷ offer.' },
  { key: 'float shares', label: 'Float shares (M)', min: 200, max: 3000, step: 10,
    tip: 'Publicly tradable shares (millions). Free-float value = price × float shares; a smaller float means a larger price move per $ of net flow.' },
  { key: 'ipo pop coefficient', label: 'IPO pop sensitivity', min: 0, max: 8, step: 0.1,
    tip: 'How strongly day-0 net demand lifts the open. pop = coefficient × (day-0 net $B) ÷ raise, then capped.' },
  { key: 'ipo pop cap', label: 'IPO pop cap', min: 0, max: 1, step: 0.01,
    tip: 'Maximum first-day pop, as a fraction. 0.45 = the open can be at most +45% above the offer.' },
  { key: 'impact coefficient', label: 'Price impact coef.', min: 0, max: 3, step: 0.05,
    tip: 'Price-impact strength. Each day’s return ≈ coefficient × (net flow $B) ÷ (free-float value $B), then clamped.' },
  { key: 'max daily up', label: 'Max daily up', min: 0.02, max: 0.5, step: 0.01,
    tip: 'Ceiling on a single day’s return (fraction). 0.18 = price can rise at most +18% in one day.' },
  { key: 'max daily down', label: 'Max daily down', min: 0.02, max: 0.5, step: 0.01,
    tip: 'Floor on a single day’s return (positive magnitude). 0.15 = price can fall at most −15% in one day.' },
  { key: 'base turnover fraction', label: 'Base turnover frac.', min: 0, max: 1.5, step: 0.05,
    tip: 'Day-0 baseline turnover as a fraction of float notional; it decays daily. Volume = baseline + buy + sell.' },
  { key: 'turnover decay', label: 'Turnover decay', min: 0.8, max: 0.999, step: 0.001,
    tip: 'Daily geometric decay of the baseline turnover. 0.93 = the baseline shrinks ~7% per trading day.' },
]
