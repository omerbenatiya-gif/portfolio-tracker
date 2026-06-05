'use client';

import { useEffect, useState, useMemo } from 'react';
import { Deposit } from '@/lib/types';

const EMPTY_FORM = { date: '', amount_ils: '', note: '' };

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: todayStr() });
  const [ratePreview, setRatePreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');

  useEffect(() => { loadDeposits(); }, []);

  useEffect(() => {
    if (!form.date) return;
    fetch(`/api/exchange-rate?date=${form.date}`)
      .then(r => r.json())
      .then(d => setRatePreview(d.usdToIls ?? null))
      .catch(() => setRatePreview(null));
  }, [form.date]);

  async function loadDeposits() {
    const res = await fetch('/api/deposits');
    setDeposits(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const amountIls = form.amount_ils ? parseFloat(form.amount_ils) : null;
    const amountUsd = (amountIls != null && ratePreview) ? +(amountIls / ratePreview).toFixed(2) : null;
    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: form.date, amount_ils: amountIls, amount_usd: amountUsd, note: form.note || null }),
    });
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setRatePreview(null);
    setShowForm(false);
    setSaving(false);
    loadDeposits();
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק רשומה זו?')) return;
    await fetch(`/api/deposits/${id}`, { method: 'DELETE' });
    loadDeposits();
  }

  // Strip "משיכה: " / "מכירה: " prefixes to group same-asset records together
  function normalizeNote(note: string) {
    return note.replace(/^(משיכה|מכירה):\s*/u, '').trim();
  }

  // Unique normalized asset names for filter
  const assetOptions = useMemo(() => {
    const notes = deposits.map(d => d.note).filter(Boolean) as string[];
    return [...new Set(notes.map(normalizeNote))].sort();
  }, [deposits]);

  // Filtered deposits — match by normalized note
  const filtered = useMemo(() => {
    return deposits.filter(d => {
      const amt = d.amount_ils ?? 0;
      if (filterType === 'deposits' && amt <= 0) return false;
      if (filterType === 'withdrawals' && amt >= 0) return false;
      if (filterAsset !== 'all' && normalizeNote(d.note ?? '') !== filterAsset) return false;
      return true;
    });
  }, [deposits, filterType, filterAsset]);

  const netTotal = deposits.reduce((s, d) => s + (d.amount_ils ?? 0), 0);
  const filteredTotal = filtered.reduce((s, d) => s + (d.amount_ils ?? 0), 0);
  const amountIlsNum = form.amount_ils ? parseFloat(form.amount_ils) : null;
  const usdPreview = (amountIlsNum && ratePreview) ? amountIlsNum / ratePreview : null;

  const fmtIls = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const isFiltered = filterType !== 'all' || filterAsset !== 'all';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">פקדונות ומשיכות</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium">
          {showForm ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <p className="text-gray-400 text-xs mb-1">סה״כ מושקע נטו</p>
        <p className="font-bold text-gray-800 text-xl">{fmtIls(netTotal)}</p>
        {isFiltered && (
          <p className="text-gray-400 text-xs mt-1">סינון: {fmtIls(filteredTotal)}</p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Row 1: type */}
        <div className="flex gap-2">
          {(['all', 'deposits', 'withdrawals'] as const).map(type => (
            <button key={type}
              onClick={() => setFilterType(type)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filterType === type ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'
              }`}>
              {type === 'all' ? 'הכל' : type === 'deposits' ? 'הפקדות' : 'משיכות'}
            </button>
          ))}
        </div>
        {/* Row 2: assets */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterAsset('all')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filterAsset === 'all' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}>
            כל הנכסים
          </button>
          {assetOptions.map(note => (
            <button key={note}
              onClick={() => setFilterAsset(filterAsset === note ? 'all' : note)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filterAsset === note ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 shadow-sm'
              }`}>
              {note}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">רשומה חדשה</h2>
          <div className="flex flex-col gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">תאריך</label>
              <input type="date" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {ratePreview && <p className="text-xs text-gray-400 mt-1">שער ₪/$ באותו יום: ₪{ratePreview.toFixed(3)}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">סכום בשקלים (שלילי = משיכה)</label>
              <input type="number" step="any" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="5000" value={form.amount_ils}
                onChange={e => setForm(f => ({ ...f, amount_ils: e.target.value }))} />
              {usdPreview != null && <p className="text-xs text-indigo-500 mt-1">≈ {fmtUsd(usdPreview)}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">הערה (שם הנכס)</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="לדוגמה: BTC" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50">
            {saving ? 'שומר...' : 'הוסף'}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400">אין רשומות</p>
        </div>
      ) : (
        filtered.map(deposit => {
          const isWithdrawal = (deposit.amount_ils ?? 0) < 0;
          return (
            <div key={deposit.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{formatDate(deposit.date)}</p>
                {deposit.note && <p className="text-sm text-gray-700 font-medium">{deposit.note}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-semibold text-sm ${isWithdrawal ? 'text-red-500' : 'text-green-600'}`}>
                    {isWithdrawal ? '' : '+'}{fmtIls(deposit.amount_ils ?? 0)}
                  </p>
                  {deposit.amount_usd != null && (
                    <p className={`text-xs ${isWithdrawal ? 'text-red-400' : 'text-gray-400'}`}>
                      {isWithdrawal ? '' : '+'}{fmtUsd(deposit.amount_usd)}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(deposit.id)}
                  className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-full">מחק</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function formatDate(d: string | Date | unknown) {
  if (d instanceof Date) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  const match = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return String(d);
}
