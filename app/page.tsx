'use client';

import { useEffect, useState, useCallback } from 'react';
import PortfolioSummary from '@/components/PortfolioSummary';
import AssetRow from '@/components/AssetRow';
import AllocationChart from '@/components/AllocationChart';
import GrowthChart from '@/components/GrowthChart';
import { Asset, PricesResponse, PortfolioSnapshot } from '@/lib/types';

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [assetsRes, pricesRes, snapshotsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/prices'),
        fetch('/api/snapshots'),
      ]);
      setAssets(await assetsRes.json());
      setPricesData(await pricesRes.json());
      setSnapshots(await snapshotsRes.json());
      setLastUpdated(new Date());
      fetch('/api/snapshots', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
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
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="bg-gray-100 text-gray-600 p-2 rounded-full disabled:opacity-40"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>

        {lastUpdated && (
          <p className="text-gray-400 text-xs mb-4">
            עודכן: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <PortfolioSummary assets={assets} pricesData={pricesData} currency="ILS" />
        <AllocationChart assets={assets} pricesData={pricesData} />
        <GrowthChart snapshots={snapshots} currency="ILS" />

        <h2 className="font-semibold text-gray-700 mb-3 text-sm">נכסים בתיק</h2>
        {assets.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 mb-3">עדיין אין נכסים בתיק</p>
            <a href="/assets" className="text-indigo-600 text-sm font-medium">+ הוסף נכס ראשון</a>
          </div>
        ) : (
          assets.map(asset => (
            <AssetRow key={asset.id} asset={asset} pricesData={pricesData} currency="ILS" />
          ))
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
