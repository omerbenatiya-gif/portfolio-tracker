'use client';

import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
  currency: 'ILS' | 'USD';
}

function getAssetValueIls(asset: Asset, pricesData: PricesResponse | null): number {
  if (asset.type === 'other') {
    // avg_cost_usd stores ILS amount directly for manual assets
    return asset.avg_cost_usd * asset.quantity;
  }
  const price = pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0;
  const rate = pricesData?.usdToIls ?? 3.7;
  return price * asset.quantity * rate;
}

export function getAssetValueIlsExport(asset: Asset, pricesData: PricesResponse | null): number {
  return getAssetValueIls(asset, pricesData);
}

export default function PortfolioSummary({ assets, pricesData }: Props) {
  if (assets.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white mb-3 shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">שווי תיק כולל</p>
        <p className="text-3xl font-bold">₪0</p>
      </div>
    );
  }

  const usdToIls = pricesData?.usdToIls ?? 3.7;
  const totalIls = assets.reduce((sum, a) => sum + getAssetValueIls(a, pricesData), 0);
  const totalCostIls = assets.reduce((sum, a) => {
    if (a.type === 'other') return sum + a.avg_cost_usd * a.quantity; // stored as ILS
    return sum + a.avg_cost_usd * a.quantity * usdToIls;              // USD → ILS
  }, 0);
  const pnlIls = totalIls - totalCostIls;
  const pnlPercent = totalCostIls > 0 ? (pnlIls / totalCostIls) * 100 : 0;
  const isPositive = pnlIls >= 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white mb-3 shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">שווי תיק כולל</p>
        <p className="text-3xl font-bold">{fmt(totalIls)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs mb-1">סה״כ הושקע</p>
          <p className="text-gray-800 font-semibold">{fmt(totalCostIls)}</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-gray-500 text-xs mb-1">רווח / הפסד</p>
          <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{fmt(pnlIls)}
          </p>
          <p className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{pnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
