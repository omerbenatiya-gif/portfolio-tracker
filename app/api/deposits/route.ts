import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET() {
  const sql = getDb();
  await initSchema();
  const rows = await sql`SELECT * FROM deposits ORDER BY date ASC, id ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, amount_ils, amount_usd, note } = body;

  if (!date || (amount_ils == null && amount_usd == null)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    INSERT INTO deposits (date, amount_ils, amount_usd, note)
    VALUES (${date}, ${amount_ils ?? null}, ${amount_usd ?? null}, ${note ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
