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

  await Promise.all(tickers.map(async (ticker) => {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Yahoo error ${res.status}`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price: number = meta?.regularMarketPrice ?? meta?.chartPreviousClose ?? 0;
      const prevClose: number = meta?.chartPreviousClose ?? price;
      const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      result[ticker.toUpperCase()] = { ticker: ticker.toUpperCase(), priceUsd: price, changePercent24h: change };
    } catch {
      result[ticker.toUpperCase()] = { ticker: ticker.toUpperCase(), priceUsd: 0, changePercent24h: 0 };
    }
  }));

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
