'use client';

import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  asset: Asset;
  pricesData: PricesResponse | null;
  currency: 'ILS' | 'USD';
}

const TYPE_LABEL: Record<string, string> = {
  crypto: 'קריפטו', stock: 'מניה', etf: 'מדד', other: 'ידני',
};
const TYPE_COLOR: Record<string, string> = {
  crypto: 'bg-orange-100 text-orange-700',
  stock: 'bg-blue-100 text-blue-700',
  etf: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function AssetRow({ asset, pricesData }: Props) {
  const isManual = asset.type === 'other';
  const usdToIls = pricesData?.usdToIls ?? 3.7;

  // For manual assets: avg_cost_usd stores ILS directly
  const currentValueIls = isManual
    ? asset.avg_cost_usd * asset.quantity
    : (pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0) * asset.quantity * usdToIls;

  const change24h = isManual ? null : (pricesData?.prices[asset.ticker.toUpperCase()]?.changePercent24h ?? 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-800">{asset.ticker.toUpperCase()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[asset.type]}`}>
              {TYPE_LABEL[asset.type]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{asset.name}</p>
        </div>
        <p className="font-semibold text-gray-800">{fmt(currentValueIls)}</p>
      </div>

      {!isManual && change24h !== null && (
        <p className={`text-xs font-medium text-left ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% היום
        </p>
      )}
    </div>
  );
}
