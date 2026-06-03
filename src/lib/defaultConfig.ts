import type { IpoConfig } from '../types'

// NB: the dashboard no longer hardcodes a default IPO config. The deployed L4 model
// (`the default SpaceX IPO config` export) is the single source of truth — the app
// fetches it on load via /api/default-config and seeds the config panel from that.
// Only the editor's UI metadata (slider ranges + help text) lives here.

// Scalar knobs surfaced as sliders in the config panel.
export const SCALAR_KNOBS: { key: keyof IpoConfig; label: string; min: number; max: number; step: number; tip: string }[] = [
  { key: 'offer price', label: 'Offer price ($)', min: 20, max: 200, step: 1,
    tip: 'IPO offer price per share (targeted ≈ $135; Reuters, 3 Jun 2026). The day-0 open = offer × (1 + IPO pop).' },
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
