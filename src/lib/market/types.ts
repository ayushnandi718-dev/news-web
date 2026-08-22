export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  updatedAt: string;
}

export interface MarketSnapshot {
  items: MarketQuote[];
  updatedAt: string;
  delayed: boolean;
  stale: boolean;
  error: string | null;
}
