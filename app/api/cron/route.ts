import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { fetchCryptoPrices, fetchStockPrices, fetchUsdToIls } from '@/lib/prices';

// Called by Vercel Cron every 15 minutes — saves a portfolio snapshot
export async function GET() {
  try {
    const sql = getDb();
    await initSchema();
    const assets = await sql`SELECT ticker, type, quantity, avg_cost_usd, cost_ils FROM assets`;

    type Row = { ticker: string; type: string; quantity: number; avg_cost_usd: number; cost_ils: number | null };
    const cryptoTickers = (assets as Row[]).filter(a => a.type === 'crypto').map(a => a.ticker);
    const stockTickers = (assets as Row[]).filter(a => a.type === 'stock' || a.type === 'etf').map(a => a.ticker);

    const [cryptoPrices, stockPrices, usdToIls] = await Promise.all([
      fetchCryptoPrices(cryptoTickers),
      fetchStockPrices(stockTickers),
      fetchUsdToIls(),
    ]);

    const allPrices = { ...cryptoPrices, ...stockPrices };
    let totalIls = 0;

    for (const asset of assets as Row[]) {
      if (asset.type === 'other') {
        totalIls += asset.avg_cost_usd * asset.quantity;
      } else {
        const price = allPrices[asset.ticker.toUpperCase()]?.priceUsd ?? 0;
        totalIls += price * asset.quantity * usdToIls;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    await sql`
      INSERT INTO portfolio_snapshots (date, total_value_usd, total_value_ils)
      VALUES (${today}, ${totalIls / usdToIls}, ${totalIls})
      ON CONFLICT (date) DO UPDATE
        SET total_value_usd = EXCLUDED.total_value_usd,
            total_value_ils = EXCLUDED.total_value_ils
    `;

    return NextResponse.json({ ok: true, date: today, total_ils: Math.round(totalIls), usdToIls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
