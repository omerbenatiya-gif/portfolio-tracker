import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb, initSchema } from '@/lib/db';
import { fetchUsdToIls } from '@/lib/prices';

const client = new Anthropic();

const SYSTEM_PROMPT = `אתה עוזר אישי לניהול תיק השקעות. יש לך גישה מלאה למסד הנתונים של המשתמש ואתה יכול לקרוא ולעדכן נתונים.

מבנה המערכת:
- טבלת assets: נכסים בתיק. שדות: id, name, ticker, type (crypto/stock/etf/other), quantity, avg_cost_usd, cost_ils
- טבלת deposits: היסטוריית הפקדות ומשיכות. שדות: id, date, amount_ils, amount_usd, note

חוקים חשובים:
1. נכס מסוג 'other' (כמו קרן השתלמות, קופת גמל): avg_cost_usd מכיל את השווי הנוכחי בשקלים, cost_ils מכיל את סכום ההשקעה המקורי
2. נכסי stock/etf/crypto: avg_cost_usd = מחיר קנייה ממוצע בדולר, cost_ils = עלות ברכישה בשקלים
3. כשמשתמש מדווח על דוח רבעוני של קרן השתלמות — עדכן את avg_cost_usd לשווי הנוכחי ואת cost_ils לסכום שהופקד
4. תמיד בסוף הפעולות קרא ל-refresh_snapshot כדי לעדכן את הסנפשוט היומי

דוגמאות לפעולות:
- "קניתי 5 מניות AAPL במחיר $200" → עדכן quantity ו-avg_cost_usd של AAPL + הוסף פקדון
- "הפקדתי 5000₪ לקרן ההשתלמות" → הוסף פקדון + עדכן את avg_cost_usd של הנכס
- דוח קרן השתלמות → עדכן avg_cost_usd=שווי נוכחי ו-cost_ils=סכום שהופקד

ענה תמיד בעברית. אחרי כל פעולה סכם מה עשית בצורה ברורה עם מספרים.`;

