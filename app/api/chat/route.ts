import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, Tool, FunctionCall, SchemaType } from '@google/generative-ai';
import { getDb, initSchema } from '@/lib/db';
import { fetchUsdToIls } from '@/lib/prices';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
- "קניתי 5 מניות AAPL במחיר 200 דולר" → עדכן quantity ו-avg_cost_usd של AAPL + הוסף פקדון
- "הפקדתי 5000 שקל לקרן ההשתלמות" → הוסף פקדון + עדכן שווי הנכס
- דוח קרן השתלמות → עדכן avg_cost_usd=שווי נוכחי ו-cost_ils=סכום שהופקד

ענה תמיד בעברית. אחרי כל פעולה סכם מה עשית בצורה ברורה עם מספרים.`;

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'list_assets',
    description: 'מחזיר את כל הנכסים בתיק עם כל הפרטים',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
  {
    name: 'list_deposits',
    description: 'מחזיר את 30 הפקדות/משיכות האחרונות',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
  {
    name: 'update_asset',
    description: 'מעדכן נכס קיים בתיק',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER, description: 'מזהה הנכס' },
        name: { type: SchemaType.STRING, description: 'שם הנכס' },
        ticker: { type: SchemaType.STRING, description: 'טיקר' },
        quantity: { type: SchemaType.NUMBER, description: 'כמות יחידות' },
        avg_cost_usd: { type: SchemaType.NUMBER, description: 'מחיר קנייה ממוצע בדולר (לנכס other: שווי נוכחי בשקלים)' },
        cost_ils: { type: SchemaType.NUMBER, description: 'עלות מקורית בשקלים' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_asset',
    description: 'יוצר נכס חדש בתיק',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'שם הנכס' },
        ticker: { type: SchemaType.STRING, description: 'טיקר' },
        type: { type: SchemaType.STRING, description: 'סוג: crypto, stock, etf, או other' },
        quantity: { type: SchemaType.NUMBER, description: 'כמות יחידות' },
        avg_cost_usd: { type: SchemaType.NUMBER, description: 'מחיר קנייה ממוצע בדולר (לנכס other: שווי בשקלים)' },
        cost_ils: { type: SchemaType.NUMBER, description: 'עלות מקורית בשקלים' },
      },
      required: ['name', 'ticker', 'type', 'quantity', 'avg_cost_usd'],
    },
  },
  {
    name: 'add_deposit',
    description: 'מוסיף הפקדה או משיכה (סכום שלילי = משיכה)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'תאריך בפורמט YYYY-MM-DD' },
        amount_ils: { type: SchemaType.NUMBER, description: 'סכום בשקלים (שלילי = משיכה)' },
        note: { type: SchemaType.STRING, description: 'הערה, לרוב שם הנכס' },
      },
      required: ['date', 'amount_ils'],
    },
  },
  {
    name: 'refresh_snapshot',
    description: 'מעדכן את הסנפשוט היומי של התיק — קרא לזה בסוף כל עדכון',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
];

const tools: Tool[] = [{ functionDeclarations }];

async function executeTool(call: FunctionCall): Promise<unknown> {
  const { name, args } = call;
  const input = (args ?? {}) as Record<string, unknown>;
  const sql = getDb();
  await initSchema();

  if (name === 'list_assets') {
    return await sql`SELECT * FROM assets ORDER BY created_at ASC`;
  }

  if (name === 'list_deposits') {
    return await sql`SELECT * FROM deposits ORDER BY date DESC, id DESC LIMIT 30`;
  }

  if (name === 'update_asset') {
    const { id, name: n, ticker, quantity, avg_cost_usd, cost_ils } = input as {
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

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools,
    });

    // Build history (all but last message)
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;

    let result = await chat.sendMessage(lastMessage);

    // Handle tool calls in a loop
    while (true) {
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall as FunctionCall);

      if (functionCalls.length === 0) {
        const text = response.text();
        return NextResponse.json({ reply: text });
      }

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (call) => {
          const output = await executeTool(call);
          return {
            functionResponse: {
              name: call.name,
              response: { result: JSON.stringify(output) },
            },
          };
        })
      );

      result = await chat.sendMessage(functionResponses);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
