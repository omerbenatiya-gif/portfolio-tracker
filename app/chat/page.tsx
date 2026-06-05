'use client';

import { useEffect, useState } from 'react';
import { Asset } from '@/lib/types';

type Step = 'select' | 'form' | 'new-asset' | 'success';
type ActionType = 'deposit' | 'withdrawal';

const TYPE_LABELS: Record<string, string> = {
  stock: 'מניה', etf: 'מדד', crypto: 'קריפטו', other: 'אחר',
};

function todayStr() { return new Date().toISOString().split('T')[0]; }

export default function UpdatePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [actionType, setActionType] = useState<ActionType>('deposit');
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [ratePreview, setRatePreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // New asset form
  const [newName, setNewName] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [newType, setNewType] = useState<'stock' | 'etf' | 'crypto' | 'other'>('stock');
  const [newAmount, setNewAmount] = useState('');
  const [newRatePreview, setNewRatePreview] = useState<number | null>(null);
  const [newDate, setNewDate] = useState(todayStr());

  useEffect(() => {
    fetch('/api/assets').then(r => r.json()).then(setAssets);
  }, []);

  useEffect(() => {
    const d = step === 'form' ? date : newDate;
    fetch(`/api/exchange-rate?date=${d}`)
      .then(r => r.json())
      .then(data => {
        if (step === 'form') setRatePreview(data.usdToIls ?? null);
        else setNewRatePreview(data.usdToIls ?? null);
      })
      .catch(() => {});
  }, [date, newDate, step]);

  const fmtIls = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  async function handleSubmit() {
    if (!selected || !amount) return;
    setSaving(true);
    const isIls = selected.type === 'other';
    const inputNum = parseFloat(amount);
    const sign = actionType === 'withdrawal' ? -1 : 1;

    // חישוב סכום ILS ו-USD לפי סוג הנכס
    let amount_ils: number;
    let amount_usd: number | null;
    if (isIls) {
      // הזנה בשקלים
      amount_ils = sign * inputNum;
      amount_usd = ratePreview ? +(amount_ils / ratePreview).toFixed(2) : null;
    } else {
      // הזנה בדולר — ממיר לשקלים
      amount_usd = sign * inputNum;
      amount_ils = ratePreview ? +(amount_usd * ratePreview) : sign * inputNum * 3.65;
    }

    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, amount_ils, amount_usd, note: selected.name }),
    });

    const newCostIls = (selected.cost_ils ?? 0) + amount_ils;
    await fetch(`/api/assets/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selected, cost_ils: newCostIls }),
    });

    await fetch('/api/snapshots', { method: 'POST' });

    setSaving(false);
    setStep('success');
  }

  async function handleNewAsset() {
    if (!newName || !newTicker || !newAmount) return;
    setSaving(true);
    const amount_ils = parseFloat(newAmount);
    const amount_usd = newRatePreview ? +(amount_ils / newRatePreview).toFixed(2) : null;
    const avg_cost_usd = newType === 'other' ? amount_ils : (amount_usd ?? 0);

    const assetRes = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName, ticker: newTicker, type: newType,
        quantity: 1, avg_cost_usd, cost_ils: amount_ils,
      }),
    });
    const newAsset = await assetRes.json();

    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newDate, amount_ils, amount_usd, note: newName }),
    });

    await fetch('/api/snapshots', { method: 'POST' });

    setSaving(false);
    setSelected(newAsset);
    setStep('success');
  }

  function reset() {
    setStep('select');
    setSelected(null);
    setAmount('');
    setDate(todayStr());
    setNewName(''); setNewTicker(''); setNewAmount(''); setNewDate(todayStr());
    fetch('/api/assets').then(r => r.json()).then(setAssets);
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-lg font-bold text-gray-800">עודכן בהצלחה!</p>
        <p className="text-sm text-gray-400 text-center">
          {selected?.name} — {actionType === 'deposit' ? 'הפקדה' : 'משיכה'} של{' '}
          {fmtIls(Math.abs(parseFloat(amount || newAmount)))}
        </p>
        <button onClick={reset} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium mt-2">
          עדכון נוסף
        </button>
      </div>
    );
  }

  if (step === 'new-asset') {
    const usdPreview = newRatePreview && newAmount ? parseFloat(newAmount) / newRatePreview : null;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setStep('select')} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">נכס חדש</h1>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">שם הנכס</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="לדוגמה: קרן השתלמות כלל" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">טיקר</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="לדוגמה: NVDA, BTC, CLAL" value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">סוג</label>
            <div className="flex gap-2">
              {(['stock', 'etf', 'crypto', 'other'] as const).map(t => (
                <button key={t} onClick={() => setNewType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium flex-1 ${newType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">תאריך</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">סכום ראשוני (₪)</label>
            <input type="number" step="any" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
            {usdPreview != null && <p className="text-xs text-indigo-500 mt-1">≈ ${usdPreview.toFixed(0)}</p>}
          </div>
          <button onClick={handleNewAsset} disabled={saving || !newName || !newTicker || !newAmount}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-40 mt-1">
            {saving ? 'שומר...' : 'הוסף נכס'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'form' && selected) {
    const isIls = selected.type === 'other';
    const amountNum = parseFloat(amount) || 0;
    // isIls: הזנה בשקלים, preview בדולר
    // !isIls: הזנה בדולר, preview בשקלים
    const ilsPreview = !isIls && ratePreview && amount ? amountNum * ratePreview : null;
    const usdPreview = isIls && ratePreview && amount ? amountNum / ratePreview : null;

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setStep('select')} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{selected.name}</h1>
            <p className="text-xs text-gray-400">{selected.ticker} · {TYPE_LABELS[selected.type]}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          {/* Toggle הפקדה/משיכה */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setActionType('deposit')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${actionType === 'deposit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
              הפקדה
            </button>
            <button onClick={() => setActionType('withdrawal')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${actionType === 'withdrawal' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>
              משיכה
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">תאריך</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={date} onChange={e => setDate(e.target.value)} />
            {ratePreview && <p className="text-xs text-gray-400 mt-1">שער ₪/$ באותו יום: ₪{ratePreview.toFixed(3)}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {isIls ? 'סכום בשקלים (₪)' : 'סכום בדולר ($)'}
            </label>
            <input type="number" step="any"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
            {ilsPreview != null && <p className="text-xs text-indigo-500 mt-1">≈ ₪{Math.round(ilsPreview).toLocaleString()}</p>}
            {usdPreview != null && <p className="text-xs text-indigo-500 mt-1">≈ ${usdPreview.toFixed(0)}</p>}
          </div>

          <button onClick={handleSubmit} disabled={saving || !amount}
            className={`w-full py-3 rounded-xl font-medium text-sm text-white disabled:opacity-40 ${actionType === 'withdrawal' ? 'bg-red-500' : 'bg-indigo-600'}`}>
            {saving ? 'שומר...' : actionType === 'deposit' ? 'אישור הפקדה' : 'אישור משיכה'}
          </button>
        </div>
      </div>
    );
  }

  // Step: select
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-5">עדכון תיק</h1>

      <button onClick={() => setStep('new-asset')}
        className="w-full bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-center gap-2 text-indigo-600 font-medium text-sm border-2 border-dashed border-indigo-200 mb-3">
        <span className="text-lg leading-none">+</span> נכס חדש
      </button>

      <p className="text-xs text-gray-400 mb-3">או בחר נכס קיים</p>

      <div className="flex flex-col gap-2">
        {assets.map(asset => (
          <button key={asset.id} onClick={() => { setSelected(asset); setStep('form'); }}
            className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between text-right">
            <div>
              <p className="font-medium text-gray-800 text-sm">{asset.name}</p>
              <p className="text-xs text-gray-400">{asset.ticker} · {TYPE_LABELS[asset.type]}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
