import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, initials, Badge } from '../utils';
import Modal from './Modal';

const EMPTY = { name: '', phone: '', business_name: '', area: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyModal, setHistoryModal] = useState(null); // { customer, orders }
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = () => api.get('/customers').then(r => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/customers', form);
      setModal(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Remove this customer?')) return;
    await api.delete(`/customers/${id}`);
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const openHistory = async (c) => {
    setHistoryLoading(true);
    setHistoryModal({ customer: c, orders: [] });
    try {
      const r = await api.get(`/customers/${c.id}/orders`);
      setHistoryModal({ customer: r.data.customer, orders: r.data.orders });
    } finally { setHistoryLoading(false); }
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.area || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
  const totalOrders = customers.reduce((s, c) => s + (c.order_count || 0), 0);

  // Compute favourite job type from orders
  const favJobType = (orders) => {
    const counts = {};
    orders.forEach(o => { counts[o.job_type] = (counts[o.job_type] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  };

  return (
    <div className="page-wrap">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Customers (CRM)</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Client database with order history.</p>
        </div>
        <div className="flex items-center gap-sm">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline" style={{ fontSize: 16 }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, business…"
              className="pl-7 pr-sm py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <button className="btn-primary" onClick={() => setModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Add customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
        {[
          { label: 'Total Customers', value: customers.length, icon: 'people', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Total Orders', value: totalOrders, icon: 'receipt_long', color: 'text-amber-600', bg: 'bg-amber-100' },
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
          <span className="text-label-md text-on-surface font-semibold">Customer list</span>
          <span className="text-label-sm text-on-surface-variant">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Business</th><th>Phone</th><th>Area</th>
                <th className="text-right">Orders</th><th className="text-right">Total spent</th>
                <th>Last order</th><th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="group cursor-pointer hover:bg-surface-container-low" onClick={() => openHistory(c)}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="avatar">{initials(c.name)}</div>
                      <span className="text-label-md text-on-surface font-semibold">{c.name}</span>
                    </div>
                  </td>
                  <td className="text-body-sm text-on-surface-variant">{c.business_name || '—'}</td>
                  <td className="text-body-sm text-on-surface">{c.phone || '—'}</td>
                  <td className="text-body-sm text-on-surface-variant">{c.area || '—'}</td>
                  <td className="text-right font-mono text-data-mono font-semibold">{c.order_count}</td>
                  <td className="text-right font-mono text-data-mono font-semibold text-emerald-600">{fmt(c.total_spent)}</td>
                  <td className="text-body-sm text-on-surface-variant">{c.last_order || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button onClick={() => del(c.id)} className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-error-container transition-all text-outline hover:text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant text-body-sm">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add customer">
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field"><label>Customer name</label><input name="name" value={form.name} onChange={handle} placeholder="Full name" required /></div>
            <div className="field"><label>Phone</label><input name="phone" value={form.phone} onChange={handle} placeholder="Phone number" /></div>
            <div className="field"><label>Business name</label><input name="business_name" value={form.business_name} onChange={handle} placeholder="Business (optional)" /></div>
            <div className="field"><label>Area / location</label><input name="area" value={form.area} onChange={handle} placeholder="Manjeri, Perinthalmanna…" /></div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Adding…' : 'Add customer'}
          </button>
        </form>
      </Modal>

      {/* Order History Modal */}
      {historyModal && (
        <Modal title={`Order History — ${historyModal.customer.name}`} onClose={() => setHistoryModal(null)}>
          <div className="flex flex-col gap-md p-md">
            {/* Customer summary */}
            <div className="grid grid-cols-3 gap-sm">
              {[
                { label: 'Total Orders', val: historyModal.customer.order_count || historyModal.orders.length },
                { label: 'Total Spent', val: fmt(historyModal.customer.total_spent || 0) },
                { label: 'Favourite Job', val: favJobType(historyModal.orders) },
              ].map(m => (
                <div key={m.label} className="p-sm bg-surface-container rounded-lg text-center">
                  <p className="text-label-sm text-on-surface-variant">{m.label}</p>
                  <p className="text-label-md font-bold text-on-surface mt-xs">{m.val}</p>
                </div>
              ))}
            </div>

            {historyLoading ? (
              <p className="text-center text-body-sm text-on-surface-variant py-lg">Loading…</p>
            ) : historyModal.orders.length === 0 ? (
              <p className="text-center text-body-sm text-on-surface-variant py-lg">No orders found</p>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Job</th><th>Size</th><th className="text-right">Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {historyModal.orders.map(o => (
                      <tr key={o.id}>
                        <td className="font-mono text-primary-container text-label-md">{o.order_id}</td>
                        <td className="text-body-sm text-on-surface">{o.job_type}</td>
                        <td className="text-body-sm text-on-surface-variant">{o.size || '—'}</td>
                        <td className="text-right font-mono font-semibold">{fmt(o.total_amount || o.amount)}</td>
                        <td><Badge s={o.status} /></td>
                        <td className="text-body-sm text-on-surface-variant">{o.created_at ? o.created_at.slice(0, 10) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
