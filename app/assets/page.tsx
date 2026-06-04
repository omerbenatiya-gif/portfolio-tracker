'use client';

import { useEffect, useState } from 'react';
import { Asset, PricesResponse } from '@/lib/types';

const EMPTY_FORM = {
  name: '', ticker: '', type: 'stock' as Asset['type'],
  quantity: '', avg_cost_usd: '', btc_address: '',
};

const TYPE_LABEL: Record<string, string> = { crypto: 'קריפטו', stock: 'מניה', etf: 'מדד', other: 'ידני' };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => fetch('/api/prices').then(r => r.json()).then(setPricesData), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    const [assetsRes, pricesRes] = await Promise.all([fetch('/api/assets'), fetch('/api/prices')]);
    setAssets(await assetsRes.json());
    setPricesData(await pricesRes.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, quantity: parseFloat(form.quantity), avg_cost_usd: parseFloat(form.avg_cost_usd) };
    const url = editId ? `/api/assets/${editId}` : '/api/assets';
    await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setSaving(false);
    loadAll();
  }

  function startEdit(asset: Asset) {
    setForm({ name: asset.name, ticker: asset.ticker, type: asset.type, quantity: String(asset.quantity), avg_cost_usd: String(asset.avg_cost_usd), btc_address: asset.btc_address ?? '' });
    setEditId(asset.id); setShowForm(true); setExpandedId(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק נכס זה?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadAll();
  }

  const usdToIls = pricesData?.usdToIls ?? 3.65;

  function calcAsset(asset: Asset) {
    const isManual = asset.type === 'other';
    // Use cost_ils (actual ILS paid) — falls back to avg_cost_usd for 'other' (stored as ILS)
    const costIls = asset.cost_ils ?? (isManual ? asset.avg_cost_usd * asset.quantity : asset.avg_cost_usd * asset.quantity * usdToIls);
    const currentPriceUsd = isManual ? null : (pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0);
    const currentIls = isManual ? costIls : (currentPriceUsd ?? 0) * asset.quantity * usdToIls;
    const pnlIls = currentIls - costIls;
    const pnlPct = costIls > 0 ? (pnlIls / costIls) * 100 : 0;
    const change24h = isManual ? null : (pricesData?.prices[asset.ticker.toUpperCase()]?.changePercent24h ?? 0);
    return { costIls, currentIls, pnlIls, pnlPct, change24h, currentPriceUsd, isManual };
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">ניהול נכסים</h1>
        <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(!showForm); }}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium">
          {showForm ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">{editId ? 'ערוך נכס' : 'נכס חדש'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">שם הנכס</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="לדוגמה: אמזון" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">טיקר</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="AMZN" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">סוג</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Asset['type'] }))}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{form.type === 'other' ? 'סכום מושקע (₪)' : 'כמות יחידות'}</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={form.type === 'other' ? '49000' : '13'} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{form.type === 'other' ? 'לא רלוונטי (הכנס 1)' : 'עלות ממוצעת ($)'}</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={form.type === 'other' ? '1' : '216.82'} value={form.avg_cost_usd} onChange={e => setForm(f => ({ ...f, avg_cost_usd: e.target.value }))} required />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50">
            {saving ? 'שומר...' : editId ? 'עדכן' : 'הוסף נכס'}
          </button>
        </form>
      )}

      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400">אין נכסים עדיין</p>
        </div>
      ) : (
        assets.map(asset => {
          const { costIls, currentIls, pnlIls, pnlPct, change24h, currentPriceUsd, isManual } = calcAsset(asset);
          const isExpanded = expandedId === asset.id;
          const isProfit = pnlIls >= 0;
          const barWidth = Math.min((currentIls / Math.max(currentIls, costIls)) * 100, 100);
          const costBarWidth = Math.min((costIls / Math.max(currentIls, costIls)) * 100, 100);

          return (
            <div key={asset.id} className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
              {/* Header row — clickable */}
              <button
                className="w-full text-right p-4 flex items-center justify-between"
                onClick={() => setExpandedId(isExpanded ? null : asset.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{asset.ticker}</span>
                  <span className="text-xs text-gray-400">{TYPE_LABEL[asset.type]}</span>
                  {!isManual && change24h !== null && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${change24h >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{fmt(currentIls)}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#9ca3af' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-3 pt-3">{asset.name}{!isManual && currentPriceUsd ? ` · $${currentPriceUsd.toLocaleString()} למניה` : ''}</p>

                  {/* 3 metric cards */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-gray-400 text-xs mb-1">הושקע</p>
                      <p className="font-bold text-gray-700 text-sm">{fmt(costIls)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                      <p className="text-gray-400 text-xs mb-1">שווי נוכחי</p>
                      <p className="font-bold text-indigo-700 text-sm">{fmt(currentIls)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-gray-400 text-xs mb-1">רווח/הפסד</p>
                      <p className={`font-bold text-sm ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                        {isManual ? '—' : `${isProfit ? '+' : ''}${pnlPct.toFixed(1)}%`}
                      </p>
                      {!isManual && (
                        <p className={`text-xs ${isProfit ? 'text-green-500' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{fmt(pnlIls)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visual bar */}
                  {!isManual && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>עלות</span><span>שווי נוכחי</span>
                      </div>
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gray-300 rounded-full"
                          style={{ width: `${costBarWidth}%` }} />
                        <div className={`absolute inset-y-0 left-0 rounded-full opacity-80 ${isProfit ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(asset)}
                      className="flex-1 text-xs bg-gray-100 text-gray-600 py-2 rounded-xl font-medium">
                      ערוך
                    </button>
                    <button onClick={() => handleDelete(asset.id)}
                      className="flex-1 text-xs bg-red-50 text-red-500 py-2 rounded-xl font-medium">
                      מחק
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
