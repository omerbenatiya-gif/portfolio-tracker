'use client';

import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  assets: Asset[];
  pricesData: PricesResponse | null;
  currency: 'ILS' | 'USD';
}

export function getAssetValueIls(asset: Asset, pricesData: PricesResponse | null): number {
  if (asset.type === 'other') return asset.avg_cost_usd * asset.quantity;
  const price = pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0;
  return price * asset.quantity * (pricesData?.usdToIls ?? 3.65);
}

export default function PortfolioSummary({ assets, pricesData }: Props) {
  const usdToIls = pricesData?.usdToIls ?? 3.65;

  if (assets.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white mb-3 shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">שווי תיק כולל</p>
        <p className="text-3xl font-bold">₪0</p>
      </div>
    );
  }

  const totalIls = assets.reduce((sum, a) => sum + getAssetValueIls(a, pricesData), 0);
  const totalUsd = totalIls / usdToIls;
  const totalCostIls = assets.reduce((sum, a) => {
    if (a.cost_ils != null) return sum + a.cost_ils;
    if (a.type === 'other') return sum + a.avg_cost_usd * a.quantity;
    return sum + a.avg_cost_usd * a.quantity * usdToIls;
  }, 0);
  const pnlIls = totalIls - totalCostIls;
  const pnlPct = totalCostIls > 0 ? (pnlIls / totalCostIls) * 100 : 0;
  const isPos = pnlIls >= 0;

  const fmtIls = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white mb-3 shadow-lg">
        <p className="text-indigo-200 text-sm mb-1">שווי תיק כולל</p>
        <p className="text-3xl font-bold">{fmtIls(totalIls)}</p>
        <p className="text-indigo-200 text-base mt-0.5">{fmtUsd(totalUsd)}</p>
        <p className="text-indigo-300 text-xs mt-1">שער: ₪{usdToIls.toFixed(3)} לדולר</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">סה״כ הושקע</p>
          <p className="text-gray-800 font-semibold text-sm">{fmtIls(totalCostIls)}</p>
          <p className="text-gray-400 text-xs">{fmtUsd(totalCostIls / usdToIls)}</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm ${isPos ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-gray-400 text-xs mb-1">רווח / הפסד</p>
          <p className={`font-semibold text-sm ${isPos ? 'text-green-600' : 'text-red-600'}`}>
            {isPos ? '+' : ''}{fmtIls(pnlIls)}
          </p>
          <p className={`text-xs ${isPos ? 'text-green-500' : 'text-red-400'}`}>
            {isPos ? '+' : ''}{fmtUsd(pnlIls / usdToIls)} · {isPos ? '+' : ''}{pnlPct.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
