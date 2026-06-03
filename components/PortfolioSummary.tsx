'use client';

import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
}

export default function PortfolioSummary({ assets, pricesData }: Props) {
  if (!pricesData) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const { prices, usdToIls } = pricesData;

  let totalCurrentUsd = 0;
  let totalCostUsd = 0;

  for (const asset of assets) {
    const isManual = asset.type === 'other';
    // Manual assets: use avg_cost as current price (no live feed)
    const price = isManual
      ? asset.avg_cost_usd
      : (prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0);
    totalCurrentUsd += price * asset.quantity;
    totalCostUsd += asset.avg_cost_usd * asset.quantity;
  }

  const totalCurrentIls = totalCurrentUsd * usdToIls;
  const pnlUsd = totalCurrentUsd - totalCostUsd;
  const pnlPercent = totalCostUsd > 0 ? (pnlUsd / totalCostUsd) * 100 : 0;
  const isPositive = pnlUsd >= 0;

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white mb-3 shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">שווי תיק כולל</p>
        <p className="text-3xl font-bold">{fmt(totalCurrentIls, 'ILS')}</p>
        <p className="text-indigo-200 text-lg mt-1">{fmt(totalCurrentUsd, 'USD')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs mb-1">עלות כוללת</p>
          <p className="text-gray-800 font-semibold">{fmt(totalCostUsd * usdToIls, 'ILS')}</p>
          <p className="text-gray-400 text-xs">{fmt(totalCostUsd, 'USD')}</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-gray-500 text-xs mb-1">רווח / הפסד</p>
          <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{fmt(pnlUsd * usdToIls, 'ILS')}
          </p>
          <p className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm col-span-2">
          <p className="text-gray-500 text-xs mb-1">שער דולר / שקל</p>
          <p className="text-gray-800 font-semibold">₪{usdToIls.toFixed(3)}</p>
        </div>
      </div>
    </div>
  );
}
