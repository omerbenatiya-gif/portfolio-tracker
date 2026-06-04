'use client';

import { useEffect, useState } from 'react';
import { Deposit } from '@/lib/types';

const EMPTY_FORM = { date: '', amount_ils: '', note: '' };

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
    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        amount_ils: form.amount_ils ? parseFloat(form.amount_ils) : null,
        note: form.note || null,
      }),
    });
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setShowForm(false);
    setSaving(false);
    loadDeposits();
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק רשומה זו?')) return;
    await fetch(`/api/deposits/${id}`, { method: 'DELETE' });
    loadDeposits();
  }

  const totalDeposited = deposits.reduce((s, d) => s + (d.amount_ils && d.amount_ils > 0 ? d.amount_ils : 0), 0);
  const totalWithdrawn = deposits.reduce((s, d) => s + (d.amount_ils && d.amount_ils < 0 ? d.amount_ils : 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">פקדונות ומשיכות</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          {showForm ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">סה״כ הופקד</p>
          <p className="font-bold text-gray-800">{fmt(totalDeposited)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs mb-1">סה״כ נמשך</p>
          <p className="font-bold text-red-500">{fmt(Math.abs(totalWithdrawn))}</p>
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
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">סכום בשקלים (שלילי = משיכה)</label>
              <input type="number" step="any" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="5000"
                value={form.amount_ils}
                onChange={e => setForm(f => ({ ...f, amount_ils: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">הערה</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="לדוגמה: BTC"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50">
            {saving ? 'שומר...' : 'הוסף'}
          </button>
        </form>
      )}

      {deposits.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400">אין רשומות עדיין</p>
        </div>
      ) : (
        deposits.map(deposit => {
          const isWithdrawal = (deposit.amount_ils ?? 0) < 0;
          return (
            <div key={deposit.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{formatDate(deposit.date)}</p>
                {deposit.note && <p className="text-sm text-gray-700 font-medium">{deposit.note}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-sm ${isWithdrawal ? 'text-red-500' : 'text-green-600'}`}>
                  {isWithdrawal ? '' : '+'}{fmt(deposit.amount_ils ?? 0)}
                </span>
                <button onClick={() => handleDelete(deposit.id)}
                  className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-full">
                  מחק
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string | Date | unknown) {
  if (d instanceof Date) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }
  const match = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return String(d);
}
