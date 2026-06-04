'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

export default function AllocationChart({ assets, pricesData }: Props) {
  if (!pricesData || assets.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 h-64 flex items-center justify-center">
        <p className="text-gray-400 text-sm">אין נכסים להצגה</p>
      </div>
    );
  }

  const { prices, usdToIls } = pricesData;

  const data = assets.map((asset, i) => {
    const isManual = asset.type === 'other';
    const valueUsd = isManual
      ? (asset.avg_cost_usd * asset.quantity) / usdToIls
      : (prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0) * asset.quantity;
    return {
      name: asset.ticker.toUpperCase(),
      value: valueUsd,
      color: COLORS[i % COLORS.length],
    };
  }).filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">חלוקת תיק</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${((Number(value) / total) * 100).toFixed(1)}%`, 'חלק']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
