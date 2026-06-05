export interface PriceResult {
  ticker: string;
  priceUsd: number;
  changePercent24h: number;
}

export async function fetchCryptoPrices(tickers: string[]): Promise<Record<string, PriceResult>> {
  if (tickers.length === 0) return {};

  const coinIds = tickers.map(tickerToCoinId).filter(Boolean).join(',');
  if (!coinIds) return {};

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('CoinGecko error');
    const data = await res.json();

    const result: Record<string, PriceResult> = {};
    for (const ticker of tickers) {
      const id = tickerToCoinId(ticker);
      if (id && data[id]) {
        result[ticker.toUpperCase()] = {
          ticker: ticker.toUpperCase(),
          priceUsd: data[id].usd ?? 0,
          changePercent24h: data[id].usd_24h_change ?? 0,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function fetchStockPrices(tickers: string[]): Promise<Record<string, PriceResult>> {
  if (tickers.length === 0) return {};

  const result: Record<string, PriceResult> = {};

  try {
    const symbols = tickers.join(',');
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Yahoo error ${res.status}`);
    const data = await res.json();
    const quotes: Array<{
      symbol: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
      regularMarketPreviousClose?: number;
    }> = data?.quoteResponse?.result ?? [];

    for (const q of quotes) {
      const price = q.regularMarketPrice ?? 0;
      const change = q.regularMarketChangePercent ?? 0;
      result[q.symbol.toUpperCase()] = {
        ticker: q.symbol.toUpperCase(),
        priceUsd: price,
        changePercent24h: change,
      };
    }
  } catch {
    // fallback: mark all as 0
    for (const ticker of tickers) {
      result[ticker.toUpperCase()] = { ticker: ticker.toUpperCase(), priceUsd: 0, changePercent24h: 0 };
    }
  }

  return result;
}

export async function fetchUsdToIls(): Promise<number> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/ILS=X?interval=1d&range=2d',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return (rate && rate > 1) ? rate : 3.65;
  } catch {
    return 3.65;
  }
}

function tickerToCoinId(ticker: string): string {
  const map: Record<string, string> = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
    XRP: 'ripple', BNB: 'binancecoin', USDT: 'tether',
  };
  return map[ticker.toUpperCase()] ?? '';
}
