import { useState, useEffect } from 'react';
import api from '../api';
import { Badge } from '../utils';
import Modal from './Modal';

const UNITS = ['sq ft', 'rolls', 'reams', 'sheets', 'pcs', 'kg', 'litre'];
const EMPTY = { name: '', unit: 'sq ft', qty: '', reorder_level: '' };

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/inventory').then(r => setInventory(r.data));
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/inventory', { ...form, qty: parseFloat(form.qty) || 0, reorder_level: parseFloat(form.reorder_level) || 0 });
      setModal(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const updateQty = async (item, qty) => {
    await api.put(`/inventory/${item.id}`, { ...item, qty: parseFloat(qty) || 0 });
    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, qty: parseFloat(qty) || 0 } : i));
  };

  const del = async id => {
    if (!confirm('Remove this material?')) return;
    await api.delete(`/inventory/${id}`);
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  const lowCount = inventory.filter(i => i.qty <= i.reorder_level).length;

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Inventory & Stock</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Track materials and reorder levels.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add material
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
        {[
          { label: 'Total Items', value: inventory.length, icon: 'inventory_2', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Low Stock', value: lowCount, icon: 'warning', color: 'text-error', bg: 'bg-error-container' },
          { label: 'OK Stock', value: inventory.length - lowCount, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100' },
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
          <span className="text-label-md text-on-surface font-semibold">Materials — edit qty inline</span>
          <span className="text-label-sm text-on-surface-variant">{inventory.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th><th>Unit</th><th>In stock</th><th>Reorder level</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} className="group">
                  <td className="text-label-md text-on-surface font-semibold">{item.name}</td>
                  <td className="text-body-sm text-on-surface-variant">{item.unit}</td>
                  <td>
                    <input
                      type="number"
                      defaultValue={item.qty}
                      className="w-24 px-sm py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container"
                      onBlur={e => updateQty(item, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && updateQty(item, e.target.value)}
                    />
                  </td>
                  <td className="text-body-sm text-on-surface-variant">{item.reorder_level} {item.unit}</td>
                  <td><Badge s={item.qty <= item.reorder_level ? 'Low' : 'OK'} /></td>
                  <td>
                    <button onClick={() => del(item.id)} className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-error-container transition-all text-outline hover:text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant text-body-sm">No materials added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add material">
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field"><label>Material name</label><input name="name" value={form.name} onChange={handle} placeholder="e.g. Flex material" required /></div>
            <div className="field"><label>Unit</label>
              <select name="unit" value={form.unit} onChange={handle}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="field"><label>Current stock</label><input type="number" name="qty" value={form.qty} onChange={handle} placeholder="0" /></div>
            <div className="field"><label>Reorder level</label><input type="number" name="reorder_level" value={form.reorder_level} onChange={handle} placeholder="0" /></div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Adding…' : 'Add material'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
