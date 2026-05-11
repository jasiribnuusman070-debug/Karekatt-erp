import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge, initials } from '../utils';
import Modal from './Modal';

const ROLES = ['Designer', 'Press Operator', 'Finishing', 'Counter / Reception', 'Delivery', 'Admin'];
const LOGIN_ROLES = ['staff', 'designer', 'receptionist', 'print_dept', 'design_head'];
const SHIFTS = ['Morning', 'Evening', 'Night', 'Flexible'];
const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const EMPTY = { name: '', role: 'Designer', phone: '', salary: '', join_date: '', annual_leave: '12', employment_type: 'Full-time', shift: 'Morning', username: '', temp_password: '', login_role: 'staff' };

function printCredentialSlip(staff, username, password) {
  const url = window.location.origin;
  const win = window.open('', '_blank', 'width=400,height=500');
  win.document.write(`<!DOCTYPE html><html><head><title>Login Slip</title>
  <style>
    body { font-family: Arial; margin: 0; padding: 20px; background: #fff; }
    .box { border: 2px solid #213145; border-radius: 8px; padding: 20px; max-width: 300px; margin: auto; }
    h2 { text-align: center; font-size: 14px; color: #213145; margin: 0 0 4px; }
    .sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; border-bottom: 1px dashed #ccc; padding-bottom: 12px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .label { color: #666; }
    .val { font-weight: bold; color: #213145; font-family: monospace; }
    .warn { margin-top: 16px; padding: 8px; background: #fff8e1; border: 1px solid #f59e0b; border-radius: 4px; font-size: 11px; color: #92400e; text-align: center; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <div class="box">
    <h2>KAREKAT PRINTS ERP</h2>
    <div class="sub">Staff Login Details</div>
    <div class="row"><span class="label">Name:</span><span class="val">${staff.name}</span></div>
    <div class="row"><span class="label">Role:</span><span class="val">${staff.role}</span></div>
    <div class="row"><span class="label">Username:</span><span class="val">${username}</span></div>
    <div class="row"><span class="label">Password:</span><span class="val">${password}</span></div>
    <div class="row"><span class="label">URL:</span><span class="val" style="font-size:10px">${url}</span></div>
    <div class="warn">⚠ Change password on first login!</div>
  </div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [newCred, setNewCred] = useState(null); // { staff, username, password } after creation
  const [resetModal, setResetModal] = useState(null); // staff record
  const [resetPw, setResetPw] = useState('');
  const [roleModal, setRoleModal] = useState(null);
  const [newLoginRole, setNewLoginRole] = useState('staff');

  const load = () => api.get('/staff').then(r => setStaff(r.data));
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const uname = (form.username || form.name.split(' ')[0]).toLowerCase().replace(/\s+/g, '');
      const pw = form.temp_password || `${form.name.split(' ')[0].toLowerCase()}@123`;
      const r = await api.post('/staff', {
        ...form,
        salary: parseFloat(form.salary) || 0,
        annual_leave: parseInt(form.annual_leave) || 12,
        username: uname,
        temp_password: pw,
      });
      setModal(false);
      setNewCred({ staff: { ...form }, username: r.data.username || uname, password: r.data.temp_password || pw });
      setForm(EMPTY);
      load();
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Remove this staff member?')) return;
    await api.delete(`/staff/${id}`);
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const resetPassword = async () => {
    if (!resetPw || resetPw.length < 4) return alert('Password too short');
    await api.post(`/staff/${resetModal.id}/reset-password`, { new_password: resetPw });
    setNewCred({ staff: resetModal, username: resetModal.user?.username || resetModal.name.split(' ')[0].toLowerCase(), password: resetPw });
    setResetModal(null); setResetPw('');
  };

  const toggleActive = async (s) => {
    const action = s.user?.is_active === 0 ? 'activate' : 'deactivate';
    if (!confirm(`${action === 'deactivate' ? 'Deactivate' : 'Activate'} ${s.name}'s account?`)) return;
    await api.post(`/staff/${s.id}/${action}`);
    load();
  };

  const changeRole = async () => {
    await api.post(`/staff/${roleModal.id}/change-role`, { login_role: newLoginRole });
    setRoleModal(null); load();
  };

  const waCredSlip = (cred) => {
    const url = window.location.origin;
    const msg = `Karekat ERP Login:\nUsername: ${cred.username}\nPassword: ${cred.password}\nURL: ${url}\n\nPlease change your password after first login.`;
    const phone = cred.staff.phone?.replace(/\D/g, '');
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    else alert('No phone number on file');
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Staff Directory</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Manage team members, credentials, and access.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Add staff
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
        {[
          { label: 'Total Staff', value: staff.length, icon: 'group', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Present', value: staff.filter(s => s.status === 'Present').length, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'On Leave', value: staff.filter(s => s.status === 'Leave').length, icon: 'event_busy', color: 'text-amber-600', bg: 'bg-amber-100' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {staff.map(s => (
          <div key={s.id} className={`card p-lg flex flex-col gap-sm ${s.user?.is_active === 0 ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-md">
              <div className="avatar text-base">{initials(s.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-label-md text-on-surface font-semibold truncate">{s.name}</p>
                <p className="text-label-sm text-on-surface-variant">{s.role}</p>
                {s.user && (
                  <p className="text-label-sm text-on-surface-variant font-mono">@{s.user.username}
                    {s.user.must_change_password ? <span className="ml-xs chip chip-amber text-[10px]">Must change pw</span> : null}
                    {s.user.is_active === 0 ? <span className="ml-xs chip chip-error text-[10px]">Inactive</span> : null}
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-outline-variant pt-sm space-y-xs">
              <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>phone</span>{s.phone || '—'}
              </div>
              <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>{fmt(s.salary)}/mo
              </div>
              <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>{s.shift || 'Morning'} · {s.employment_type || 'Full-time'}
              </div>
              {s.user && <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>manage_accounts</span>
                Login role: <span className="font-semibold">{s.user.role}</span>
              </div>}
            </div>
            <div className="flex flex-wrap items-center gap-xs pt-xs border-t border-outline-variant">
              <Badge s={s.status} />
              <button onClick={() => { setResetModal(s); setResetPw(''); }} className="btn btn-sm text-label-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>lock_reset</span> Reset pw
              </button>
              <button onClick={() => { setRoleModal(s); setNewLoginRole(s.user?.role || 'staff'); }} className="btn btn-sm text-label-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>manage_accounts</span> Role
              </button>
              <button onClick={() => toggleActive(s)} className={`btn btn-sm text-label-sm ${s.user?.is_active === 0 ? 'text-emerald-700' : 'text-error'}`}>
                {s.user?.is_active === 0 ? 'Activate' : 'Deactivate'}
              </button>
              <button onClick={() => del(s.id)} className="btn btn-sm text-error">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>delete</span>
              </button>
            </div>
          </div>
        ))}
        {staff.length === 0 && <div className="col-span-3 text-center py-xl text-on-surface-variant text-body-sm">No staff added yet</div>}
      </div>

      {/* Add staff modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Staff Member">
        <form onSubmit={submit} className="flex flex-col gap-md p-md">
          <div className="form-grid">
            <div className="field"><label>Full name *</label><input name="name" value={form.name} onChange={handle} placeholder="Full name" required /></div>
            <div className="field"><label>Job role</label>
              <select name="role" value={form.role} onChange={handle}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
            </div>
            <div className="field"><label>Phone</label><input name="phone" value={form.phone} onChange={handle} placeholder="Phone number" /></div>
            <div className="field"><label>Monthly salary (₹)</label><input type="number" name="salary" value={form.salary} onChange={handle} placeholder="0" /></div>
            <div className="field"><label>Join date</label><input type="date" name="join_date" value={form.join_date} onChange={handle} /></div>
            <div className="field"><label>Annual leave days</label><input type="number" name="annual_leave" value={form.annual_leave} onChange={handle} /></div>
            <div className="field"><label>Employment type</label>
              <select name="employment_type" value={form.employment_type} onChange={handle}>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div className="field"><label>Shift</label>
              <select name="shift" value={form.shift} onChange={handle}>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
          </div>

          <div className="p-sm bg-surface-container rounded-lg">
            <p className="text-label-md text-on-surface font-semibold mb-sm">Login Credentials</p>
            <div className="form-grid">
              <div className="field"><label>Username (auto from name if blank)</label><input name="username" value={form.username} onChange={handle} placeholder="e.g. arun" /></div>
              <div className="field"><label>Temp password (auto if blank)</label><input name="temp_password" value={form.temp_password} onChange={handle} placeholder="e.g. arun@123" /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Login role</label>
                <select name="login_role" value={form.login_role} onChange={handle}>
                  {LOGIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-sm">Staff must change password on first login.</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary justify-center py-sm">
            {saving ? 'Adding…' : 'Add Staff Member'}
          </button>
        </form>
      </Modal>

      {/* Credential slip modal */}
      {newCred && (
        <Modal title="Staff Credentials Created" onClose={() => setNewCred(null)}>
          <div className="p-md flex flex-col gap-md">
            <div className="p-md bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                {[['Name', newCred.staff.name], ['Username', newCred.username], ['Password', newCred.password], ['URL', window.location.origin]].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-on-surface-variant text-label-sm">{l}</p>
                    <p className="font-mono font-semibold text-on-surface">{v}</p>
                  </div>
                ))}
              </div>
              <p className="text-label-sm text-amber-700 mt-sm">Staff must change password on first login.</p>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => printCredentialSlip(newCred.staff, newCred.username, newCred.password)} className="btn flex-1 justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> Print Slip
              </button>
              <button onClick={() => waCredSlip(newCred)} className="btn flex-1 justify-center text-emerald-700">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span> WhatsApp
              </button>
              <button onClick={() => setNewCred(null)} className="btn-primary flex-1 justify-center">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <Modal title={`Reset Password — ${resetModal.name}`} onClose={() => setResetModal(null)}>
          <div className="p-md flex flex-col gap-md">
            <div className="field">
              <label>New temporary password</label>
              <input value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Min 4 characters" />
            </div>
            <p className="text-label-sm text-on-surface-variant">Staff will be forced to change password on next login.</p>
            <div className="flex gap-sm">
              <button onClick={() => setResetModal(null)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={resetPassword} className="btn-primary flex-1 justify-center">Reset Password</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change role modal */}
      {roleModal && (
        <Modal title={`Login Role — ${roleModal.name}`} onClose={() => setRoleModal(null)}>
          <div className="p-md flex flex-col gap-md">
            <div className="field">
              <label>Login role (controls which console they see)</label>
              <select value={newLoginRole} onChange={e => setNewLoginRole(e.target.value)}>
                {LOGIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setRoleModal(null)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={changeRole} className="btn-primary flex-1 justify-center">Update Role</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
