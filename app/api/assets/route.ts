import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET() {
  const sql = getDb();
  await initSchema();
  const rows = await sql`SELECT * FROM assets ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, ticker, type, quantity, avg_cost_usd, btc_address } = body;

  if (!name || !ticker || !type || quantity == null || avg_cost_usd == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    INSERT INTO assets (name, ticker, type, quantity, avg_cost_usd, btc_address)
    VALUES (${name}, ${ticker.toUpperCase()}, ${type}, ${quantity}, ${avg_cost_usd}, ${btc_address ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
