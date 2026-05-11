import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const UNITS = ['sq ft', 'per 100 pcs', 'per piece', 'fixed'];
const UNIT_LABEL = { 'sq ft': 'per sq ft', 'per 100 pcs': 'per 100 pcs', 'per piece': 'per piece', 'fixed': 'fixed price' };
const EMPTY = { job_type: '', unit: 'per piece', rate: '', min_qty: '1', description: '', pricing_type: 'single' };
const EMPTY_SLAB = { min_qty: '', max_qty: '', rate: '' };

export default function RateCard() {
  const [rates, setRates] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [slabs, setSlabs] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/rate-card').then(r => setRates(r.data));
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setSlabs([]); setModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({ job_type: r.job_type, unit: r.unit, rate: String(r.rate), min_qty: String(r.min_qty), description: r.description || '', pricing_type: r.pricing_type || 'single' });
    setSlabs(r.slabs ? r.slabs.map(s => ({ ...s, min_qty: String(s.min_qty), max_qty: String(s.max_qty === 999999 ? '' : s.max_qty), rate: String(s.rate) })) : []);
    setModal(true);
  };

  const addSlab = () => setSlabs(s => [...s, { ...EMPTY_SLAB }]);
  const updateSlab = (i, field, val) => setSlabs(s => s.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const removeSlab = i => setSlabs(s => s.filter((_, idx) => idx !== i));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        job_type: form.job_type, unit: form.unit,
        rate: parseFloat(form.rate) || 0, min_qty: parseFloat(form.min_qty) || 1,
        description: form.description, pricing_type: form.pricing_type,
        slabs: slabs.map(s => ({
          min_qty: parseFloat(s.min_qty) || 0,
          max_qty: s.max_qty ? parseFloat(s.max_qty) : 999999,
          rate: parseFloat(s.rate) || 0,
        })),
      };
      if (editing) await api.put(`/rate-card/${editing.id}`, payload);
      else await api.post('/rate-card', payload);
      setModal(false); load();
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Remove this rate?')) return;
    await api.delete(`/rate-card/${id}`);
    load();
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Rate Card</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Set prices per job type — used in auto price calculator at reception.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add job type
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Job Prices</span>
          <span className="text-label-sm text-on-surface-variant">{rates.length} types</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Job Type</th><th>Unit</th><th>Pricing</th><th className="text-right">Rate / Slabs</th><th>Description</th><th></th></tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id} className="group">
                  <td className="text-label-md text-on-surface font-semibold">{r.job_type}</td>
                  <td><span className="chip chip-gray">{UNIT_LABEL[r.unit] || r.unit}</span></td>
                  <td>
                    <span className={`chip ${r.pricing_type === 'slab' ? 'chip-purple' : 'chip-blue'}`}>
                      {r.pricing_type === 'slab' ? 'Slab' : 'Single'}
                    </span>
                  </td>
                  <td className="text-right">
                    {r.pricing_type === 'slab' && r.slabs && r.slabs.length > 0 ? (
                      <div className="flex flex-col items-end gap-xs">
                        {r.slabs.map(s => (
                          <span key={s.id} className="text-label-sm font-mono">
                            {s.min_qty}{s.max_qty < 999999 ? `–${s.max_qty}` : '+'} → ₹{s.rate}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-data-mono font-bold text-primary-container">₹{r.rate.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="text-body-sm text-on-surface-variant">{r.description || '—'}</td>
                  <td>
                    <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(r)} className="p-xs rounded hover:bg-surface-container text-outline hover:text-on-surface transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button onClick={() => del(r.id)} className="p-xs rounded hover:bg-error-container text-outline hover:text-error transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant text-body-sm">No rates configured</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Rate' : 'Add Job Type'}>
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Job type name *</label>
              <input name="job_type" value={form.job_type} onChange={handle} placeholder="e.g. Banner / Flex" required />
            </div>
            <div className="field">
              <label>Pricing unit *</label>
              <select name="unit" value={form.unit} onChange={handle}>
                {UNITS.map(u => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pricing type</label>
              <select name="pricing_type" value={form.pricing_type} onChange={handle}>
                <option value="single">Single rate</option>
                <option value="slab">Slab / bulk pricing</option>
              </select>
            </div>
          </div>

          {form.pricing_type === 'single' ? (
            <div className="form-grid">
              <div className="field">
                <label>Rate (₹) *</label>
                <input type="number" name="rate" value={form.rate} onChange={handle} placeholder="0" required min="0" step="0.5" />
              </div>
              {form.unit !== 'fixed' && (
                <div className="field">
                  <label>Minimum quantity</label>
                  <input type="number" name="min_qty" value={form.min_qty} onChange={handle} placeholder="1" min="1" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-sm">
              <div className="flex items-center justify-between">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Slabs</label>
                <button type="button" onClick={addSlab} className="btn btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add Slab
                </button>
              </div>
              {slabs.length === 0 && (
                <p className="text-label-sm text-on-surface-variant p-sm bg-surface-container rounded-lg">
                  No slabs yet. Click "Add Slab" — e.g. 1–9 pcs ₹250, 10–49 pcs ₹200, 50+ pcs ₹150
                </p>
              )}
              {slabs.map((s, i) => (
                <div key={i} className="flex items-center gap-sm p-sm bg-surface-container rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-sm">
                    <div className="field">
                      <label>Min qty</label>
                      <input type="number" value={s.min_qty} onChange={e => updateSlab(i, 'min_qty', e.target.value)} placeholder="1" min="0" />
                    </div>
                    <div className="field">
                      <label>Max qty (blank=∞)</label>
                      <input type="number" value={s.max_qty} onChange={e => updateSlab(i, 'max_qty', e.target.value)} placeholder="∞" min="0" />
                    </div>
                    <div className="field">
                      <label>Rate (₹/{form.unit === 'sq ft' ? 'sq ft' : 'pc'})</label>
                      <input type="number" value={s.rate} onChange={e => updateSlab(i, 'rate', e.target.value)} placeholder="0" min="0" step="0.5" />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeSlab(i)} className="text-error hover:bg-error-container p-xs rounded transition-colors mt-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <label>Description</label>
            <input name="description" value={form.description} onChange={handle} placeholder="Brief description for receptionist" />
          </div>

          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Saving…' : editing ? 'Update Rate' : 'Add Rate'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
