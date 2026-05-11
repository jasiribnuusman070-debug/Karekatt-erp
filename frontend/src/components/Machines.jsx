import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const EMPTY_M = { name: '', model: '', serial_no: '', purchase_date: '', last_service_date: '', next_service_due: '', status: 'OK' };
const STATUSES = ['OK', 'Breakdown', 'Maintenance', 'Retired'];
const MAINT_TYPES = ['Service', 'Repair', 'Breakdown', 'Inspection'];

export default function Machines() {
  const [tab, setTab] = useState('machines');
  const [machines, setMachines] = useState([]);
  const [log, setLog] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_M);
  const [mForm, setMForm] = useState({ machine_id: '', machine_name: '', type: 'Service', date: new Date().toISOString().slice(0, 10), description: '', cost: '', technician: '' });
  const [mModal, setMModal] = useState(false);

  const load = async () => {
    const [m, l] = await Promise.all([api.get('/machines'), api.get('/machines/maintenance')]);
    setMachines(m.data);
    setLog(l.data);
  };
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const mHandle = e => setMForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openEdit = m => { setForm(m || EMPTY_M); setModal(m ? 'edit' : 'add'); };
  const save = async () => {
    if (modal === 'edit') await api.put(`/machines/${form.id}`, form);
    else await api.post('/machines', form);
    setModal(null); setForm(EMPTY_M); load();
  };
  const del = async id => {
    if (!confirm('Delete machine?')) return;
    await api.delete(`/machines/${id}`);
    load();
  };

  const addLog = async () => {
    const { machine_id, type, date, description } = mForm;
    if (!machine_id || !type || !date || !description) return alert('Fill required fields');
    const mac = machines.find(m => m.id === parseInt(machine_id));
    await api.post('/machines/maintenance', { ...mForm, machine_name: mac?.name || '' });
    setMModal(false);
    setMForm(f => ({ ...f, machine_id: '', description: '', cost: '', technician: '' }));
    load();
  };
  const resolve = async id => {
    await api.put(`/machines/maintenance/${id}/resolve`);
    load();
  };
  const delLog = async id => {
    if (!confirm('Delete log entry?')) return;
    await api.delete(`/machines/maintenance/${id}`);
    load();
  };

  const alertColor = a => a === 'overdue' ? 'text-error' : a === 'due_soon' ? 'text-amber-600' : 'text-emerald-600';
  const alertIcon = a => a === 'overdue' ? 'warning' : a === 'due_soon' ? 'schedule' : 'check_circle';
  const alertLabel = a => a === 'overdue' ? 'Overdue' : a === 'due_soon' ? 'Due Soon' : 'OK';

  const statusChip = s => s === 'OK' ? 'chip-success' : s === 'Breakdown' ? 'chip-error' : 'chip-gray';

  const overdue = machines.filter(m => m.service_alert === 'overdue').length;
  const dueSoon = machines.filter(m => m.service_alert === 'due_soon').length;
  const breakdowns = machines.filter(m => m.status === 'Breakdown').length;

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Machines</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Equipment registry and maintenance log.</p>
        </div>
        <div className="flex gap-sm">
          {tab === 'machines' && <button onClick={() => openEdit(null)} className="btn-primary"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Add Machine</button>}
          {tab === 'log' && <button onClick={() => setMModal(true)} className="btn-primary"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>build</span> Log Maintenance</button>}
        </div>
      </div>

      {(overdue > 0 || breakdowns > 0) && (
        <div className="p-sm bg-error/10 border border-error/30 rounded-xl flex items-center gap-sm">
          <span className="material-symbols-outlined text-error">warning</span>
          <span className="text-label-md text-error font-semibold">
            {[breakdowns > 0 && `${breakdowns} breakdown${breakdowns > 1 ? 's' : ''}`, overdue > 0 && `${overdue} service overdue`].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      <div className="flex gap-xs border-b border-outline-variant">
        {[
          { id: 'machines', label: `Machines (${machines.length})`, icon: 'precision_manufacturing' },
          { id: 'log', label: `Maintenance Log (${log.length})`, icon: 'build' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'machines' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Machine</th><th>Model / Serial</th><th>Purchase Date</th><th>Last Service</th><th>Next Service</th><th>Alert</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m.id} className="group">
                    <td className="font-semibold text-on-surface">{m.name}</td>
                    <td>
                      <p className="text-body-sm text-on-surface">{m.model || '—'}</p>
                      <p className="text-label-sm text-on-surface-variant font-mono">{m.serial_no || ''}</p>
                    </td>
                    <td className="text-body-sm text-on-surface-variant">{m.purchase_date || '—'}</td>
                    <td className="text-body-sm text-on-surface-variant">{m.last_service_date || '—'}</td>
                    <td className="text-body-sm text-on-surface-variant">{m.next_service_due || '—'}</td>
                    <td>
                      {m.next_service_due ? (
                        <div className={`flex items-center gap-xs ${alertColor(m.service_alert)}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{alertIcon(m.service_alert)}</span>
                          <span className="text-label-sm font-semibold">{alertLabel(m.service_alert)}</span>
                        </div>
                      ) : <span className="text-on-surface-variant text-label-sm">—</span>}
                    </td>
                    <td><span className={`chip ${statusChip(m.status)}`}>{m.status}</span></td>
                    <td>
                      <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(m)} className="btn btn-sm">Edit</button>
                        <button onClick={() => del(m.id)} className="btn btn-sm text-error">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {machines.length === 0 && <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">No machines added</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Machine</th><th>Type</th><th>Description</th><th>Technician</th><th className="text-right">Cost</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {log.map(l => (
                  <tr key={l.id} className="group">
                    <td className="font-mono text-label-md text-primary-container">{l.date}</td>
                    <td className="font-semibold text-on-surface">{l.machine_name}</td>
                    <td><span className={`chip ${l.type === 'Breakdown' ? 'chip-error' : l.type === 'Service' ? 'chip-success' : 'chip-gray'}`}>{l.type}</span></td>
                    <td className="text-body-sm text-on-surface max-w-xs">{l.description}</td>
                    <td className="text-body-sm text-on-surface-variant">{l.technician || '—'}</td>
                    <td className="text-right font-mono font-semibold">{l.cost > 0 ? fmt(l.cost) : '—'}</td>
                    <td>
                      {l.resolved ? (
                        <span className="chip chip-success">Resolved</span>
                      ) : (
                        <button onClick={() => resolve(l.id)} className="btn btn-sm text-emerald-700">Mark Resolved</button>
                      )}
                    </td>
                    <td>
                      <button onClick={() => delLog(l.id)} className="opacity-0 group-hover:opacity-100 btn btn-sm text-error transition-opacity">Delete</button>
                    </td>
                  </tr>
                ))}
                {log.length === 0 && <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant">No maintenance logged</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Machine add/edit modal */}
      {modal && (
        <Modal title={modal === 'edit' ? 'Edit Machine' : 'Add Machine'} onClose={() => { setModal(null); setForm(EMPTY_M); }}>
          <div className="p-md flex flex-col gap-md">
            <div className="form-grid">
              {[
                { name: 'name', label: 'Machine Name *', placeholder: 'e.g. Roland UV Printer' },
                { name: 'model', label: 'Model', placeholder: 'Model number' },
                { name: 'serial_no', label: 'Serial No', placeholder: 'Serial number' },
                { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
                { name: 'last_service_date', label: 'Last Service Date', type: 'date' },
                { name: 'next_service_due', label: 'Next Service Due', type: 'date' },
              ].map(({ name, label, placeholder, type }) => (
                <div key={name} className="field">
                  <label>{label}</label>
                  <input type={type || 'text'} name={name} value={form[name] || ''} onChange={handle} placeholder={placeholder} />
                </div>
              ))}
              <div className="field">
                <label>Status</label>
                <select name="status" value={form.status || 'OK'} onChange={handle}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => { setModal(null); setForm(EMPTY_M); }} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={save} className="btn-primary flex-1 justify-center">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Maintenance log modal */}
      {mModal && (
        <Modal title="Log Maintenance" onClose={() => setMModal(false)}>
          <div className="p-md flex flex-col gap-md">
            <div className="form-grid">
              <div className="field">
                <label>Machine *</label>
                <select name="machine_id" value={mForm.machine_id} onChange={mHandle}>
                  <option value="">— Select machine —</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Type *</label>
                <select name="type" value={mForm.type} onChange={mHandle}>
                  {MAINT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>Date *</label><input type="date" name="date" value={mForm.date} onChange={mHandle} /></div>
              <div className="field"><label>Technician</label><input name="technician" value={mForm.technician} onChange={mHandle} placeholder="Name" /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Description *</label>
                <input name="description" value={mForm.description} onChange={mHandle} placeholder="What was done?" />
              </div>
              <div className="field">
                <label>Cost (₹)</label>
                <input type="number" name="cost" value={mForm.cost} onChange={mHandle} placeholder="0" min="0" step="0.01" />
                <p className="text-label-sm text-on-surface-variant mt-xs">Auto-added to expenses if &gt; 0</p>
              </div>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setMModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={addLog} className="btn-primary flex-1 justify-center">Save Log</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
