import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, ticker, type, quantity, avg_cost_usd, btc_address, cost_ils } = body;

  const sql = getDb();
  const rows = await sql`
    UPDATE assets
    SET name=${name}, ticker=${ticker.toUpperCase()}, type=${type},
        quantity=${quantity}, avg_cost_usd=${avg_cost_usd}, btc_address=${btc_address ?? null},
        cost_ils=${cost_ils ?? null}
    WHERE id=${id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  await sql`DELETE FROM assets WHERE id=${id}`;
  return NextResponse.json({ success: true });
}
