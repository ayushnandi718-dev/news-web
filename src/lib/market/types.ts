export type MarketSymbol = "NIFTY50" | "SENSEX" | "BANKNIFTY" | "USDINR";

export type MarketQuote = {
  symbol: MarketSymbol;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  updatedAt: string;
  source: "yahoo" | "alpha-vantage";
};

export type MarketResponse = {
  quotes: MarketQuote[];
  updatedAt: string;
  marketStatus: "OPEN" | "CLOSED";
  stale: boolean;
  source: string;
};
