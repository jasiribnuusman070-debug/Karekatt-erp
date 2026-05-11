import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge, initials } from '../utils';
import { useAuth } from '../App';
import Modal from './Modal';

const STATUSES = ['Received', 'In design', 'Printing', 'Ready', 'Delivered'];
const JOB_TYPES = ['Banner / Flex', 'Visiting cards', 'Brochure', 'Poster', 'Sticker', 'ID card', 'Invitation card', 'Logo design', 'Other'];
const EMPTY = { customer_name: '', phone: '', job_type: 'Banner / Flex', size: '', assigned_to: '', deadline: '', amount: '', notes: '' };

const STATUS_ICONS = { Received: 'schedule', 'In design': 'brush', Printing: 'print', Ready: 'inventory_2', Delivered: 'local_shipping' };
const STATUS_COLORS = { Received: 'text-primary-container bg-primary-container/10', 'In design': 'text-violet-600 bg-violet-100', Printing: 'text-amber-600 bg-amber-100', Ready: 'text-emerald-600 bg-emerald-100', Delivered: 'text-on-surface-variant bg-surface-container' };

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [o, s] = await Promise.all([
      api.get('/orders').then(r => r.data),
      user.role === 'owner' ? api.get('/staff').then(r => r.data) : Promise.resolve([]),
    ]);
    setOrders(o); setStaff(s);
  };
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/orders', { ...form, amount: parseFloat(form.amount) || 0 });
      setModal(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/orders/${id}`, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const del = async id => {
    if (!confirm('Delete this order?')) return;
    await api.delete(`/orders/${id}`);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const today = new Date().toISOString().slice(0, 10);
  const counts = s => orders.filter(o => o.status === s).length;

  const filtered = orders.filter(o =>
    !search || o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.job_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">{user.role === 'staff' ? 'My Orders' : 'Order Management'}</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Review and process active print production cycles.</p>
        </div>
        {user.role === 'owner' && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> New Order
          </button>
        )}
      </div>

      {/* Stats */}
      {user.role === 'owner' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-md">
          {STATUSES.map((s, i) => {
            const colors = ['text-primary-container bg-primary-container/10', 'text-violet-600 bg-violet-100', 'text-amber-600 bg-amber-100', 'text-emerald-600 bg-emerald-100', 'text-on-surface-variant bg-surface-container'];
            const icons = ['schedule', 'brush', 'print', 'inventory_2', 'local_shipping'];
            return (
              <div key={s} className="metric-card">
                <div className="flex justify-between items-start mb-sm">
                  <span className={`material-symbols-outlined p-xs rounded-lg ${colors[i]}`} style={{ fontSize: 18 }}>{icons[i]}</span>
                </div>
                <p className="metric-label">{s}</p>
                <p className={`text-display-lg font-bold ${colors[i].split(' ')[0]}`}>{counts(s)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">All Orders</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline" style={{ fontSize: 16 }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search order, client, job…"
              className="pl-7 pr-sm py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Client</th><th>Job Type</th>
                {user.role === 'owner' && <th>Assigned</th>}
                <th>Deadline</th><th className="text-right">Amount</th>
                <th>Status</th>{user.role === 'owner' && <th />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="group">
                  <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="avatar">{initials(o.customer_name)}</div>
                      <div>
                        <p className="text-label-md text-on-surface">{o.customer_name}</p>
                        <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-body-sm text-on-surface">{o.job_type}</p>
                    <p className="text-label-sm text-on-surface-variant">{o.size}</p>
                  </td>
                  {user.role === 'owner' && <td className="text-body-sm text-on-surface-variant">{o.assigned_to || '—'}</td>}
                  <td className={`text-body-sm ${o.deadline < today && o.status !== 'Delivered' ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>
                    {o.deadline}
                  </td>
                  <td className="text-right font-mono text-data-mono">{fmt(o.amount)}</td>
                  <td>
                    <select
                      className="chip chip-gray border-0 bg-transparent cursor-pointer text-label-sm font-bold pr-sm"
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  {user.role === 'owner' && (
                    <td>
                      <button onClick={() => del(o.id)} className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-error-container transition-all text-outline hover:text-error">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-xl text-on-surface-variant text-body-sm">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-md py-sm border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest text-label-sm text-on-surface-variant">
          <span>{filtered.length} of {orders.length} orders</span>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Order">
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field"><label>Customer name</label><input name="customer_name" value={form.customer_name} onChange={handle} placeholder="Customer name" required /></div>
            <div className="field"><label>Phone</label><input name="phone" value={form.phone} onChange={handle} placeholder="Phone number" /></div>
            <div className="field"><label>Job type</label>
              <select name="job_type" value={form.job_type} onChange={handle}>{JOB_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div className="field"><label>Size / specs</label><input name="size" value={form.size} onChange={handle} placeholder="e.g. 4×2 ft, 500 pcs" /></div>
            <div className="field"><label>Assign to</label>
              <select name="assigned_to" value={form.assigned_to} onChange={handle}>
                <option value="">— Select staff —</option>
                {staff.map(s => <option key={s.id} value={s.name.split(' ')[0]}>{s.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Deadline</label><input type="date" name="deadline" value={form.deadline} onChange={handle} /></div>
            <div className="field"><label>Amount (₹)</label><input type="number" name="amount" value={form.amount} onChange={handle} placeholder="0" /></div>
            <div className="field"><label>Notes</label><input name="notes" value={form.notes} onChange={handle} placeholder="Special instructions" /></div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Creating…' : 'Create Order'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
