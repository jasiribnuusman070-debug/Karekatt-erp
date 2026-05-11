import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const CATS = ['Materials', 'Electricity', 'Rent', 'Equipment', 'Transport', 'Maintenance', 'Salary advance', 'Other'];
const EMPTY = { date: '', category: 'Materials', description: '', amount: '' };

const CAT_ICONS = {
  Materials: 'inventory_2',
  Electricity: 'electric_bolt',
  Rent: 'home',
  Equipment: 'build',
  Transport: 'local_shipping',
  Maintenance: 'handyman',
  'Salary advance': 'payments',
  Other: 'more_horiz',
};

export default function Finance() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, totalExpenses: 0, payroll: 0, profit: 0 });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [exp, sum] = await Promise.all([
      api.get('/finance/expenses').then(r => r.data),
      api.get('/finance/summary').then(r => r.data),
    ]);
    setExpenses(exp); setSummary(sum);
  };

  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/finance/expenses', { ...form, amount: parseFloat(form.amount) || 0 });
      setModal(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/finance/expenses/${id}`);
    load();
  };

  const catTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const profitColor = summary.profit >= 0 ? 'text-emerald-600' : 'text-error';

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Finance & Accounts</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Revenue, expenses, and net profit overview.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add expense
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {[
          { label: 'Revenue (invoiced)', value: fmt(summary.revenue), icon: 'trending_up', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Total Expenses', value: fmt(summary.totalExpenses), icon: 'trending_down', color: 'text-error', bg: 'bg-error-container' },
          { label: 'Payroll cost', value: fmt(summary.payroll), icon: 'payments', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Net Profit', value: fmt(summary.profit), icon: summary.profit >= 0 ? 'account_balance_wallet' : 'money_off', color: profitColor, bg: summary.profit >= 0 ? 'bg-emerald-100' : 'bg-error-container' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="flex justify-between items-start mb-sm">
              <span className={`material-symbols-outlined p-xs rounded-lg ${m.color} ${m.bg}`} style={{ fontSize: 20 }}>{m.icon}</span>
            </div>
            <p className="metric-label">{m.label}</p>
            <p className={`text-display-lg font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="card lg:col-span-8">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Expense ledger</span>
            <span className="text-label-sm text-on-surface-variant">{expenses.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th className="text-right">Amount</th><th /></tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="group">
                    <td className="text-body-sm text-on-surface-variant font-mono">{e.date}</td>
                    <td>
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>{CAT_ICONS[e.category] || 'more_horiz'}</span>
                        <span className="chip chip-gray">{e.category}</span>
                      </div>
                    </td>
                    <td className="text-body-sm text-on-surface">{e.description}</td>
                    <td className="text-right font-mono text-data-mono font-semibold">{fmt(e.amount)}</td>
                    <td>
                      <button onClick={() => del(e.id)} className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-error-container transition-all text-outline hover:text-error">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant text-body-sm">No expenses recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card lg:col-span-4">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">By category</span>
          </div>
          <div className="p-sm space-y-xs">
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const maxAmt = Math.max(...Object.values(catTotals));
              const pct = Math.round((amt / maxAmt) * 100);
              return (
                <div key={cat} className="p-sm rounded-lg bg-surface-container">
                  <div className="flex items-center justify-between mb-xs">
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>{CAT_ICONS[cat] || 'more_horiz'}</span>
                      <span className="text-label-sm text-on-surface">{cat}</span>
                    </div>
                    <span className="text-label-sm font-mono font-semibold text-on-surface">{fmt(amt)}</span>
                  </div>
                  <div className="h-1 bg-outline-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(catTotals).length === 0 && (
              <p className="text-body-sm text-on-surface-variant text-center py-md">No data yet</p>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add expense">
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field"><label>Date</label><input type="date" name="date" value={form.date} onChange={handle} /></div>
            <div className="field"><label>Category</label>
              <select name="category" value={form.category} onChange={handle}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <input name="description" value={form.description} onChange={handle} placeholder="Describe the expense" />
            </div>
            <div className="field"><label>Amount (₹)</label><input type="number" name="amount" value={form.amount} onChange={handle} placeholder="0" required /></div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Saving…' : 'Add expense'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
