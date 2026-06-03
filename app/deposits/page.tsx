'use client';

import { useEffect, useState } from 'react';
import { Deposit } from '@/lib/types';

const EMPTY_FORM = { date: '', amount_ils: '', amount_usd: '', note: '' };

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: todayStr() });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadDeposits(); }, []);

  async function loadDeposits() {
    const res = await fetch('/api/deposits');
    setDeposits(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      date: form.date,
      amount_ils: form.amount_ils ? parseFloat(form.amount_ils) : null,
      amount_usd: form.amount_usd ? parseFloat(form.amount_usd) : null,
      note: form.note || null,
    };
    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setShowForm(false);
    setSaving(false);
    loadDeposits();
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק פקדון זה?')) return;
    await fetch(`/api/deposits/${id}`, { method: 'DELETE' });
    loadDeposits();
  }

  const totalIls = deposits.reduce((s, d) => s + (d.amount_ils ?? 0), 0);
  const totalUsd = deposits.reduce((s, d) => s + (d.amount_usd ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">פקדונות</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          {showForm ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">סה״כ הופקד (₪)</p>
          <p className="font-bold text-gray-800">
            {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(totalIls)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">סה״כ הופקד ($)</p>
          <p className="font-bold text-gray-800">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalUsd)}
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">פקדון חדש</h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">תאריך</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">סכום בשקלים (₪)</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="5000"
                value={form.amount_ils}
                onChange={e => setForm(f => ({ ...f, amount_ils: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">סכום בדולרים ($)</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="1000"
                value={form.amount_usd}
                onChange={e => setForm(f => ({ ...f, amount_usd: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">הערה (אופציונלי)</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="פקדון ינואר 2025"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'הוסף פקדון'}
          </button>
        </form>
      )}

      {deposits.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400">אין פקדונות עדיין</p>
        </div>
      ) : (
        deposits.map(deposit => (
          <div key={deposit.id} className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 text-sm">{formatDate(deposit.date)}</p>
              <div className="flex gap-3 mt-0.5">
                {deposit.amount_ils != null && (
                  <span className="text-xs text-gray-500">
                    {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(deposit.amount_ils)}
                  </span>
                )}
                {deposit.amount_usd != null && (
                  <span className="text-xs text-gray-500">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(deposit.amount_usd)}
                  </span>
                )}
              </div>
              {deposit.note && <p className="text-xs text-gray-400 mt-0.5">{deposit.note}</p>}
            </div>
            <button
              onClick={() => handleDelete(deposit.id)}
              className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-full"
            >
              מחק
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
