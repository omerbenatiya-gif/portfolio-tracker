import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

// One-time seed endpoint — protected by secret key
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'omer2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  await initSchema();

  // Clear existing data to avoid duplicates
  await sql`DELETE FROM deposits`;
  await sql`DELETE FROM assets`;

  // ── ASSETS ──────────────────────────────────────────────────────────────
  // Quantities are calculated from purchase history using historical prices.
  // "other" type = manual (no live price feed) — shows cost basis as value.
  const assets = [
    { name: 'ביטקוין',                     ticker: 'BTC',       type: 'crypto', quantity: 0.194,  avg_cost_usd: 68224 },
    { name: 'אית׳ריום',                     ticker: 'ETH',       type: 'crypto', quantity: 1.414,  avg_cost_usd: 1910  },
    { name: 'ריפל',                          ticker: 'XRP',       type: 'crypto', quantity: 823,    avg_cost_usd: 2.30  },
    { name: 'Amazon',                        ticker: 'AMZN',      type: 'stock',  quantity: 13.04,  avg_cost_usd: 210   },
    { name: 'Invesco QQQ Trust',             ticker: 'QQQ',       type: 'etf',    quantity: 6.45,   avg_cost_usd: 476   },
    { name: 'SPDR S&P 500 ETF',             ticker: 'SPY',       type: 'etf',    quantity: 10.44,  avg_cost_usd: 545   },
    { name: 'S&P קרן השתלמות',              ticker: 'HISHTALM',  type: 'other',  quantity: 1,      avg_cost_usd: 22045 },
    { name: 'פניסה - גמל השקעה (כלל)',      ticker: 'PENSION',   type: 'other',  quantity: 1,      avg_cost_usd: 3108  },
    { name: 'מיטב קופת גמל',                ticker: 'MITAV',     type: 'other',  quantity: 1,      avg_cost_usd: 5405  },
  ];

  for (const a of assets) {
    await sql`
      INSERT INTO assets (name, ticker, type, quantity, avg_cost_usd)
      VALUES (${a.name}, ${a.ticker}, ${a.type}, ${a.quantity}, ${a.avg_cost_usd})
    `;
  }

  // ── DEPOSITS (purchase history) ──────────────────────────────────────────
  const deposits = [
    { date: '2023-05-05',  amount_ils: 12000,    note: 'S&P קרן השתלמות' },
    { date: '2023-10-15',  amount_ils: 5000,     note: 'BTC' },
    { date: '2023-10-15',  amount_ils: 5000,     note: 'ETH' },
    { date: '2023-11-10',  amount_ils: 8000,     note: 'S&P קרן השתלמות' },
    { date: '2024-01-12',  amount_ils: 20500,    note: 'S&P קרן השתלמות' },
    { date: '2024-07-30',  amount_ils: 6107,     note: 'SPDR S&P 500 ETF' },
    { date: '2024-07-30',  amount_ils: 6936,     note: 'Invesco QQQ' },
    { date: '2024-08-02',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2024-08-05',  amount_ils: 4068,     note: 'SPDR S&P 500 ETF' },
    { date: '2024-08-19',  amount_ils: 5000,     note: 'BTC' },
    { date: '2024-08-19',  amount_ils: 5000,     note: 'ETH' },
    { date: '2024-09-10',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2024-10-06',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2024-10-18',  amount_ils: 4000,     note: 'BTC' },
    { date: '2024-11-04',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2024-12-05',  amount_ils: 9961,     note: 'SPDR S&P 500 ETF' },
    { date: '2024-12-05',  amount_ils: 9424,     note: 'Invesco QQQ' },
    { date: '2024-12-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2024-12-18',  amount_ils: 8843,     note: 'AMZN' },
    { date: '2025-01-02',  amount_ils: 20500,    note: 'S&P קרן השתלמות' },
    { date: '2025-01-02',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-02-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-03-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-03-20',  amount_ils: 6300,     note: 'SPDR S&P 500 ETF' },
    { date: '2025-03-20',  amount_ils: 3700,     note: 'AMZN' },
    { date: '2025-03-20',  amount_ils: 15000,    note: 'BTC' },
    { date: '2025-03-20',  amount_ils: 7000,     note: 'XRP' },
    { date: '2025-04-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-04-03',  amount_ils: 10000,    note: 'BTC' },
    { date: '2025-04-08',  amount_ils: 5700,     note: 'SPDR S&P 500 ETF' },
    { date: '2025-04-08',  amount_ils: 3190,     note: 'Invesco QQQ' },
    { date: '2025-04-15',  amount_ils: 6000,     note: 'מיטב קופת גמל' },
    { date: '2025-05-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-06-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-07-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-08-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-09-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-10-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-10-15',  amount_ils: 7000,     note: 'מיטב קופת גמל' },
    { date: '2025-11-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-11-03',  amount_ils: -2382,    note: 'מכירה: AMZN' },
    { date: '2025-11-03',  amount_ils: -8183,    note: 'מכירה: Invesco QQQ' },
    { date: '2025-11-03',  amount_ils: -11090,   note: 'מכירה: SPDR S&P 500 ETF' },
    { date: '2025-11-16',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2025-12-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2025-12-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2026-01-05',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2026-01-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2026-02-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2026-02-06',  amount_ils: 10000,    note: 'BTC' },
    { date: '2026-02-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2026-03-02',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2026-03-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2026-03-17',  amount_ils: 20565,    note: 'S&P קרן השתלמות' },
    { date: '2026-04-05',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2026-04-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
    { date: '2026-05-03',  amount_ils: 500,      note: 'פניסה - גמל השקעה' },
    { date: '2026-05-15',  amount_ils: 1000,     note: 'מיטב קופת גמל' },
  ];

  for (const d of deposits) {
    await sql`
      INSERT INTO deposits (date, amount_ils, note)
      VALUES (${d.date}, ${d.amount_ils}, ${d.note})
    `;
  }

  return NextResponse.json({
    success: true,
    assets: assets.length,
    deposits: deposits.length,
    note: 'כמויות הנכסים הן הערכה על בסיס מחירים היסטוריים — ניתן לעדכן בדף הנכסים',
  });
}
