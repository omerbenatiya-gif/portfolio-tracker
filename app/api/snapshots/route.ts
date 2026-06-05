import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { fetchCryptoPrices, fetchStockPrices, fetchUsdToIls } from '@/lib/prices';

export async function GET() {
  const sql = getDb();
  await initSchema();
  // Exclude snapshots that are clearly wrong (< 100k when portfolio is likely > 100k)
  // These were saved before manual assets were included in the calculation
  const rows = await sql`
    SELECT * FROM portfolio_snapshots
    WHERE total_value_ils >= 100000
    ORDER BY date ASC
  `;
  return NextResponse.json(rows);
}

export async function DELETE() {
  // One-time fix: remove snapshots saved before manual assets were included
  const sql = getDb();
  await initSchema();
  const deleted = await sql`
    DELETE FROM portfolio_snapshots WHERE total_value_ils < 100000 RETURNING date
  `;
  return NextResponse.json({ deleted: (deleted as { date: string }[]).map(r => r.date) });
}

export async function POST() {
  try {
    const sql = getDb();
    await initSchema();
    const assets = await sql`SELECT ticker, type, quantity, avg_cost_usd FROM assets`;

    type Row = { ticker: string; type: string; quantity: number; avg_cost_usd: number };
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
        // Manual assets (e.g. pension fund): avg_cost_usd stores current ILS value
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

    return NextResponse.json({ date: today, total_value_usd: totalIls / usdToIls, total_value_ils: totalIls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
