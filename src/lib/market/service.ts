import { getAlphaVantageQuotes } from "./alpha-vantage";
import { getTwelveDataQuotes } from "./twelvedata";
import { getYahooQuotes } from "./yahoo";
import type { MarketQuote, MarketResponse, MarketSymbol } from "./types";

const SYMBOLS: MarketSymbol[] = ["NIFTY50", "SENSEX", "BANKNIFTY", "USDINR"];
const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { value: MarketResponse; expiresAt: number } | null = null;
let inFlight: Promise<MarketResponse> | null = null;

function isIndianMarketOpen(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(date);
  if (weekday === "Sat" || weekday === "Sun") return false;
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const total = hour * 60 + minute;
  return total >= 555 && total <= 930;
}

function mergeQuotes(primary: MarketQuote[], fallback: MarketQuote[]) {
  const bySymbol = new Map(fallback.map((quote) => [quote.symbol, quote]));
  for (const quote of primary) bySymbol.set(quote.symbol, quote);
  return SYMBOLS.flatMap((symbol) => {
    const quote = bySymbol.get(symbol);
    return quote ? [quote] : [];
  });
}

const PROVIDER_LABELS: Record<MarketQuote["source"], string> = {
  yahoo: "Yahoo Finance",
  "alpha-vantage": "Alpha Vantage",
  twelvedata: "Twelve Data",
};

function sourceLabel(quotes: MarketQuote[]): string {
  const sources = [...new Set(quotes.map((q) => q.source))];
  return sources.map((s) => PROVIDER_LABELS[s]).join(" + ") || "None";
}

async function load(): Promise<MarketResponse> {
  const yahoo = await getYahooQuotes(SYMBOLS);
  const missingAfterYahoo = SYMBOLS.filter((symbol) => !yahoo.some((q) => q.symbol === symbol));
  const alpha = await getAlphaVantageQuotes(missingAfterYahoo);
  const missingAfterAlpha = missingAfterYahoo.filter(
    (symbol) => !alpha.some((q) => q.symbol === symbol)
  );
  const twelve = await getTwelveDataQuotes(missingAfterAlpha);

  const quotes = mergeQuotes(mergeQuotes(yahoo, alpha), twelve);
  if (!quotes.length) throw new Error("No market data provider returned usable quotes");

  return {
    quotes,
    updatedAt: new Date().toISOString(),
    marketStatus: isIndianMarketOpen() ? "OPEN" : "CLOSED",
    stale: false,
    source: sourceLabel(quotes),
  };
}

export async function getMarketQuotes(): Promise<MarketResponse> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  if (inFlight) return inFlight;

  inFlight = load()
    .then((value) => {
      cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .catch((error) => {
      if (cache) return { ...cache.value, stale: true };
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
