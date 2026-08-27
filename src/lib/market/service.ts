import { getAlphaVantageQuotes } from "./alpha-vantage";
import { getTwelveDataQuotes } from "./twelvedata";
import { getYahooQuotes } from "./yahoo";
import type { MarketQuote, MarketResponse, MarketSymbol } from "./types";
import { logApiAlert, updateApiHealth } from "../monitoring";

const SYMBOLS: MarketSymbol[] = ["NIFTY50", "SENSEX", "BANKNIFTY", "USDINR"];
const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { value: MarketResponse; expiresAt: number } | null = null;
let inFlight: Promise<MarketResponse> | null = null;

function isIndianMarketOpen(date = new Date()) {
  // IST = UTC + 5:30 = +330 minutes. Compute IST directly from UTC fields.
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const istMinutes = utcMinutes + 330;

  // Determine IST day-of-week (if past midnight IST, it's the next day in IST)
  let istDay = date.getUTCDay();
  if (istMinutes >= 1440) istDay = (istDay + 1) % 7;
  if (istDay === 0 || istDay === 6) return false;

  const istTime = istMinutes >= 1440 ? istMinutes - 1440 : istMinutes;
  // NSE/BSE regular session: 9:15 AM – 3:30 PM IST
  return istTime >= 555 && istTime <= 930;
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
  // Try Yahoo Finance first
  let yahoo: MarketQuote[] = [];
  try {
    yahoo = await getYahooQuotes(SYMBOLS);
    updateApiHealth("yahoo-finance", yahoo.length > 0);
  } catch (error) {
    updateApiHealth("yahoo-finance", false);
    logApiAlert("yahoo-finance", "error", "Failed to fetch market data", { error: String(error) });
  }

  const missingAfterYahoo = SYMBOLS.filter((symbol) => !yahoo.some((q) => q.symbol === symbol));
  
  // Try Alpha Vantage for missing symbols
  let alpha: MarketQuote[] = [];
  if (missingAfterYahoo.length > 0) {
    try {
      alpha = await getAlphaVantageQuotes(missingAfterYahoo);
      updateApiHealth("alpha-vantage", alpha.length > 0);
    } catch (error) {
      updateApiHealth("alpha-vantage", false);
      logApiAlert("alpha-vantage", "error", "Failed to fetch fallback market data", { error: String(error) });
    }
  }

  const missingAfterAlpha = missingAfterYahoo.filter(
    (symbol) => !alpha.some((q) => q.symbol === symbol)
  );
  
  // Try Twelve Data for remaining missing symbols
  let twelve: MarketQuote[] = [];
  if (missingAfterAlpha.length > 0) {
    try {
      twelve = await getTwelveDataQuotes(missingAfterAlpha);
      updateApiHealth("twelve-data", twelve.length > 0);
    } catch (error) {
      updateApiHealth("twelve-data", false);
      logApiAlert("twelve-data", "error", "Failed to fetch tertiary market data", { error: String(error) });
    }
  }

  const quotes = mergeQuotes(mergeQuotes(yahoo, alpha), twelve);
  if (!quotes.length) {
    logApiAlert("market-data", "critical", "No market data provider returned usable quotes");
    throw new Error("No market data provider returned usable quotes");
  }

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
