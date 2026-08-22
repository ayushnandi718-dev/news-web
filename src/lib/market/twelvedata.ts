import type { MarketQuote, MarketSymbol } from "./types";

const API_KEY = process.env.TWELVEDATA_API_KEY;

const globalForTd = globalThis as unknown as {
  tdBudget?: { date: string; used: number };
};

function spendCredit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const budget = (globalForTd.tdBudget ??= { date: today, used: 0 });
  if (budget.date !== today) {
    budget.date = today;
    budget.used = 0;
  }
  const max = parseInt(process.env.TWELVEDATA_MAX_REQUESTS_PER_DAY ?? "400", 10) || 400;
  if (budget.used >= max) return false;
  budget.used += 1;
  return true;
}

interface TdQuoteResponse {
  symbol?: string;
  name?: string;
  exchange?: string;
  datetime?: string;
  timestamp?: number;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
}

/**
 * Twelve Data fallback — opt-in via TWELVEDATA_API_KEY.
 * Free key covers USD/INR forex (verified); Indian equities/indices are not
 * available on the free plan, so only FX symbols resolve here.
 */
export async function getTwelveDataQuotes(symbols: MarketSymbol[]): Promise<MarketQuote[]> {
  if (!API_KEY) return [];

  const quotes: MarketQuote[] = [];
  for (const symbol of symbols) {
    if (symbol !== "USDINR") continue;
    if (!spendCredit()) break;
    try {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent("USD/INR")}&apikey=${encodeURIComponent(API_KEY)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!res.ok) continue;
      const json = (await res.json()) as TdQuoteResponse & { status?: string; message?: string };
      if (json.status === "error") continue;
      const price = Number(json.close);
      if (!Number.isFinite(price)) continue;
      const change = Number(json.change);
      const percentChange = Number(json.percent_change);
      quotes.push({
        symbol,
        name: "USD / INR",
        price,
        change: Number.isFinite(change) ? change : 0,
        changePercent: Number.isFinite(percentChange) ? percentChange : 0,
        currency: "INR",
        updatedAt:
          typeof json.timestamp === "number"
            ? new Date(json.timestamp * 1000).toISOString()
            : new Date().toISOString(),
        source: "twelvedata",
      });
    } catch {
      continue;
    }
  }
  return quotes;
}
