import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'omer2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  await initSchema();

  await sql`DELETE FROM portfolio_snapshots`;
  await sql`DELETE FROM deposits`;
  await sql`DELETE FROM assets`;

  // Fixed rate used to store ILS amounts as USD (display will reconvert back)
  const R = 3.65;

  // ── ASSETS (total ILS invested per asset from spreadsheet summary) ────────
  const assets = [
    { name: 'ביטקוין',                   ticker: 'BTC',      type: 'other', qty: 1, ils: 49000    },
    { name: 'אית׳ריום',                   ticker: 'ETH',      type: 'other', qty: 1, ils: 10000    },
    { name: 'ריפל',                        ticker: 'XRP',      type: 'other', qty: 1, ils: 7000     },
    { name: 'Amazon',                      ticker: 'AMZN',     type: 'other', qty: 1, ils: 10161.44 },
    { name: 'Invesco QQQ Trust',           ticker: 'QQQ',      type: 'other', qty: 1, ils: 11367.21 },
    { name: 'SPDR S&P 500 ETF',           ticker: 'SPY',      type: 'other', qty: 1, ils: 21045.66 },
    { name: 'S&P קרן השתלמות',            ticker: 'HISHTALM', type: 'other', qty: 1, ils: 81565    },
  ];

  for (const a of assets) {
    await sql`
      INSERT INTO assets (name, ticker, type, quantity, avg_cost_usd)
      VALUES (${a.name}, ${a.ticker}, ${a.type}, ${a.qty}, ${+(a.ils / R).toFixed(2)})
    `;
  }

  // ── DEPOSITS (all transactions from spreadsheet, chronological) ──────────
  const deposits = [
    { date: '2023-05-05', ils:  12000,      note: 'S&P קרן השתלמות'          },
    { date: '2023-10-15', ils:   5000,      note: 'BTC'                        },
    { date: '2023-10-15', ils:   5000,      note: 'ETH'                        },
    { date: '2023-11-10', ils:   8000,      note: 'S&P קרן השתלמות'          },
    { date: '2024-01-12', ils:  20500,      note: 'S&P קרן השתלמות'          },
    { date: '2024-07-30', ils:   6107,      note: 'SPDR S&P 500 ETF'          },
    { date: '2024-07-30', ils:   6936,      note: 'Invesco QQQ'                },
    { date: '2024-08-02', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2024-08-05', ils:   4068,      note: 'SPDR S&P 500 ETF'          },
    { date: '2024-08-19', ils:   5000,      note: 'BTC'                        },
    { date: '2024-08-19', ils:   5000,      note: 'ETH'                        },
    { date: '2024-09-10', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2024-10-06', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2024-10-18', ils:   4000,      note: 'BTC'                        },
    { date: '2024-11-04', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2024-12-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2024-12-05', ils:   9961,      note: 'SPDR S&P 500 ETF'          },
    { date: '2024-12-05', ils:   9424,      note: 'Invesco QQQ'                },
    { date: '2024-12-18', ils:   8843,      note: 'AMZN'                       },
    { date: '2025-01-02', ils:  20500,      note: 'S&P קרן השתלמות'          },
    { date: '2025-01-02', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-02-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-03-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-03-20', ils:   3700,      note: 'AMZN'                       },
    { date: '2025-03-20', ils:   6300,      note: 'SPDR S&P 500 ETF'          },
    { date: '2025-03-20', ils:  15000,      note: 'BTC'                        },
    { date: '2025-03-20', ils:   7000,      note: 'XRP'                        },
    { date: '2025-04-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-04-03', ils:  10000,      note: 'BTC'                        },
    { date: '2025-04-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-04-08', ils:   5700,      note: 'SPDR S&P 500 ETF'          },
    { date: '2025-04-08', ils:   3190,      note: 'Invesco QQQ'                },
    { date: '2025-04-15', ils:   6000,      note: 'מיטב קופת גמל'             },
    { date: '2025-05-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-06-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-07-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-08-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-09-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-10-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-10-15', ils:   7000,      note: 'מיטב קופת גמל'             },
    { date: '2025-11-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-11-03', ils:  -2381.56,  note: 'מכירה: AMZN'               },
    { date: '2025-11-03', ils:  -8182.79,  note: 'מכירה: Invesco QQQ'        },
    { date: '2025-11-03', ils: -11090.34,  note: 'מכירה: SPDR S&P 500 ETF'  },
    { date: '2025-11-16', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2025-12-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2025-12-15', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2026-01-05', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2026-01-15', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2026-02-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2026-02-06', ils:  10000,      note: 'BTC'                        },
    { date: '2026-02-15', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2026-03-02', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2026-03-15', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2026-03-17', ils:  20565,      note: 'S&P קרן השתלמות'          },
    { date: '2026-04-05', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2026-04-15', ils:   1000,      note: 'מיטב קופת גמל'             },
    { date: '2026-05-03', ils:    500,      note: 'פניסה - גמל השקעה'         },
    { date: '2026-05-15', ils:   1000,      note: 'מיטב קופת גמל'             },
  ];

  for (const d of deposits) {
    await sql`
      INSERT INTO deposits (date, amount_ils, note)
      VALUES (${d.date}, ${d.ils}, ${d.note})
    `;
  }

  const totalIls = deposits.reduce((s, d) => s + d.ils, 0);

  return NextResponse.json({
    success: true,
    assets: assets.length,
    deposits: deposits.length,
    total_invested_ils: totalIls.toFixed(2),
  });
}
