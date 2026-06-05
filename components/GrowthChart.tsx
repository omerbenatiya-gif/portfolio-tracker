'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { PortfolioSnapshot } from '@/lib/types';

interface Props {
  snapshots: PortfolioSnapshot[];
  currency: 'ILS' | 'USD';
}

const HEBREW_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

function formatDate(dateStr: string) {
  const m = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  return `${parseInt(m[3])} ${HEBREW_MONTHS[parseInt(m[2]) - 1]}`;
}

function CustomTooltip({ active, payload, label, symbol }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  symbol: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-right">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="font-bold text-gray-800 text-sm">{symbol}{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function GrowthChart({ snapshots, currency }: Props) {
  const symbol = currency === 'ILS' ? '₪' : '$';

  if (snapshots.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 h-36 flex items-center justify-center">
        <p className="text-gray-400 text-sm text-center">הגרף יופיע לאחר לפחות יומיים של נתונים</p>
      </div>
    );
  }

  const data = snapshots.map(s => ({
    dateRaw: String(s.date),
    date: formatDate(String(s.date)),
    value: currency === 'ILS' ? Math.round(s.total_value_ils) : Math.round(s.total_value_usd),
  }));

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;

  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  const padding = (maxVal - minVal) * 0.15 || maxVal * 0.1;
  const yMin = Math.max(0, Math.floor((minVal - padding) / 1000) * 1000);
  const yMax = Math.ceil((maxVal + padding) / 1000) * 1000;

  const color = isPositive ? '#10b981' : '#f43f5e';

  // Show only a subset of date labels to avoid crowding
  const labelInterval = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">צמיחת תיק לאורך זמן</p>
          <p className="text-xl font-bold text-gray-800">{symbol}{last.toLocaleString()}</p>
        </div>
        <div className={`text-right px-3 py-1.5 rounded-xl ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{changePct.toFixed(1)}%
          </p>
          <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{symbol}{Math.abs(change).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval={labelInterval}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`}
            width={42}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip symbol={symbol} />} />
          <ReferenceLine y={first} stroke="#e5e7eb" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#growthGrad)"
            dot={false}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Footer: period info */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>מ-{formatDate(data[0].dateRaw)}</span>
        <span>{data.length} נקודות נתון</span>
        <span>עד {formatDate(data[data.length - 1].dateRaw)}</span>
      </div>
    </div>
  );
}
