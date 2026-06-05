'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316',
];

const RADIAN = Math.PI / 180;

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.04) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AllocationChart({ assets, pricesData }: Props) {
  if (assets.length === 0) return null;

  const usdToIls = pricesData?.usdToIls ?? 3.65;

  const data = assets.map((asset, i) => {
    const valueIls = asset.type === 'other'
      ? asset.avg_cost_usd * asset.quantity
      : (pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0) * asset.quantity * usdToIls;
    return { name: asset.ticker.toUpperCase(), label: asset.name, value: valueIls, color: COLORS[i % COLORS.length] };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <h3 className="font-semibold text-gray-700 mb-4 text-sm">חלוקת תיק</h3>

      <div className="flex items-center gap-4">
        {/* Pie */}
        <div style={{ width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={38} outerRadius={72}
                dataKey="value"
                paddingAngle={2}
                labelLine={false}
                label={PieLabel as never}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [fmt(v), `${((v / total) * 100).toFixed(1)}%`]}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700">{((item.value / total) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
