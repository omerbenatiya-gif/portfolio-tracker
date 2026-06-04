import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date'); // YYYY-MM-DD
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  try {
    const d = new Date(date + 'T12:00:00Z');
    const period1 = Math.floor(d.getTime() / 1000);
    const period2 = period1 + 86400;

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/ILS=X?period1=${period1}&period2=${period2}&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
    );
    const data = await res.json();
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const rate = closes.find(v => v && v > 1) ?? data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 3.65;

    return NextResponse.json({ date, usdToIls: rate });
  } catch {
    return NextResponse.json({ date, usdToIls: 3.65 });
  }
}
