import type { MarketQuote, MarketSymbol } from "./types";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Alpha Vantage is intentionally opt-in. Its free tier cannot replace the
// Indian index feed, so Yahoo remains the primary source for NIFTY/SENSEX/BANK NIFTY.
export async function getAlphaVantageQuotes(symbols: MarketSymbol[]): Promise<MarketQuote[]> {
  if (!API_KEY) return [];

  const quotes: MarketQuote[] = [];
  for (const symbol of symbols) {
    if (symbol === "USDINR") {
      try {
        const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=INR&apikey=${encodeURIComponent(API_KEY)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        const json = await response.json();
        const data = json?.["Realtime Currency Exchange Rate"];
        const price = Number(data?.["5. Exchange Rate"]);
        if (!Number.isFinite(price)) continue;
        quotes.push({
          symbol,
          name: "USD / INR",
          price,
          change: 0,
          changePercent: 0,
          currency: "INR",
          updatedAt: new Date().toISOString(),
          source: "alpha-vantage",
        });
      } catch {
        continue;
      }
    }
  }
  return quotes;
}
