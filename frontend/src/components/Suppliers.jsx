import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const EMPTY_SUP = { name: '', phone: '', material_type: '', address: '', notes: '' };

export default function Suppliers() {
  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_SUP);
  const [purForm, setPurForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier_id: '', supplier_name: '', inventory_id: '', material_name: '', qty: '', unit: 'kg', unit_price: '', notes: '' });
  const [purModal, setPurModal] = useState(false);

  const load = async () => {
    const [s, p, inv] = await Promise.all([api.get('/suppliers'), api.get('/suppliers/purchases'), api.get('/inventory')]);
    setSuppliers(s.data);
    setPurchases(p.data);
    setInventory(inv.data);
  };
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const purHandle = e => setPurForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openEdit = (sup) => { setForm(sup || EMPTY_SUP); setModal(sup ? 'edit' : 'add'); };
  const save = async () => {
    if (modal === 'edit') await api.put(`/suppliers/${form.id}`, form);
    else await api.post('/suppliers', form);
    setModal(null); setForm(EMPTY_SUP); load();
  };
  const del = async (id) => {
    if (!confirm('Delete supplier?')) return;
    await api.delete(`/suppliers/${id}`);
    load();
  };

  const addPurchase = async () => {
    const { supplier_id, material_name, qty, unit_price } = purForm;
    if (!supplier_id || !material_name || !qty || !unit_price) return alert('Fill required fields');
    const sup = suppliers.find(s => s.id === parseInt(supplier_id));
    await api.post('/suppliers/purchases', { ...purForm, supplier_name: sup?.name || '' });
    setPurModal(false);
    setPurForm(f => ({ ...f, supplier_id: '', inventory_id: '', material_name: '', qty: '', unit_price: '', notes: '' }));
    load();
  };
  const delPur = async (id) => {
    if (!confirm('Delete purchase record?')) return;
    await api.delete(`/suppliers/purchases/${id}`);
    load();
  };

  const totalSpend = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Suppliers</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Manage vendors and track stock purchases.</p>
        </div>
        <div className="flex gap-sm">
          {tab === 'suppliers' && (
            <button onClick={() => openEdit(null)} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Add Supplier
            </button>
          )}
          {tab === 'purchases' && (
            <button onClick={() => setPurModal(true)} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_shopping_cart</span> New Purchase
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-xs border-b border-outline-variant">
        {[
          { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: 'local_shipping' },
          { id: 'purchases', label: `Purchases (${purchases.length})`, icon: 'shopping_bag' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Supplier</th><th>Phone</th><th>Material Type</th><th>Address</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="group">
                    <td className="font-semibold text-on-surface">{s.name}</td>
                    <td className="text-body-sm text-on-surface-variant">{s.phone || '—'}</td>
                    <td><span className="chip chip-gray">{s.material_type || '—'}</span></td>
                    <td className="text-body-sm text-on-surface-variant">{s.address || '—'}</td>
                    <td className="text-body-sm text-on-surface-variant max-w-xs truncate">{s.notes || '—'}</td>
                    <td>
                      <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="btn btn-sm">Edit</button>
                        <button onClick={() => del(s.id)} className="btn btn-sm text-error">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">No suppliers added yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              { label: 'Total Purchases', val: purchases.length, icon: 'receipt_long', color: 'text-primary-container' },
              { label: 'Total Spend', val: fmt(totalSpend), icon: 'payments', color: 'text-on-surface' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div className="flex items-center gap-sm mb-sm">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{m.icon}</span>
                  <span className="metric-label">{m.label}</span>
                </div>
                <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Supplier</th><th>Material</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Total</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id} className="group">
                      <td className="font-mono text-label-md text-primary-container">{p.date}</td>
                      <td className="font-semibold text-on-surface">{p.supplier_name}</td>
                      <td><p className="text-body-sm text-on-surface">{p.material_name}</p></td>
                      <td className="text-right font-mono">{p.qty} {p.unit}</td>
                      <td className="text-right font-mono">{fmt(p.unit_price)}</td>
                      <td className="text-right font-mono font-semibold">{fmt(p.total_amount)}</td>
                      <td className="text-body-sm text-on-surface-variant">{p.notes || '—'}</td>
                      <td>
                        <button onClick={() => delPur(p.id)} className="opacity-0 group-hover:opacity-100 btn btn-sm text-error transition-opacity">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {purchases.length === 0 && <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">No purchases recorded</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Supplier add/edit modal */}
      {modal && (
        <Modal title={modal === 'edit' ? 'Edit Supplier' : 'Add Supplier'} onClose={() => { setModal(null); setForm(EMPTY_SUP); }}>
          <div className="p-md flex flex-col gap-md">
            {[
              { name: 'name', label: 'Name *', placeholder: 'Supplier name' },
              { name: 'phone', label: 'Phone', placeholder: 'Contact number' },
              { name: 'material_type', label: 'Material Type', placeholder: 'e.g. Vinyl, Paper, Ink' },
              { name: 'address', label: 'Address', placeholder: 'Full address' },
              { name: 'notes', label: 'Notes', placeholder: 'Any additional notes' },
            ].map(({ name, label, placeholder }) => (
              <div key={name} className="field">
                <label>{label}</label>
                <input name={name} value={form[name] || ''} onChange={handle} placeholder={placeholder} />
              </div>
            ))}
            <div className="flex gap-sm">
              <button onClick={() => { setModal(null); setForm(EMPTY_SUP); }} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={save} className="btn-primary flex-1 justify-center">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* New purchase modal */}
      {purModal && (
        <Modal title="New Stock Purchase" onClose={() => setPurModal(false)}>
          <div className="p-md flex flex-col gap-md">
            <div className="form-grid">
              <div className="field"><label>Date</label><input type="date" name="date" value={purForm.date} onChange={purHandle} /></div>
              <div className="field">
                <label>Supplier *</label>
                <select name="supplier_id" value={purForm.supplier_id} onChange={purHandle}>
                  <option value="">— Select supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Inventory item (auto-update stock)</label>
                <select name="inventory_id" value={purForm.inventory_id} onChange={e => {
                  const inv = inventory.find(i => i.id === parseInt(e.target.value));
                  setPurForm(f => ({ ...f, inventory_id: e.target.value, material_name: inv?.name || f.material_name, unit: inv?.unit || f.unit }));
                }}>
                  <option value="">— None / manual —</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit})</option>)}
                </select>
              </div>
              <div className="field"><label>Material Name *</label><input name="material_name" value={purForm.material_name} onChange={purHandle} placeholder="Material description" /></div>
              <div className="field"><label>Quantity *</label><input type="number" name="qty" value={purForm.qty} onChange={purHandle} placeholder="0" min="0" step="0.01" /></div>
              <div className="field"><label>Unit</label><input name="unit" value={purForm.unit} onChange={purHandle} placeholder="kg, m, pcs…" /></div>
              <div className="field"><label>Unit Price (₹) *</label><input type="number" name="unit_price" value={purForm.unit_price} onChange={purHandle} placeholder="0" min="0" step="0.01" /></div>
              <div className="field">
                <label>Total</label>
                <input readOnly value={`₹${((parseFloat(purForm.qty) || 0) * (parseFloat(purForm.unit_price) || 0)).toLocaleString('en-IN')}`} className="bg-surface-container" />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Notes</label><input name="notes" value={purForm.notes} onChange={purHandle} placeholder="Optional notes" /></div>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setPurModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={addPurchase} className="btn-primary flex-1 justify-center">Save Purchase</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
