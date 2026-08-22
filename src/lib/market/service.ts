import { cacheWrap } from "../cache";
import { resolveProvider, type MarketSymbolSpec } from "./provider";
import type { MarketQuote, MarketSnapshot } from "./types";

const globalForMarket = globalThis as unknown as {
  marketLastGood?: MarketSnapshot;
};

export const DEFAULT_SYMBOLS: MarketSymbolSpec[] = [
  { symbol: "^NSEI", name: "NIFTY 50", currency: "INR" },
  { symbol: "^BSESN", name: "SENSEX", currency: "INR" },
  { symbol: "^NSEBANK", name: "BANK NIFTY", currency: "INR" },
  { symbol: "USDINR=X", name: "USD / INR", currency: "INR" },
];

function configuredSymbols(): MarketSymbolSpec[] {
  const raw = process.env.MARKET_SYMBOLS;
  if (!raw) return DEFAULT_SYMBOLS;
  const specs = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [symbol, name, currency] = entry.split("|").map((s) => s.trim());
      if (!symbol) return null;
      return { symbol, name: name || symbol, currency: currency || "INR" } as MarketSymbolSpec;
    })
    .filter((s): s is MarketSymbolSpec => !!s);
  return specs.length ? specs : DEFAULT_SYMBOLS;
}

/**
 * Normalized market snapshot for the reader homepage.
 * - Fresh data is cached for MARKET_TTL_SECONDS (default 120s).
 * - On provider failure the last good snapshot is returned with stale=true.
 * - Never throws; UI renders honest error/stale states.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const ttl = Math.max(30, parseInt(process.env.MARKET_TTL_SECONDS ?? "120", 10) || 120);
  const key = `market:v1:${Math.floor(Date.now() / (ttl * 1000))}`;

  try {
    return await cacheWrap(key, ttl, ["market"], async () => {
      const provider = resolveProvider();
      let quotes: MarketQuote[] = [];
      let error: string | null = null;
      try {
        quotes = await provider.fetchQuotes(configuredSymbols());
        if (!quotes.length) error = "No market data available.";
      } catch {
        error = "Unable to refresh market data.";
      }

      const nowIso = new Date().toISOString();
      if (quotes.length > 0) {
        const snapshot: MarketSnapshot = {
          items: quotes,
          updatedAt: nowIso,
          delayed: true,
          stale: false,
          error: null,
        };
        globalForMarket.marketLastGood = snapshot;
        return snapshot;
      }

      const lastGood = globalForMarket.marketLastGood;
      if (lastGood) {
        return { ...lastGood, stale: true, error };
      }
      return { items: [], updatedAt: nowIso, delayed: true, stale: true, error: error ?? "Market data unavailable." };
    });
  } catch {
    const lastGood = globalForMarket.marketLastGood;
    const nowIso = new Date().toISOString();
    if (lastGood) return { ...lastGood, stale: true, error: "Unable to refresh market data." };
    return { items: [], updatedAt: nowIso, delayed: true, stale: true, error: "Market data unavailable." };
  }
}
