'use client';

import { useEffect, useState } from 'react';
import { Asset, PricesResponse } from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  ticker: '',
  type: 'stock' as Asset['type'],
  quantity: '',
  avg_cost_usd: '',
  btc_address: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [assetsRes, pricesRes] = await Promise.all([
      fetch('/api/assets'),
      fetch('/api/prices'),
    ]);
    setAssets(await assetsRes.json());
    setPricesData(await pricesRes.json());
  }

  async function loadAssets() {
    const res = await fetch('/api/assets');
    setAssets(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      quantity: parseFloat(form.quantity),
      avg_cost_usd: parseFloat(form.avg_cost_usd),
    };

    const url = editId ? `/api/assets/${editId}` : '/api/assets';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    setSaving(false);
    loadAssets();
  }

  function startEdit(asset: Asset) {
    setForm({
      name: asset.name,
      ticker: asset.ticker,
      type: asset.type,
      quantity: String(asset.quantity),
      avg_cost_usd: String(asset.avg_cost_usd),
      btc_address: asset.btc_address ?? '',
    });
    setEditId(asset.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק נכס זה?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    loadAssets();
  }

  const TYPE_LABEL: Record<string, string> = { crypto: 'קריפטו', stock: 'מניה', etf: 'מדד', other: 'ידני' };

  const usdToIls = pricesData?.usdToIls ?? 3.7;

  function getValueIls(asset: Asset): string {
    const isManual = asset.type === 'other';
    const price = isManual
      ? asset.avg_cost_usd
      : (pricesData?.prices[asset.ticker.toUpperCase()]?.priceUsd ?? 0);
    const valueIls = price * asset.quantity * usdToIls;
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(valueIls);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">ניהול נכסים</h1>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(!showForm); }}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          {showForm ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">
            {editId ? 'ערוך נכס' : 'נכס חדש'}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">שם הנכס</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="לדוגמה: ביטקוין"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">טיקר / סימבול</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="BTC"
                value={form.ticker}
                onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">סוג</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as Asset['type'] }))}
              >
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">כמות יחידות</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0.5"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">עלות ממוצעת ($)</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="50000"
                value={form.avg_cost_usd}
                onChange={e => setForm(f => ({ ...f, avg_cost_usd: e.target.value }))}
                required
              />
            </div>

            {form.type === 'crypto' && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">כתובת ארנק (אופציונלי)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="bc1q..."
                  value={form.btc_address}
                  onChange={e => setForm(f => ({ ...f, btc_address: e.target.value }))}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {saving ? 'שומר...' : editId ? 'עדכן נכס' : 'הוסף נכס'}
          </button>
        </form>
      )}

      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400">אין נכסים עדיין</p>
        </div>
      ) : (
        assets.map(asset => (
          <div key={asset.id} className="bg-white rounded-2xl p-4 shadow-sm mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">{asset.ticker}</span>
                <span className="text-xs text-gray-400">{TYPE_LABEL[asset.type]}</span>
              </div>
              <span className="font-semibold text-gray-800">{getValueIls(asset)}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{asset.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(asset)}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full"
                >
                  ערוך
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-full"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
