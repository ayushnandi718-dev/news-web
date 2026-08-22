import type { MarketQuote, MarketSymbol } from "./types";

const SYMBOLS: Record<MarketSymbol, { yahoo: string; name: string }> = {
  NIFTY50: { yahoo: "^NSEI", name: "NIFTY 50" },
  SENSEX: { yahoo: "^BSESN", name: "SENSEX" },
  BANKNIFTY: { yahoo: "^NSEBANK", name: "BANK NIFTY" },
  USDINR: { yahoo: "USDINR=X", name: "USD / INR" },
};

async function fetchYahoo(symbol: MarketSymbol): Promise<MarketQuote | null> {
  const config = SYMBOLS[symbol];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.yahoo)}?range=1d&interval=1m`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 120 },
  });
  if (!response.ok) throw new Error(`Yahoo returned ${response.status} for ${config.yahoo}`);

  const json = await response.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const price = Number(meta.regularMarketPrice ?? meta.previousClose);
  const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose);
  if (!Number.isFinite(price) || !Number.isFinite(previousClose) || previousClose === 0) return null;

  const change = price - previousClose;
  return {
    symbol,
    name: config.name,
    price,
    change,
    changePercent: (change / previousClose) * 100,
    currency: symbol === "USDINR" ? "INR" : "INR",
    updatedAt: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
    source: "yahoo",
  };
}

export async function getYahooQuotes(symbols: MarketSymbol[]): Promise<MarketQuote[]> {
  const results = await Promise.allSettled(symbols.map(fetchYahoo));
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}
