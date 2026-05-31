export interface DailyMarket {
  tradingDay: number
  calendarDayOffset: number
  price: number
  buyPressure: number
  sellPressure: number
  netPressure: number
  volumeNotional: number
  volumeShares: number
}

export interface FlowWindow {
  label: string
  side: 'buy' | 'sell'
  'start day': number
  length: number
  'total notional': number
  bias: number
}

export interface IpoConfig {
  'offer price': number
  valuation: number
  raise: number
  'float shares': number
  'total shares': number
  'ipo pop coefficient': number
  'ipo pop cap': number
  'impact coefficient': number
  'max daily up': number
  'max daily down': number
  'base turnover fraction': number
  'turnover decay': number
  'flow windows': FlowWindow[]
}

export interface Meta {
  mode: 'remote' | 'local'
  base: string
  deployment: string
  hasKey: boolean
  configEditable: boolean
  functions: { series: string; config: string }
}

export interface SeriesResponse {
  days: number
  mode: 'remote' | 'local'
  source: string
  fn?: string
  url?: string
  points: DailyMarket[]
}
