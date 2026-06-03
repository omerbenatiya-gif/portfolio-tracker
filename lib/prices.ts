// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require('yahoo-finance2').default as {
  quote: (ticker: string) => Promise<{ regularMarketPrice?: number; regularMarketChangePercent?: number }>;
};

export interface PriceResult {
  ticker: string;
  priceUsd: number;
  changePercent24h: number;
}

export interface ExchangeRates {
  usdToIls: number;
}

export async function fetchCryptoPrices(tickers: string[]): Promise<Record<string, PriceResult>> {
  if (tickers.length === 0) return {};

  const coinIds = tickers.map(t => tickerToCoinId(t)).filter(Boolean);
  const idsParam = coinIds.join(',');

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) throw new Error('CoinGecko fetch failed');

  const data = await res.json();
  const result: Record<string, PriceResult> = {};

  for (const ticker of tickers) {
    const coinId = tickerToCoinId(ticker);
    if (coinId && data[coinId]) {
      result[ticker.toUpperCase()] = {
        ticker: ticker.toUpperCase(),
        priceUsd: data[coinId].usd,
        changePercent24h: data[coinId].usd_24h_change ?? 0,
      };
    }
  }

  return result;
}

export async function fetchStockPrices(tickers: string[]): Promise<Record<string, PriceResult>> {
  if (tickers.length === 0) return {};

  const result: Record<string, PriceResult> = {};

  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quote(ticker);
        result[ticker.toUpperCase()] = {
          ticker: ticker.toUpperCase(),
          priceUsd: quote.regularMarketPrice ?? 0,
          changePercent24h: quote.regularMarketChangePercent ?? 0,
        };
      } catch {
        result[ticker.toUpperCase()] = { ticker: ticker.toUpperCase(), priceUsd: 0, changePercent24h: 0 };
      }
    })
  );

  return result;
}

export async function fetchUsdToIls(): Promise<number> {
  try {
    const quote = await yahooFinance.quote('ILS=X');
    return quote.regularMarketPrice ?? 3.7;
  } catch {
    return 3.7;
  }
}

function tickerToCoinId(ticker: string): string {
  const map: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    USDT: 'tether',
    BNB: 'binancecoin',
    XRP: 'ripple',
  };
  return map[ticker.toUpperCase()] ?? ticker.toLowerCase();
}
