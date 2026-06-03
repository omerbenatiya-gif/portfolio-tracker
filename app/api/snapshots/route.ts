import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { fetchCryptoPrices, fetchStockPrices, fetchUsdToIls } from '@/lib/prices';

export async function GET() {
  const sql = getDb();
  await initSchema();
  const rows = await sql`SELECT * FROM portfolio_snapshots ORDER BY date ASC`;
  return NextResponse.json(rows);
}

export async function POST() {
  try {
    const sql = getDb();
    await initSchema();
    const assets = await sql`SELECT ticker, type, quantity FROM assets`;

    type Row = { ticker: string; type: string; quantity: number };
    const cryptoTickers = (assets as Row[]).filter(a => a.type === 'crypto').map(a => a.ticker);
    const stockTickers = (assets as Row[]).filter(a => a.type !== 'crypto').map(a => a.ticker);

    const [cryptoPrices, stockPrices, usdToIls] = await Promise.all([
      fetchCryptoPrices(cryptoTickers),
      fetchStockPrices(stockTickers),
      fetchUsdToIls(),
    ]);

    const allPrices = { ...cryptoPrices, ...stockPrices };
    let totalUsd = 0;
    for (const asset of assets as Row[]) {
      const price = allPrices[asset.ticker.toUpperCase()]?.priceUsd ?? 0;
      totalUsd += price * asset.quantity;
    }

    const today = new Date().toISOString().split('T')[0];
    await sql`
      INSERT INTO portfolio_snapshots (date, total_value_usd, total_value_ils)
      VALUES (${today}, ${totalUsd}, ${totalUsd * usdToIls})
      ON CONFLICT (date) DO UPDATE
        SET total_value_usd = EXCLUDED.total_value_usd,
            total_value_ils = EXCLUDED.total_value_ils
    `;

    return NextResponse.json({ date: today, total_value_usd: totalUsd, total_value_ils: totalUsd * usdToIls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
