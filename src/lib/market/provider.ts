import type { MarketQuote } from "./types";

export interface MarketProvider {
  id: string;
  fetchQuotes(symbols: MarketSymbolSpec[]): Promise<MarketQuote[]>;
}

export interface MarketSymbolSpec {
  symbol: string;
  name: string;
  currency: string;
}

const YAHOO_BASE = process.env.MARKET_YAHOO_BASE_URL || "https://query1.finance.yahoo.com";

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsWeb/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        regularMarketTime?: number;
      };
    }>;
  };
}

export const yahooProvider: MarketProvider = {
  id: "yahoo",
  async fetchQuotes(symbols) {
    const results = await Promise.allSettled(
      symbols.map(async (spec): Promise<MarketQuote> => {
        const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(spec.symbol)}?interval=1d&range=2d`;
        const json = (await fetchJson(url)) as YahooChartResponse;
        const meta = json.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        const prev = meta?.chartPreviousClose ?? meta?.previousClose;
        if (typeof price !== "number" || typeof prev !== "number" || prev === 0) {
          throw new Error(`No price data for ${spec.symbol}`);
        }
        const change = price - prev;
        return {
          symbol: spec.symbol,
          name: spec.name,
          price,
          change,
          changePercent: (change / prev) * 100,
          currency: meta?.currency ?? spec.currency,
          updatedAt: new Date(meta?.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString(),
        };
      })
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  },
};

export const nullProvider: MarketProvider = {
  id: "none",
  async fetchQuotes() {
    return [];
  },
};

export function resolveProvider(): MarketProvider {
  const id = (process.env.MARKET_PROVIDER || "yahoo").toLowerCase();
  if (id === "none" || id === "off" || id === "disabled") return nullProvider;
  return yahooProvider;
}
