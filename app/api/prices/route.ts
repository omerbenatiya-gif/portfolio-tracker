import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { fetchCryptoPrices, fetchStockPrices, fetchUsdToIls } from '@/lib/prices';

export async function GET() {
  try {
    const sql = getDb();
    await initSchema();
    const assets = await sql`SELECT ticker, type FROM assets`;

    type Row = { ticker: string; type: string };
    const cryptoTickers = (assets as Row[]).filter(a => a.type === 'crypto').map(a => a.ticker);
    const stockTickers = (assets as Row[]).filter(a => a.type !== 'crypto').map(a => a.ticker);

    const [cryptoPrices, stockPrices, usdToIls] = await Promise.all([
      fetchCryptoPrices(cryptoTickers),
      fetchStockPrices(stockTickers),
      fetchUsdToIls(),
    ]);

    return NextResponse.json({ prices: { ...cryptoPrices, ...stockPrices }, usdToIls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
