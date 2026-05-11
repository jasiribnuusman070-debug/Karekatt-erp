import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const EXPENSE_CATS = ['Materials', 'Maintenance', 'Utilities', 'Transport', 'Food', 'Office', 'Other'];

export default function CashRegister() {
  const [today, setToday] = useState({});
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ opening_balance: '', cash_in: '', upi_in: '', expenses_out: '', notes: '' });
  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState({ category: 'Office', description: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('today');

  const load = async () => {
    const [t, h] = await Promise.all([api.get('/cash-register/today'), api.get('/cash-register')]);
    setToday(t.data);
    setEntries(h.data);
    if (t.data.entry) {
      const e = t.data.entry;
      setForm({ opening_balance: e.opening_balance || '', cash_in: e.cash_in || '', upi_in: e.upi_in || '', expenses_out: e.expenses_out || '', notes: e.notes || '' });
    }
  };
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/cash-register', form);
      load();
    } finally { setSaving(false); }
  };

  const addExpense = async () => {
    if (!expForm.amount || !expForm.description) return alert('Fill amount and description');
    await api.post('/cash-register/quick-expense', expForm);
    setExpModal(false);
    setExpForm({ category: 'Office', description: '', amount: '' });
    load();
  };

  const ob = parseFloat(form.opening_balance) || 0;
  const ci = parseFloat(form.cash_in) || 0;
  const ui = parseFloat(form.upi_in) || 0;
  const eo = parseFloat(form.expenses_out) || 0;
  const closing = ob + ci + ui - eo;

  const printEOD = () => {
    const e = today.entry || {};
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>EOD Report</title><style>
      body { font-family: Arial; padding: 20px; }
      h2 { border-bottom: 2px solid #000; }
      .row { display: flex; justify-content: space-between; padding: 4px 0; }
      .bold { font-weight: bold; }
      .total { border-top: 2px solid #000; font-weight: bold; font-size: 1.1em; }
    </style></head><body>
    <h2>KarekatOS — Daily Closing Report</h2>
    <p>Date: ${today.today || ''} | Prepared by: ${e.created_by || ''}</p>
    <div class="row"><span>Opening Balance</span><span>₹${(e.opening_balance || 0).toLocaleString('en-IN')}</span></div>
    <div class="row"><span>Cash In</span><span>₹${(e.cash_in || 0).toLocaleString('en-IN')}</span></div>
    <div class="row"><span>UPI In</span><span>₹${(e.upi_in || 0).toLocaleString('en-IN')}</span></div>
    <div class="row"><span>Expenses Out</span><span>- ₹${(e.expenses_out || 0).toLocaleString('en-IN')}</span></div>
    <div class="row total"><span>Closing Balance</span><span>₹${(e.closing_balance || closing).toLocaleString('en-IN')}</span></div>
    <br/><p>Order Collections Today: ₹${(today.collections || 0).toLocaleString('en-IN')}</p>
    ${today.expenses && today.expenses.length > 0 ? `
    <h3>Expenses</h3>
    ${today.expenses.map(ex => `<div class="row"><span>[${ex.category}] ${ex.description}</span><span>₹${ex.amount.toLocaleString('en-IN')}</span></div>`).join('')}
    ` : ''}
    </body></html>`);
    win.print();
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Cash Register</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Daily opening/closing, expense tracking.</p>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => setExpModal(true)} className="btn">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Quick Expense
          </button>
          <button onClick={printEOD} className="btn">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> Print EOD
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-xs border-b border-outline-variant">
        {['today', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-md py-sm text-label-md border-b-2 -mb-px transition-colors capitalize ${tab === t ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t === 'today' ? "Today's Register" : 'History'}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="card lg:col-span-5">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Daily Entry</span></div>
            <div className="p-md flex flex-col gap-md">
              {[
                { name: 'opening_balance', label: 'Opening Balance (₹)', hint: "Yesterday's closing" },
                { name: 'cash_in', label: 'Cash In (₹)', hint: 'Cash received today' },
                { name: 'upi_in', label: 'UPI / Card In (₹)', hint: 'Digital payments received' },
                { name: 'expenses_out', label: 'Expenses Out (₹)', hint: 'Total cash paid out' },
              ].map(({ name, label, hint }) => (
                <div key={name} className="field">
                  <label>{label}</label>
                  <input type="number" name={name} value={form[name]} onChange={handle} placeholder="0" min="0" step="0.01" />
                  <p className="text-label-sm text-on-surface-variant mt-xs">{hint}</p>
                </div>
              ))}
              <div className="field">
                <label>Notes</label>
                <input name="notes" value={form.notes} onChange={handle} placeholder="Any remarks…" />
              </div>
              <button onClick={save} disabled={saving} className="btn-primary justify-center">
                {saving ? 'Saving…' : 'Save / Update'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-md">
            {/* Summary */}
            <div className="card">
              <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Today's Summary</span></div>
              <div className="p-md space-y-sm">
                {[
                  { label: 'Opening Balance', val: ob, color: '' },
                  { label: '+ Cash In', val: ci, color: 'text-emerald-600' },
                  { label: '+ UPI / Card In', val: ui, color: 'text-emerald-600' },
                  { label: '− Expenses Out', val: eo, color: 'text-error' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">{r.label}</span>
                    <span className={`font-mono font-semibold ${r.color}`}>₹{r.val.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-sm border-t-2 border-outline-variant">
                  <span className="text-label-md font-bold text-on-surface">Closing Balance</span>
                  <span className={`text-headline-sm font-bold font-mono ${closing >= 0 ? 'text-primary-container' : 'text-error'}`}>
                    ₹{closing.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-sm p-sm bg-surface-container rounded-lg">
                  <p className="text-label-sm text-on-surface-variant">Order collections today</p>
                  <p className="text-label-md font-semibold text-emerald-700">₹{(today.collections || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Today's expenses */}
            {today.expenses && today.expenses.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Today's Expenses</span></div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Category</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {today.expenses.map(e => (
                        <tr key={e.id}>
                          <td><span className="chip chip-gray">{e.category}</span></td>
                          <td className="text-body-sm text-on-surface">{e.description}</td>
                          <td className="text-right font-mono text-error font-semibold">{fmt(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Register History</span></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th className="text-right">Opening</th><th className="text-right">Cash In</th><th className="text-right">UPI In</th><th className="text-right">Expenses</th><th className="text-right">Closing</th><th>By</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td className="font-mono text-label-md text-primary-container">{e.date}</td>
                    <td className="text-right font-mono">{fmt(e.opening_balance)}</td>
                    <td className="text-right font-mono text-emerald-600">{fmt(e.cash_in)}</td>
                    <td className="text-right font-mono text-emerald-600">{fmt(e.upi_in)}</td>
                    <td className="text-right font-mono text-error">{fmt(e.expenses_out)}</td>
                    <td className="text-right font-mono font-bold text-on-surface">{fmt(e.closing_balance)}</td>
                    <td className="text-body-sm text-on-surface-variant">{e.created_by}</td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick expense modal */}
      {expModal && (
        <Modal title="Quick Expense" onClose={() => setExpModal(false)}>
          <div className="flex flex-col gap-md p-md">
            <div className="field">
              <label>Category</label>
              <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="What was paid for?" />
            </div>
            <div className="field">
              <label>Amount (₹)</label>
              <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" step="0.01" />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setExpModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={addExpense} className="btn-primary flex-1 justify-center">Add Expense</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
