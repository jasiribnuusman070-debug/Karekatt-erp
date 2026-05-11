import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';
import Modal from './Modal';

const TABS = [
  { id: 'advances',    label: 'Advances',         icon: 'currency_rupee' },
  { id: 'leaves',      label: 'Leave Requests',   icon: 'event_busy' },
  { id: 'leaveconfig', label: 'Leave Config',      icon: 'tune' },
  { id: 'holidays',    label: 'Holidays',          icon: 'celebration' },
  { id: 'shifts',      label: 'Shifts',            icon: 'schedule' },
  { id: 'performance', label: 'Performance',       icon: 'star' },
  { id: 'salaryrev',   label: 'Salary Revisions',  icon: 'trending_up' },
  { id: 'exit',        label: 'Exit Records',      icon: 'logout' },
];

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const thisYear  = () => new Date().getFullYear();

// ── Advances ──────────────────────────────────────────────────────────────────
function Advances() {
  const [rows, setRows] = useState([]);
  const load = () => api.get('/hr/advances').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);

  const decide = async (id, action) => {
    await api.put(`/hr/advances/${id}/${action}`);
    load();
  };

  const pending  = rows.filter(r => r.status === 'Pending');
  const resolved = rows.filter(r => r.status !== 'Pending');

  return (
    <div className="flex flex-col gap-lg">
      {pending.length > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Pending Advance Requests</span>
            <span className="chip chip-amber">{pending.length} pending</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Staff</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.staff_name}</td>
                    <td><span className="font-mono text-data-mono font-bold text-primary-container">{fmt(r.amount)}</span></td>
                    <td className="text-body-sm text-on-surface-variant">{r.reason || '—'}</td>
                    <td className="text-label-sm text-on-surface-variant">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div className="flex gap-xs">
                        <button onClick={() => decide(r.id, 'approve')} className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                          <span className="material-symbols-outlined" style={{fontSize:14}}>check_circle</span> Approve
                        </button>
                        <button onClick={() => decide(r.id, 'reject')} className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                          <span className="material-symbols-outlined" style={{fontSize:14}}>cancel</span> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Advance History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Amount</th><th>Reason</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {resolved.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.staff_name}</td>
                  <td><span className="font-mono">{fmt(r.amount)}</span></td>
                  <td className="text-body-sm text-on-surface-variant">{r.reason || '—'}</td>
                  <td>
                    <span className={`chip ${r.status === 'Approved' ? 'chip-green' : 'chip-red'}`}>{r.status}</span>
                  </td>
                  <td className="text-label-sm text-on-surface-variant">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
              {resolved.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant text-body-sm">No resolved advances</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Leave Requests ────────────────────────────────────────────────────────────
function LeaveRequests() {
  const [rows, setRows] = useState([]);
  const load = () => api.get('/leaves').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);

  const decide = async (id, action) => {
    await api.put(`/leaves/${id}/${action}`);
    load();
  };

  const pending  = rows.filter(r => r.status === 'Pending');
  const resolved = rows.filter(r => r.status !== 'Pending');

  return (
    <div className="flex flex-col gap-lg">
      {pending.length > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Pending Leave Requests</span>
            <span className="chip chip-amber">{pending.length} pending</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Staff</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.staff_name}</td>
                    <td><span className="chip chip-blue">{r.leave_type}</span></td>
                    <td className="text-label-sm">{r.from_date}</td>
                    <td className="text-label-sm">{r.to_date}</td>
                    <td className="text-center font-mono font-bold">{r.days}</td>
                    <td className="text-body-sm text-on-surface-variant">{r.reason || r.notes || '—'}</td>
                    <td>
                      <div className="flex gap-xs">
                        <button onClick={() => decide(r.id, 'approve')} className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                          <span className="material-symbols-outlined" style={{fontSize:14}}>check_circle</span> Approve
                        </button>
                        <button onClick={() => decide(r.id, 'reject')} className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                          <span className="material-symbols-outlined" style={{fontSize:14}}>cancel</span> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Leave History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {resolved.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.staff_name}</td>
                  <td><span className="chip chip-blue">{r.leave_type}</span></td>
                  <td className="text-label-sm">{r.from_date}</td>
                  <td className="text-label-sm">{r.to_date}</td>
                  <td className="text-center font-mono">{r.days}</td>
                  <td><span className={`chip ${r.status === 'Approved' ? 'chip-green' : 'chip-red'}`}>{r.status}</span></td>
                </tr>
              ))}
              {resolved.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant text-body-sm">No leave history</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Leave Config ──────────────────────────────────────────────────────────────
function LeaveConfig() {
  const [staff, setStaff] = useState([]);
  const [balances, setBalances] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ casual_total: 12, sick_total: 6, earned_total: 15 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [sr, br] = await Promise.all([api.get('/staff'), api.get('/hr/leave-balances')]);
    setStaff(sr.data);
    const map = {};
    br.data.forEach(b => { map[b.staff_id] = b; });
    setBalances(map);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (s) => {
    setEditing(s);
    const b = balances[s.id] || {};
    setForm({ casual_total: b.casual_total || 12, sick_total: b.sick_total || 6, earned_total: b.earned_total || 15 });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/leaves/balance/${editing.id}`, { year: thisYear(), ...form });
      setEditing(null); load();
    } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="text-label-md text-on-surface font-semibold">Leave Balances by Staff</span>
        <span className="text-label-sm text-on-surface-variant">{thisYear()}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th className="text-center">Casual (used/total)</th>
              <th className="text-center">Sick (used/total)</th>
              <th className="text-center">Earned (used/total)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => {
              const b = balances[s.id] || {};
              return (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-center text-label-sm font-mono">{b.casual_used||0}/{b.casual_total||12}</td>
                  <td className="text-center text-label-sm font-mono">{b.sick_used||0}/{b.sick_total||6}</td>
                  <td className="text-center text-label-sm font-mono">{b.earned_used||0}/{b.earned_total||15}</td>
                  <td>
                    <button onClick={() => openEdit(s)} className="btn btn-sm">
                      <span className="material-symbols-outlined" style={{fontSize:14}}>edit</span> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal open={!!editing} onClose={() => setEditing(null)} title={`Leave Config — ${editing.name}`}>
          <div className="flex flex-col gap-md p-md">
            <div className="form-grid">
              {[['casual_total','Casual Leave Days'],['sick_total','Sick Leave Days'],['earned_total','Earned Leave Days']].map(([k,label]) => (
                <div key={k} className="field">
                  <label>{label}</label>
                  <input type="number" min="0" max="365"
                    value={form[k]}
                    onChange={e => setForm(f => ({...f, [k]: parseInt(e.target.value)||0}))} />
                </div>
              ))}
            </div>
            <button onClick={save} disabled={saving} className="btn-primary justify-center py-sm">
              {saving ? 'Saving…' : 'Save Limits'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Holidays ──────────────────────────────────────────────────────────────────
function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', type: 'Public' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/hr/holidays').then(r => setHolidays(r.data));
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/hr/holidays', form); setModal(false); load(); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Remove holiday?')) return;
    await api.delete(`/hr/holidays/${id}`); load();
  };

  const upcoming = holidays.filter(h => h.date >= new Date().toISOString().slice(0,10));
  const past     = holidays.filter(h => h.date  < new Date().toISOString().slice(0,10));

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => { setForm({ date:'', name:'', type:'Public' }); setModal(true); }}>
          <span className="material-symbols-outlined" style={{fontSize:18}}>add</span> Add Holiday
        </button>
      </div>

      {[['Upcoming', upcoming], ['Past', past]].map(([label, list]) => (
        <div key={label} className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">{label} Holidays</span>
            <span className="text-label-sm text-on-surface-variant">{list.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Holiday</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {list.map(h => (
                  <tr key={h.id}>
                    <td className="font-mono text-label-sm">{h.date}</td>
                    <td className="font-semibold">{h.name}</td>
                    <td><span className={`chip ${h.type==='Public' ? 'chip-blue' : 'chip-purple'}`}>{h.type}</span></td>
                    <td>
                      <button onClick={() => del(h.id)} className="p-xs rounded hover:bg-error-container text-outline hover:text-error transition-all">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={4} className="text-center py-lg text-on-surface-variant text-body-sm">None</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Holiday">
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="field"><label>Date *</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} required /></div>
          <div className="field"><label>Holiday Name *</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Eid Al-Fitr" /></div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
              <option value="Public">Public Holiday</option>
              <option value="Shop">Shop Holiday</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">{saving ? 'Saving…' : 'Add Holiday'}</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Shifts ────────────────────────────────────────────────────────────────────
function Shifts() {
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(null);

  const load = () => api.get('/staff').then(r => setStaff(r.data));
  useEffect(() => { load(); }, []);

  const setShift = async (s, shift) => {
    setSaving(s.id);
    try {
      await api.put(`/staff/${s.id}`, {
        name: s.name, role: s.role, phone: s.phone||'', salary: s.salary||0,
        join_date: s.join_date||'', annual_leave: s.annual_leave||12,
        advance: s.advance||0, status: s.status||'Present',
        present_days: s.present_days||0, absent_days: s.absent_days||0,
        employment_type: s.employment_type||'Full-time', shift,
      });
      load();
    } finally { setSaving(null); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="text-label-md text-on-surface font-semibold">Shift Assignment</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Staff</th><th>Role</th><th>Current Shift</th><th>Change</th></tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td className="font-semibold">{s.name}</td>
                <td className="text-body-sm text-on-surface-variant">{s.role}</td>
                <td>
                  <span className={`chip ${s.shift === 'Evening' ? 'chip-purple' : 'chip-blue'}`}>{s.shift || 'Morning'}</span>
                </td>
                <td>
                  <div className="flex gap-xs">
                    {['Morning','Evening','Split'].map(sh => (
                      <button key={sh} disabled={saving === s.id || (s.shift||'Morning') === sh}
                        onClick={() => setShift(s, sh)}
                        className={`btn btn-sm ${(s.shift||'Morning') === sh ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {sh}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && <tr><td colSpan={4} className="text-center py-xl text-on-surface-variant text-body-sm">No staff found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Performance Notes ─────────────────────────────────────────────────────────
function Performance() {
  const [notes, setNotes]   = useState([]);
  const [staff, setStaff]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ staff_id: '', month: thisMonth(), rating: '3', note: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const load = () => Promise.all([
    api.get('/hr/performance').then(r => setNotes(r.data)),
    api.get('/staff').then(r => setStaff(r.data)),
  ]);
  useEffect(() => { load(); }, []);

  const filtered = filter ? notes.filter(n => String(n.staff_id) === filter) : notes;

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    const [yr, mo] = (form.month || '').split('-');
    const sName = staff.find(s => String(s.id) === String(form.staff_id))?.name || '';
    try {
      await api.post('/hr/performance', {
        staff_id: form.staff_id, staff_name: sName,
        month: form.month, year: yr || new Date().getFullYear(),
        rating: parseInt(form.rating) || 3,
        notes: form.note,
      });
      setModal(false); load();
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete note?')) return;
    await api.delete(`/hr/performance/${id}`); load();
  };

  const stars = n => '★'.repeat(n) + '☆'.repeat(5-n);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => { setForm({ staff_id: staff[0]?.id||'', month: thisMonth(), rating:'3', note:'' }); setModal(true); }}>
          <span className="material-symbols-outlined" style={{fontSize:18}}>add</span> Add Note
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Performance Notes</span>
          <span className="text-label-sm text-on-surface-variant">{filtered.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Month</th><th>Rating</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {filtered.map(n => (
                <tr key={n.id}>
                  <td className="font-semibold">{n.staff_name || staff.find(s=>s.id===n.staff_id)?.name || '—'}</td>
                  <td className="text-label-sm font-mono">{n.month}</td>
                  <td className="text-amber-500 text-label-sm">{stars(n.rating)}</td>
                  <td className="text-body-sm text-on-surface-variant">{n.notes || n.note || '—'}</td>
                  <td>
                    <button onClick={() => del(n.id)} className="p-xs rounded hover:bg-error-container text-outline hover:text-error transition-all">
                      <span className="material-symbols-outlined" style={{fontSize:16}}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant text-body-sm">No notes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Performance Note">
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="form-grid">
            <div className="field">
              <label>Staff *</label>
              <select value={form.staff_id} onChange={e => setForm(f=>({...f,staff_id:e.target.value}))} required>
                <option value="">Select staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Month *</label>
              <input type="month" value={form.month} onChange={e => setForm(f=>({...f,month:e.target.value}))} required />
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Rating (1–5)</label>
              <div className="flex gap-sm mt-xs">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    onClick={() => setForm(f=>({...f,rating:String(n)}))}
                    className={`w-9 h-9 rounded-full font-bold text-sm transition-colors ${parseInt(form.rating)>=n ? 'bg-amber-400 text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Note</label>
              <textarea value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} rows={3} placeholder="Observation for this month…" className="resize-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">{saving ? 'Saving…' : 'Add Note'}</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Salary Revisions ──────────────────────────────────────────────────────────
function SalaryRevisions() {
  const [revisions, setRevisions] = useState([]);
  const [staff, setStaff]         = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ staff_id: '', new_salary: '', reason: '', effective_date: new Date().toISOString().slice(0,10) });
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('');

  const load = () => Promise.all([
    api.get('/hr/salary-revisions').then(r => setRevisions(r.data)),
    api.get('/staff').then(r => setStaff(r.data)),
  ]);
  useEffect(() => { load(); }, []);

  const filtered = filter ? revisions.filter(r => String(r.staff_id) === filter) : revisions;

  const openAdd = () => {
    const s0 = staff[0];
    setForm({ staff_id: s0?.id||'', new_salary: s0?.salary||'', reason: '', effective_date: new Date().toISOString().slice(0,10) });
    setModal(true);
  };

  const onStaffChange = id => {
    const s = staff.find(x => String(x.id) === String(id));
    setForm(f => ({...f, staff_id: id, new_salary: s?.salary||'' }));
  };

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/hr/salary-revisions', form); setModal(false); load(); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)} style={{maxWidth:200}}>
          <option value="">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex-1"/>
        <button className="btn-primary" onClick={openAdd}>
          <span className="material-symbols-outlined" style={{fontSize:18}}>trending_up</span> Revise Salary
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Salary Revision History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Old Salary</th><th>New Salary</th><th>Change</th><th>Reason</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map(r => {
                const diff = (r.new_salary||0) - (r.old_salary||0);
                return (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.staff_name || staff.find(s=>s.id===r.staff_id)?.name || '—'}</td>
                    <td className="font-mono text-label-sm">{fmt(r.old_salary)}</td>
                    <td className="font-mono font-bold text-label-sm text-primary-container">{fmt(r.new_salary)}</td>
                    <td>
                      <span className={`chip ${diff >= 0 ? 'chip-green' : 'chip-red'}`}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </span>
                    </td>
                    <td className="text-body-sm text-on-surface-variant">{r.reason || '—'}</td>
                    <td className="text-label-sm text-on-surface-variant">{r.effective_date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—')}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant text-body-sm">No revisions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Revise Salary">
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="form-grid">
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Staff *</label>
              <select value={form.staff_id} onChange={e => onStaffChange(e.target.value)} required>
                <option value="">Select staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} — current {fmt(s.salary)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>New Salary (₹/month) *</label>
              <input type="number" min="0" value={form.new_salary} onChange={e => setForm(f=>({...f,new_salary:e.target.value}))} required placeholder="Enter new salary" />
            </div>
            <div className="field">
              <label>Effective Date *</label>
              <input type="date" value={form.effective_date} onChange={e => setForm(f=>({...f,effective_date:e.target.value}))} required />
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Reason</label>
              <input value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))} placeholder="Annual increment, promotion, etc." />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">{saving ? 'Saving…' : 'Save Revision'}</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Exit Management ───────────────────────────────────────────────────────────
function ExitManagement() {
  const [exits, setExits]   = useState([]);
  const [staff, setStaff]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ staff_id:'', last_day:'', reason:'Resignation', settlement_amount:'', notes:'' });
  const [saving, setSaving] = useState(false);

  const load = () => Promise.all([
    api.get('/hr/exits').then(r => setExits(r.data)),
    api.get('/staff').then(r => setStaff(r.data)),
  ]);
  useEffect(() => { load(); }, []);

  const activeStaff = staff.filter(s => !exits.find(e => e.staff_id === s.id));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/hr/exits', form); setModal(false); load(); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => { setForm({ staff_id: activeStaff[0]?.id||'', last_day:'', reason:'Resignation', settlement_amount:'', notes:'' }); setModal(true); }}>
          <span className="material-symbols-outlined" style={{fontSize:18}}>add</span> Record Exit
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Exit Records</span>
          <span className="text-label-sm text-on-surface-variant">{exits.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Last Day</th><th>Reason</th><th>Settlement</th><th>Notes</th></tr></thead>
            <tbody>
              {exits.map(e => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.staff_name || staff.find(s=>s.id===e.staff_id)?.name || '—'}</td>
                  <td className="font-mono text-label-sm">{e.last_day}</td>
                  <td><span className="chip chip-gray">{e.reason}</span></td>
                  <td className="font-mono font-bold text-label-sm text-primary-container">{e.settlement_amount ? fmt(e.settlement_amount) : '—'}</td>
                  <td className="text-body-sm text-on-surface-variant">{e.notes || '—'}</td>
                </tr>
              ))}
              {exits.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant text-body-sm">No exit records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Staff Exit">
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="form-grid">
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Staff *</label>
              <select value={form.staff_id} onChange={e => setForm(f=>({...f,staff_id:e.target.value}))} required>
                <option value="">Select staff</option>
                {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Last Working Day *</label>
              <input type="date" value={form.last_day} onChange={e => setForm(f=>({...f,last_day:e.target.value}))} required />
            </div>
            <div className="field">
              <label>Exit Reason</label>
              <select value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}>
                {['Resignation','Termination','Retirement','Contract End','Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Settlement Amount (₹)</label>
              <input type="number" min="0" value={form.settlement_amount} onChange={e => setForm(f=>({...f,settlement_amount:e.target.value}))} placeholder="0" />
            </div>
            <div className="field" style={{gridColumn:'1/-1'}}>
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} className="resize-none" placeholder="Clearance checklist, handover notes…" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">{saving ? 'Saving…' : 'Record Exit'}</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Main HR Component ─────────────────────────────────────────────────────────
export default function HR() {
  const [tab, setTab] = useState('advances');

  const PANEL = {
    advances:    Advances,
    leaves:      LeaveRequests,
    leaveconfig: LeaveConfig,
    holidays:    Holidays,
    shifts:      Shifts,
    performance: Performance,
    salaryrev:   SalaryRevisions,
    exit:        ExitManagement,
  };

  const Panel = PANEL[tab] || Advances;

  return (
    <div className="page-wrap">
      <div>
        <h3 className="text-headline-md text-on-background font-semibold">HR Management</h3>
        <p className="text-body-sm text-on-surface-variant mt-xs">Leaves, advances, shifts, performance, and staff lifecycle.</p>
      </div>

      <div className="flex gap-xs overflow-x-auto pb-xs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm rounded-xl text-label-md font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <Panel />
    </div>
  );
}
