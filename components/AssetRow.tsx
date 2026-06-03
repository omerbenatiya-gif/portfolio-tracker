'use client';

import { Asset, PricesResponse } from '@/lib/types';

interface Props {
  asset: Asset;
  pricesData: PricesResponse | null;
}

const TYPE_LABEL: Record<string, string> = {
  crypto: 'קריפטו',
  stock: 'מניה',
  etf: 'מדד',
  other: 'אחר',
};

const TYPE_COLOR: Record<string, string> = {
  crypto: 'bg-orange-100 text-orange-700',
  stock: 'bg-blue-100 text-blue-700',
  etf: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function AssetRow({ asset, pricesData }: Props) {
  const priceData = pricesData?.prices[asset.ticker.toUpperCase()];
  const usdToIls = pricesData?.usdToIls ?? 3.7;

  const currentPrice = priceData?.priceUsd ?? 0;
  const change24h = priceData?.changePercent24h ?? 0;
  const currentValue = currentPrice * asset.quantity;
  const costBasis = asset.avg_cost_usd * asset.quantity;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  const isPositive = pnl >= 0;

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  const fmtIls = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-800">{asset.ticker.toUpperCase()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[asset.type]}`}>
              {TYPE_LABEL[asset.type]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{asset.name}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-800">{fmtIls(currentValue * usdToIls)}</p>
          <p className="text-gray-400 text-xs">{fmtUsd(currentValue)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">
          <span>{asset.quantity} יח׳ × {fmtUsd(currentPrice)}</span>
        </div>
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-gray-400 text-xs">שינוי 24ש</p>
            <p className={`text-xs font-medium ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">רווח/הפסד</p>
            <p className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{pnlPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
