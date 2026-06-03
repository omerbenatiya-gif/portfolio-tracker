'use client';

import { useEffect, useState, useCallback } from 'react';
import PortfolioSummary from '@/components/PortfolioSummary';
import AssetRow from '@/components/AssetRow';
import AllocationChart from '@/components/AllocationChart';
import GrowthChart from '@/components/GrowthChart';
import { Asset, PricesResponse, PortfolioSnapshot } from '@/lib/types';

type Currency = 'ILS' | 'USD';

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [assetsRes, pricesRes, snapshotsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/prices'),
        fetch('/api/snapshots'),
      ]);
      const [assetsData, prices, snapshotsData] = await Promise.all([
        assetsRes.json(),
        pricesRes.json(),
        snapshotsRes.json(),
      ]);
      setAssets(assetsData);
      setPricesData(prices);
      setSnapshots(snapshotsData);
      setLastUpdated(new Date());
      fetch('/api/snapshots', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-800">תיק ההשקעות שלי</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrency(c => c === 'ILS' ? 'USD' : 'ILS')}
              className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-medium"
            >
              {currency === 'ILS' ? '₪ → $' : '$ → ₪'}
            </button>
            <button
              onClick={fetchAll}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full"
              disabled={loading}
            >
              {loading ? '...' : '🔄'}
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-gray-400 text-xs mb-4">
            עודכן: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <PortfolioSummary assets={assets} pricesData={pricesData} />
        <AllocationChart assets={assets} pricesData={pricesData} />
        <GrowthChart snapshots={snapshots} currency={currency} />

        <h2 className="font-semibold text-gray-700 mb-3 text-sm">נכסים בתיק</h2>
        {assets.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 mb-3">עדיין אין נכסים בתיק</p>
            <a href="/assets" className="text-indigo-600 text-sm font-medium">+ הוסף נכס ראשון</a>
          </div>
        ) : (
          assets.map(asset => (
            <AssetRow key={asset.id} asset={asset} pricesData={pricesData} />
          ))
        )}
      </div>
    </>
  );
}
