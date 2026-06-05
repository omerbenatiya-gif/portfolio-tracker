'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
}

const COLORS = [
  '#6366f1', '#0d9488', '#f59e0b', '#3b82f6',
  '#f43f5e', '#8b5cf6', '#10b981', '#f97316',
];

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

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: typeof data[0] }[] }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const pct = ((item.value / total) * 100).toFixed(1);
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-right">
        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
        <p className="text-xs text-gray-500">{item.label}</p>
        <p className="text-sm font-bold mt-1" style={{ color: item.color }}>{fmt(item.value)}</p>
        <p className="text-xs text-gray-400">{pct}% מהתיק</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3">
      <h3 className="font-semibold text-gray-700 mb-1 text-sm">חלוקת תיק</h3>

      {/* Donut chart with centered total */}
      <div className="relative" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={52} outerRadius={80}
              dataKey="value"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 text-xs mb-0.5">שווי תיק</p>
            <p className="font-bold text-gray-800 text-sm leading-tight">{fmt(total)}</p>
          </div>
        </div>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-1">
        {data.map(item => {
          const pct = (item.value / total) * 100;
          return (
            <div key={item.name} className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-xs font-semibold text-gray-700 truncate">{item.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: item.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
