import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge } from '../utils';
import Modal from './Modal';

const EMPTY = { customer_name: '', description: '', amount: '', gst_rate: '18' };

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/invoices').then(r => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/invoices', { ...form, amount: parseFloat(form.amount) || 0, gst_rate: parseFloat(form.gst_rate) });
      setModal(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const togglePaid = async inv => {
    const status = inv.status === 'Paid' ? 'Pending' : 'Paid';
    await api.put(`/invoices/${inv.id}`, { status });
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status } : i));
  };

  const del = async id => {
    if (!confirm('Delete invoice?')) return;
    await api.delete(`/invoices/${id}`);
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const total = invoices.reduce((s, i) => s + i.amount + i.amount * i.gst_rate / 100, 0);
  const paid  = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount * (1 + i.gst_rate / 100), 0);
  const pend  = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const gst   = invoices.reduce((s, i) => s + i.amount * i.gst_rate / 100, 0);
  const baseAmt = parseFloat(form.amount) || 0;
  const gstAmt  = Math.round(baseAmt * parseFloat(form.gst_rate || 0) / 100);

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Billing & Invoices</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">GST-compliant invoicing for all print jobs.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {[
          { label: 'Total Billed', value: fmt(total), icon: 'receipt_long', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Collected', value: fmt(paid), icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Outstanding', value: fmt(pend), icon: 'pending', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'GST Collected', value: fmt(gst), icon: 'account_balance', color: 'text-on-surface-variant', bg: 'bg-surface-container' },
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

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Invoices (GST inclusive)</span>
          <span className="text-label-sm text-on-surface-variant">{invoices.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Customer</th><th>Job Description</th>
                <th className="text-right">Base</th><th className="text-right">GST</th>
                <th className="text-right">Total</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const g = Math.round(inv.amount * inv.gst_rate / 100);
                return (
                  <tr key={inv.id} className="group">
                    <td className="font-mono text-primary-container text-data-mono">{inv.invoice_id}</td>
                    <td className="text-label-md text-on-surface font-semibold">{inv.customer_name}</td>
                    <td className="text-body-sm text-on-surface-variant">{inv.description}</td>
                    <td className="text-right font-mono text-data-mono">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="text-right">
                      <span className="text-label-sm text-on-surface-variant">₹{g.toLocaleString('en-IN')}</span>
                      <br /><span className="text-[10px] text-outline">{inv.gst_rate}%</span>
                    </td>
                    <td className="text-right font-mono text-data-mono font-semibold">₹{(inv.amount + g).toLocaleString('en-IN')}</td>
                    <td><Badge s={inv.status} /></td>
                    <td>
                      <div className="flex items-center gap-xs">
                        <button onClick={() => togglePaid(inv)} className="btn btn-sm text-label-sm">
                          {inv.status === 'Paid' ? 'Unpaid' : 'Mark paid'}
                        </button>
                        <button onClick={() => del(inv.id)} className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-error-container transition-all text-outline hover:text-error">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant text-body-sm">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Invoice">
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field"><label>Customer name</label><input name="customer_name" value={form.customer_name} onChange={handle} placeholder="Customer name" required /></div>
            <div className="field"><label>Job description</label><input name="description" value={form.description} onChange={handle} placeholder="Job / service" /></div>
            <div className="field"><label>Amount before GST (₹)</label><input type="number" name="amount" value={form.amount} onChange={handle} placeholder="0" required /></div>
            <div className="field"><label>GST rate</label>
              <select name="gst_rate" value={form.gst_rate} onChange={handle}>
                <option value="18">18% — CGST 9% + SGST 9%</option>
                <option value="12">12% — CGST 6% + SGST 6%</option>
                <option value="5">5%</option>
                <option value="0">0% — Exempt</option>
              </select>
            </div>
          </div>
          {baseAmt > 0 && (
            <div className="p-sm bg-surface-container rounded-lg flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">GST: <strong className="text-on-surface">₹{gstAmt.toLocaleString('en-IN')}</strong></span>
              <span className="text-on-surface font-semibold">Total: ₹{(baseAmt + gstAmt).toLocaleString('en-IN')}</span>
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
