import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { fetchCryptoPrices, fetchStockPrices, fetchUsdToIls } from '@/lib/prices';

export async function GET() {
  const sql = getDb();
  await initSchema();

  const assets = await sql`SELECT * FROM assets`;
  const deposits = await sql`SELECT amount_ils FROM deposits`;
  const snapshots = await sql`SELECT * FROM portfolio_snapshots ORDER BY date DESC LIMIT 1`;

  type Asset = { id: number; name: string; ticker: string; type: string; quantity: number; avg_cost_usd: number; cost_ils: number | null };

  const cryptoTickers = (assets as Asset[]).filter(a => a.type === 'crypto').map(a => a.ticker);
  const stockTickers = (assets as Asset[]).filter(a => a.type === 'stock' || a.type === 'etf').map(a => a.ticker);

  const [cryptoPrices, stockPrices, usdToIls] = await Promise.all([
    fetchCryptoPrices(cryptoTickers),
    fetchStockPrices(stockTickers),
    fetchUsdToIls(),
  ]);

  const allPrices = { ...cryptoPrices, ...stockPrices };

  let portfolioIls = 0;
  let costIlsTotal = 0;
  const assetDetails: Record<string, { value_ils: number; cost_ils: number; pnl_ils: number; pnl_pct: number }> = {};

  for (const a of assets as Asset[]) {
    let valueIls = 0;
    if (a.type === 'other') {
      valueIls = a.avg_cost_usd * a.quantity;
    } else {
      const price = allPrices[a.ticker.toUpperCase()]?.priceUsd ?? 0;
      valueIls = price * a.quantity * usdToIls;
    }

    const costIls = a.cost_ils ?? (a.type === 'other' ? a.avg_cost_usd * a.quantity : a.avg_cost_usd * a.quantity * usdToIls);
    const pnl = valueIls - costIls;

    portfolioIls += valueIls;
    costIlsTotal += costIls;
    assetDetails[`${a.ticker} (${a.name})`] = {
      value_ils: Math.round(valueIls),
      cost_ils: Math.round(costIls),
      pnl_ils: Math.round(pnl),
      pnl_pct: costIls > 0 ? +((pnl / costIls) * 100).toFixed(2) : 0,
    };
  }

  const depositsNet = (deposits as { amount_ils: number | null }[])
    .reduce((s, d) => s + (d.amount_ils ?? 0), 0);

  const pnlIls = portfolioIls - costIlsTotal;
  const pnlPct = costIlsTotal > 0 ? (pnlIls / costIlsTotal) * 100 : 0;

  const issues: string[] = [];

  // 1. Deposits vs cost basis
  if (Math.abs(depositsNet - costIlsTotal) > 500) {
    issues.push(`פקדונות נטו (₪${Math.round(depositsNet).toLocaleString()}) לא תואם עלות נכסים (₪${Math.round(costIlsTotal).toLocaleString()}) — פרש: ₪${Math.round(Math.abs(depositsNet - costIlsTotal)).toLocaleString()}`);
  }

  // 2. Zero-price assets (price API may have failed)
  for (const a of assets as Asset[]) {
    if (a.type !== 'other') {
      const price = allPrices[a.ticker.toUpperCase()]?.priceUsd;
      if (!price || price === 0) {
        issues.push(`מחיר אפס עבור ${a.ticker} — ייתכן כשל ב-API`);
      }
    }
  }

  // 3. Manual assets (other) without cost_ils cannot track returns
  for (const a of assets as Asset[]) {
    if (a.type === 'other' && a.cost_ils == null) {
      issues.push(`נכס ידני "${a.name}" חסר עלות מקורית (cost_ils) — לא ניתן לחשב תשואה`);
    }
  }

  // 4. Portfolio value sanity (should be > 0 if assets exist)
  if ((assets as Asset[]).length > 0 && portfolioIls === 0) {
    issues.push('שווי תיק = 0 למרות שיש נכסים — ייתכן כשל כללי ב-API מחירים');
  }

  // 5. Snapshot freshness — last snapshot should be from today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  type Snapshot = { date: string; total_value_ils: number };
  const lastSnap = (snapshots as Snapshot[])[0];
  if (!lastSnap) {
    issues.push('אין snapshot בכלל — הבוט לא שמר נתונים היום');
  } else if (lastSnap.date !== today && lastSnap.date !== yesterday) {
    issues.push(`snapshot אחרון מ-${lastSnap.date} (לא היום/אתמול) — ייתכן שהבוט לא פעל`);
  }

  // 6. Sanity: portfolio value vs snapshot value (shouldn't differ too much unless market moved a lot)
  if (lastSnap && Math.abs(lastSnap.total_value_ils - portfolioIls) / portfolioIls > 0.3) {
    issues.push(`שווי נוכחי (₪${Math.round(portfolioIls).toLocaleString()}) שונה ב-30%+ מה-snapshot האחרון (₪${Math.round(lastSnap.total_value_ils).toLocaleString()}) — בדוק שהנתונים סבירים`);
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    portfolio_value_ils: Math.round(portfolioIls),
    cost_basis_ils: Math.round(costIlsTotal),
    deposits_net_ils: Math.round(depositsNet),
    pnl_ils: Math.round(pnlIls),
    pnl_pct: +pnlPct.toFixed(2),
    usd_to_ils: usdToIls,
    assets: assetDetails,
    last_snapshot: lastSnap ?? null,
    in_sync: issues.length === 0,
    issues,
  });
}
