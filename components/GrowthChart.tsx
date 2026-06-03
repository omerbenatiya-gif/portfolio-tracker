'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PortfolioSnapshot } from '@/lib/types';

interface Props {
  snapshots: PortfolioSnapshot[];
  currency: 'ILS' | 'USD';
}

export default function GrowthChart({ snapshots, currency }: Props) {
  if (snapshots.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 h-48 flex items-center justify-center">
        <p className="text-gray-400 text-sm text-center">
          הגרף יופיע לאחר לפחות יומיים של נתונים
        </p>
      </div>
    );
  }

  const data = snapshots.map(s => ({
    date: s.date.slice(5),
    value: currency === 'ILS' ? Math.round(s.total_value_ils) : Math.round(s.total_value_usd),
  }));

  const symbol = currency === 'ILS' ? '₪' : '$';

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">צמיחת תיק לאורך זמן</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip
            formatter={(v) => [`${symbol}${Number(v).toLocaleString()}`, 'שווי']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
