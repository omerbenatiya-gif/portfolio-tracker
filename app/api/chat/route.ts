import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getDb, initSchema } from '@/lib/db';
import { fetchUsdToIls } from '@/lib/prices';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה עוזר אישי לניהול תיק השקעות. יש לך גישה מלאה למסד הנתונים של המשתמש ואתה יכול לקרוא ולעדכן נתונים.

מבנה המערכת:
- טבלת assets: נכסים בתיק. שדות: id, name, ticker, type (crypto/stock/etf/other), quantity, avg_cost_usd, cost_ils
- טבלת deposits: היסטוריית הפקדות ומשיכות. שדות: id, date, amount_ils, amount_usd, note

חוקים חשובים:
1. נכס מסוג 'other' (כמו קרן השתלמות, קופת גמל): avg_cost_usd מכיל את השווי הנוכחי בשקלים, cost_ils מכיל את סכום ההשקעה המקורי
2. נכסי stock/etf/crypto: avg_cost_usd = מחיר קנייה ממוצע בדולר, cost_ils = עלות ברכישה בשקלים
3. כשמשתמש מדווח על דוח רבעוני של קרן השתלמות — עדכן את avg_cost_usd לשווי הנוכחי ואת cost_ils לסכום שהופקד
4. תמיד בסוף הפעולות קרא ל-refresh_snapshot כדי לעדכן את הסנפשוט היומי
5. לפני כל עדכון — קרא ל-list_assets כדי לדעת את ה-id הנכון של הנכס

ענה תמיד בעברית. אחרי כל פעולה סכם מה עשית בצורה ברורה עם מספרים.`;

const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_assets',
      description: 'מחזיר את כל הנכסים בתיק עם כל הפרטים',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_deposits',
      description: 'מחזיר את 30 הפקדות/משיכות האחרונות',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_asset',
      description: 'מעדכן נכס קיים בתיק',
      parameters: {
        type: 'object',
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
  },
  {
    type: 'function',
    function: {
      name: 'create_asset',
      description: 'יוצר נכס חדש בתיק',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'שם הנכס' },
          ticker: { type: 'string', description: 'טיקר' },
          type: { type: 'string', enum: ['crypto', 'stock', 'etf', 'other'], description: 'סוג הנכס' },
          quantity: { type: 'number', description: 'כמות יחידות' },
          avg_cost_usd: { type: 'number', description: 'מחיר קנייה ממוצע בדולר (לנכס other: שווי בשקלים)' },
          cost_ils: { type: 'number', description: 'עלות מקורית בשקלים' },
        },
        required: ['name', 'ticker', 'type', 'quantity', 'avg_cost_usd'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_deposit',
      description: 'מוסיף הפקדה או משיכה (סכום שלילי = משיכה)',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'תאריך בפורמט YYYY-MM-DD' },
          amount_ils: { type: 'number', description: 'סכום בשקלים (שלילי = משיכה)' },
          note: { type: 'string', description: 'הערה, לרוב שם הנכס' },
        },
        required: ['date', 'amount_ils'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_asset',
      description: 'מוחק נכס מהתיק לפי id',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'מזהה הנכס למחיקה' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_deposit',
      description: 'מוחק הפקדה/משיכה לפי id',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'מזהה ההפקדה למחיקה' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refresh_snapshot',
      description: 'מעדכן את הסנפשוט היומי של התיק — קרא לזה בסוף כל עדכון',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const sql = getDb();
  await initSchema();

  if (name === 'list_assets') {
    return await sql`SELECT * FROM assets ORDER BY created_at ASC`;
  }

  if (name === 'list_deposits') {
    return await sql`SELECT * FROM deposits ORDER BY date DESC, id DESC LIMIT 30`;
  }

  if (name === 'update_asset') {
    const { id, name: n, ticker, quantity, avg_cost_usd, cost_ils } = args as {
      id: number; name?: string; ticker?: string; quantity?: number; avg_cost_usd?: number; cost_ils?: number;
    };
    const rows = await sql`
      UPDATE assets SET
        name = COALESCE(${n ?? null}, name),
        ticker = COALESCE(${ticker ?? null}, ticker),
        quantity = COALESCE(${quantity ?? null}, quantity),
        avg_cost_usd = COALESCE(${avg_cost_usd ?? null}, avg_cost_usd),
        cost_ils = COALESCE(${cost_ils ?? null}, cost_ils)
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  }

  if (name === 'create_asset') {
    const { name: n, ticker, type, quantity, avg_cost_usd, cost_ils } = args as {
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
    const { date, amount_ils, note } = args as { date: string; amount_ils: number; note?: string };
    const usdToIls = await fetchUsdToIls();
    const amount_usd = +(amount_ils / usdToIls).toFixed(2);
    const rows = await sql`
      INSERT INTO deposits (date, amount_ils, amount_usd, note)
      VALUES (${date}, ${amount_ils}, ${amount_usd}, ${note ?? null})
      RETURNING *
    `;
    return rows[0];
  }

  if (name === 'delete_asset') {
    const { id } = args as { id: number };
    const rows = await sql`DELETE FROM assets WHERE id = ${id} RETURNING *`;
    return rows[0] ?? { error: 'not found' };
  }

  if (name === 'delete_deposit') {
    const { id } = args as { id: number };
    const rows = await sql`DELETE FROM deposits WHERE id = ${id} RETURNING *`;
    return rows[0] ?? { error: 'not found' };
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

    let totalIls = 0, totalUsd = 0;
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

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    while (true) {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        tools,
        tool_choice: 'auto',
        max_tokens: 2048,
      });

      const msg = response.choices[0].message;
      groqMessages.push(msg);

      if (!msg.tool_calls?.length) {
        return NextResponse.json({ reply: msg.content ?? '' });
      }

      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments || '{}');
        const result = await executeTool(call.function.name, args);
        groqMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