const tools: Anthropic.Tool[] = [
  {
    name: 'list_assets',
    description: 'מחזיר את כל הנכסים בתיק עם כל הפרטים',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_deposits',
    description: 'מחזיר את 30 הפקדות/משיכות האחרונות',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_asset',
    description: 'מעדכן נכס קיים בתיק',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'מזהה הנכס' },
        name: { type: 'string', description: 'שם הנכס' },
        ticker: { type: 'string', description: 'טיקר' },
        quantity: { type: 'number', description: 'כמות יחידות' },
        avg_cost_usd: { type: 'number', description: 'מחיר קנייה ממוצע בדולר (לנכס other: שווי נוכחי בשקלים)' },
        cost_ils: { type: 'number', description: 'עלות מקורית בשקלים' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_asset',
    description: 'יוצר נכס חדש בתיק',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'שם הנכס' },
        ticker: { type: 'string', description: 'טיקר (לדוגמה: AAPL, BTC)' },
        type: { type: 'string', enum: ['crypto', 'stock', 'etf', 'other'], description: 'סוג הנכס' },
        quantity: { type: 'number', description: 'כמות יחידות' },
        avg_cost_usd: { type: 'number', description: 'מחיר קנייה ממוצע בדולר (לנכס other: שווי בשקלים)' },
        cost_ils: { type: 'number', description: 'עלות מקורית בשקלים (אופציונלי)' },
      },
      required: ['name', 'ticker', 'type', 'quantity', 'avg_cost_usd'],
    },
  },
  {
    name: 'add_deposit',
    description: 'מוסיף הפקדה או משיכה (סכום שלילי = משיכה)',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'תאריך בפורמט YYYY-MM-DD' },
        amount_ils: { type: 'number', description: 'סכום בשקלים (שלילי = משיכה)' },
        note: { type: 'string', description: 'הערה, לרוב שם הנכס' },
      },
      required: ['date', 'amount_ils'],
    },
  },
  {
    name: 'refresh_snapshot',
    description: 'מעדכן את הסנפשוט היומי של התיק — קרא לזה בסוף כל עדכון',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const sql = getDb();
  await initSchema();

  if (name === 'list_assets') {
    return await sql`SELECT * FROM assets ORDER BY created_at ASC`;
  }

  if (name === 'list_deposits') {
    return await sql`SELECT * FROM deposits ORDER BY date DESC, id DESC LIMIT 30`;
  }

  if (name === 'update_asset') {
    const { id, ...fields } = input as { id: number; name?: string; ticker?: string; quantity?: number; avg_cost_usd?: number; cost_ils?: number };
    const rows = await sql`
      UPDATE assets SET
        name = COALESCE(${fields.name ?? null}, name),
        ticker = COALESCE(${fields.ticker ?? null}, ticker),
        quantity = COALESCE(${fields.quantity ?? null}, quantity),
        avg_cost_usd = COALESCE(${fields.avg_cost_usd ?? null}, avg_cost_usd),
        cost_ils = COALESCE(${fields.cost_ils ?? null}, cost_ils)
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  }

  if (name === 'create_asset') {
    const { name: n, ticker, type, quantity, avg_cost_usd, cost_ils } = input as {
      name: string; ticker: string; type: string; quantity: number; avg_cost_usd: number; cost_ils?: number;
    };
    const rows = await sql`
      INSERT INTO assets (name, ticker, type, quantity, avg_cost_usd, cost_ils)
      VALUES (${n}, ${ticker}, ${type}, ${quantity}, ${avg_cost_usd}, ${cost_ils ?? null})
      RETURNING *
    `;
    return rows[0];
  }

  if (name === 'add_deposit') {
    const { date, amount_ils, note } = input as { date: string; amount_ils: number; note?: string };
    const usdToIls = await fetchUsdToIls();
    const amount_usd = +(amount_ils / usdToIls).toFixed(2);
    const rows = await sql`
      INSERT INTO deposits (date, amount_ils, amount_usd, note)
      VALUES (${date}, ${amount_ils}, ${amount_usd}, ${note ?? null})
      RETURNING *
    `;
    return rows[0];
  }

  if (name === 'refresh_snapshot') {
    const assets = await sql`SELECT * FROM assets`;
    const usdToIls = await fetchUsdToIls();
    const { fetchStockPrices, fetchCryptoPrices } = await import('@/lib/prices');

    type AssetRow = { ticker: string; type: string; avg_cost_usd: number; quantity: number };
    const rows = assets as AssetRow[];
    const cryptoTickers = rows.filter(a => a.type === 'crypto').map(a => a.ticker);
    const stockTickers = rows.filter(a => a.type === 'stock' || a.type === 'etf').map(a => a.ticker);
    const [cryptoPrices, stockPrices] = await Promise.all([
      fetchCryptoPrices(cryptoTickers),
      fetchStockPrices(stockTickers),
    ]);
    const allPrices = { ...cryptoPrices, ...stockPrices };

    let totalIls = 0;
    let totalUsd = 0;
    for (const asset of rows) {
      if (asset.type === 'other') {
        totalIls += asset.avg_cost_usd * asset.quantity;
        totalUsd += (asset.avg_cost_usd * asset.quantity) / usdToIls;
      } else {
        const price = allPrices[asset.ticker.toUpperCase()]?.priceUsd ?? 0;
        totalIls += price * asset.quantity * usdToIls;
        totalUsd += price * asset.quantity;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    await sql`
      INSERT INTO portfolio_snapshots (date, total_value_ils, total_value_usd)
      VALUES (${today}, ${totalIls}, ${totalUsd})
      ON CONFLICT (date) DO UPDATE SET total_value_ils = EXCLUDED.total_value_ils, total_value_usd = EXCLUDED.total_value_usd
    `;
    return { ok: true, total_ils: Math.round(totalIls), date: today };
  }

  return { error: `Unknown tool: ${name}` };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    let currentMessages: Anthropic.MessageParam[] = messages;

    while (true) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text');
        return NextResponse.json({ reply: (textBlock as Anthropic.TextBlock)?.text ?? '' });
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const result = await executeTool(block.name, block.input as Record<string, unknown>);
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            };
          })
        );

        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ];
        continue;
      }

      return NextResponse.json({ reply: 'סיום לא צפוי' });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
