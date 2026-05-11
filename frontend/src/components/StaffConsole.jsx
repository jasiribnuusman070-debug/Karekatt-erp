import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge, initials } from '../utils';
import { useAuth } from '../App';
import Modal from './Modal';

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned'];

export default function StaffConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [advances, setAdvances] = useState([]);

  // Leave form
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', leave_type: 'Casual', reason: '', notes: '' });

  // Advance form
  const [advModal, setAdvModal] = useState(false);
  const [advForm, setAdvForm] = useState({ amount: '', reason: '' });

  // Change password
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');

  const load = async () => {
    const [p, l, bal, ord, adv] = await Promise.all([
      api.get('/staff/me'),
      api.get('/leaves'),
      api.get('/leaves/balance'),
      api.get('/orders'),
      api.get('/hr/advances'),
    ]);
    setProfile(p.data);
    setLeaves(l.data);
    setBalance(bal.data);
    setOrders(ord.data);
    setAdvances(adv.data);
    // Fetch attendance for this month
    try {
      const att = await api.get('/attendance');
      setAttendance(att.data || []);
    } catch {}
    try {
      const pay = await api.get('/payroll');
      setPayroll(pay.data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const applyLeave = async () => {
    if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason) return alert('Fill all required fields');
    await api.post('/leaves', leaveForm);
    setLeaveModal(false);
    setLeaveForm({ from_date: '', to_date: '', leave_type: 'Casual', reason: '', notes: '' });
    load();
  };

  const requestAdvance = async () => {
    if (!advForm.amount || !advForm.reason) return alert('Fill amount and reason');
    await api.post('/hr/advances', advForm);
    setAdvModal(false);
    setAdvForm({ amount: '', reason: '' });
    load();
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) return setPwErr('Passwords do not match');
    if (pwForm.new_password.length < 6) return setPwErr('Min 6 characters');
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwModal(false); setPwErr(''); setPwForm({ current_password: '', new_password: '', confirm: '' });
      alert('Password changed successfully');
    } catch (e) { setPwErr(e.response?.data?.error || 'Failed'); }
  };

  const staff = profile?.staff;
  const userRec = profile?.user;

  const myOrders = orders.filter(o => {
    const first = (user.staff_name || '').split(' ')[0];
    return o.designer_name === first || o.assigned_to === first;
  });

  const now = new Date();
  const myAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return a.staff_name === (user.staff_name || user.username) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const presentDays = myAttendance.filter(a => a.status === 'Present').length;
  const absentDays = myAttendance.filter(a => a.status === 'Absent').length;
  const lateDays = myAttendance.filter(a => a.status === 'Late').length;

  const tabs = [
    { id: 'profile',    label: 'My Profile',    icon: 'person' },
    { id: 'attendance', label: 'Attendance',    icon: 'event_available' },
    { id: 'leave',      label: 'Leave',         icon: 'event_busy' },
    { id: 'salary',     label: 'My Salary',     icon: 'payments' },
    { id: 'jobs',       label: `My Jobs (${myOrders.length})`, icon: 'work' },
  ];

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">My Console</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">{user.staff_name || user.username} — {user.role}</p>
        </div>
        <button onClick={() => setPwModal(true)} className="btn">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span> Change Password
        </button>
      </div>

      <div className="flex gap-xs border-b border-outline-variant overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <div className="card p-lg">
            <div className="flex items-center gap-lg mb-lg">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-2xl">
                {initials(user.staff_name || user.username)}
              </div>
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">{user.staff_name || user.username}</h3>
                <p className="text-body-sm text-on-surface-variant">{staff?.role || user.role}</p>
                <p className="text-label-sm font-mono text-on-surface-variant mt-xs">@{userRec?.username || user.username}</p>
              </div>
            </div>
            <div className="space-y-sm">
              {[
                { icon: 'phone', label: 'Phone', val: staff?.phone || '—' },
                { icon: 'calendar_today', label: 'Joined', val: staff?.join_date || '—' },
                { icon: 'work', label: 'Employment', val: staff?.employment_type || 'Full-time' },
                { icon: 'schedule', label: 'Shift', val: staff?.shift || 'Morning' },
                { icon: 'event_busy', label: 'Leave balance', val: staff?.annual_leave ? `${staff.annual_leave - (staff.leave_used || 0)} days remaining` : '—' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-sm p-sm bg-surface-container rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{r.icon}</span>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">{r.label}</p>
                    <p className="text-label-md text-on-surface font-semibold">{r.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-lg">
            <h4 className="text-label-md font-semibold text-on-surface mb-md">This Month</h4>
            <div className="grid grid-cols-3 gap-sm">
              {[
                { label: 'Present', val: presentDays || staff?.present_days || 0, color: 'text-emerald-600' },
                { label: 'Absent', val: absentDays || staff?.absent_days || 0, color: 'text-error' },
                { label: 'Leave used', val: staff?.leave_used || 0, color: 'text-amber-600' },
              ].map(m => (
                <div key={m.label} className="metric-card text-center">
                  <p className="metric-label">{m.label}</p>
                  <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
                </div>
              ))}
            </div>
            {staff && (
              <div className="mt-md p-sm bg-surface-container rounded-lg">
                <p className="text-label-sm text-on-surface-variant">Pending advance</p>
                <p className="text-label-md font-bold text-error">{fmt(staff.advance || 0)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Attendance — {now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
            <span className="text-label-sm text-on-surface-variant">{presentDays} present · {absentDays} absent · {lateDays} late</span>
          </div>
          {myAttendance.length === 0 ? (
            <div className="p-xl text-center text-on-surface-variant text-body-sm">
              No attendance records for this month.<br />Contact admin if this seems incorrect.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>
                  {myAttendance.map(a => (
                    <tr key={a.id}>
                      <td className="font-mono text-label-md text-primary-container">{a.date}</td>
                      <td className="text-body-sm text-on-surface">{a.check_in || '—'}</td>
                      <td className="text-body-sm text-on-surface">{a.check_out || '—'}</td>
                      <td><Badge s={a.status} /></td>
                      <td className="text-body-sm text-on-surface-variant">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LEAVE */}
      {tab === 'leave' && (
        <div className="flex flex-col gap-md">
          <div className="flex justify-end">
            <button onClick={() => setLeaveModal(true)} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Apply Leave
            </button>
          </div>

          {/* Leave balance */}
          {balance && (
            <div className="grid grid-cols-3 gap-md">
              {[
                { label: 'Casual Leave', data: balance.casual, color: 'text-primary-container' },
                { label: 'Sick Leave', data: balance.sick, color: 'text-amber-600' },
                { label: 'Earned Leave', data: balance.earned, color: 'text-emerald-600' },
              ].map(b => (
                <div key={b.label} className="metric-card">
                  <p className="metric-label">{b.label}</p>
                  <p className={`text-display-lg font-bold ${b.color}`}>{b.data.remaining}</p>
                  <p className="text-label-sm text-on-surface-variant">of {b.data.total} remaining</p>
                  <div className="progress-bar-wrap mt-sm">
                    <div className="progress-bar" style={{ width: `${Math.max(0, (b.data.remaining / b.data.total) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Leave History</span></div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id}>
                      <td><span className="chip chip-gray">{l.leave_type || 'Casual'}</span></td>
                      <td className="font-mono text-label-md">{l.from_date}</td>
                      <td className="font-mono text-label-md">{l.to_date}</td>
                      <td className="text-body-sm">{l.days || 1}</td>
                      <td className="text-body-sm text-on-surface-variant">{l.reason}</td>
                      <td><Badge s={l.status} /></td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">No leave requests</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SALARY */}
      {tab === 'salary' && (
        <div className="flex flex-col gap-md">
          <div className="flex justify-end">
            <button onClick={() => setAdvModal(true)} className="btn">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>request_quote</span> Request Advance
            </button>
          </div>

          {staff && (
            <div className="card p-lg">
              <h4 className="text-label-md font-semibold text-on-surface-variant mb-md uppercase tracking-wider">Current Month Estimate</h4>
              <div className="space-y-sm">
                {[
                  { label: 'Basic Salary', val: staff.salary || 0, color: '' },
                  { label: 'Deduction (absents)', val: -(((staff.salary || 0) / 26) * (staff.absent_days || 0)), color: 'text-error' },
                  { label: 'Advance pending', val: -(staff.advance || 0), color: 'text-error' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">{r.label}</span>
                    <span className={`font-mono font-semibold ${r.color}`}>{r.val >= 0 ? fmt(r.val) : `− ${fmt(Math.abs(r.val))}`}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-sm border-t-2 border-outline-variant">
                  <span className="text-label-md font-bold text-on-surface">Net Pay (estimate)</span>
                  <span className="text-headline-sm font-bold text-primary-container">
                    {fmt(Math.max(0, (staff.salary || 0) - (((staff.salary || 0) / 26) * (staff.absent_days || 0)) - (staff.advance || 0)))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {advances.length > 0 && (
            <div className="card">
              <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Advance Requests</span></div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Date</th><th className="text-right">Amount</th><th>Reason</th><th>Status</th></tr></thead>
                  <tbody>
                    {advances.map(a => (
                      <tr key={a.id}>
                        <td className="font-mono text-label-md text-primary-container">{a.created_at?.slice(0, 10)}</td>
                        <td className="text-right font-mono font-semibold">{fmt(a.amount)}</td>
                        <td className="text-body-sm text-on-surface-variant">{a.reason}</td>
                        <td><Badge s={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MY JOBS */}
      {tab === 'jobs' && (
        <div className="card">
          <div className="card-head"><span className="text-label-md text-on-surface font-semibold">My Assigned Jobs</span></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                {myOrders.map(o => (
                  <tr key={o.id}>
                    <td className="font-mono text-primary-container text-label-md">{o.order_id}</td>
                    <td className="font-semibold text-on-surface">{o.customer_name}</td>
                    <td><p className="text-body-sm text-on-surface">{o.job_type}</p><p className="text-label-sm text-on-surface-variant">{o.size}</p></td>
                    <td className="text-body-sm text-on-surface-variant">{o.deadline || '—'}</td>
                    <td><Badge s={o.status} /></td>
                  </tr>
                ))}
                {myOrders.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">No jobs assigned</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply leave modal */}
      {leaveModal && (
        <Modal title="Apply for Leave" onClose={() => setLeaveModal(false)}>
          <div className="p-md flex flex-col gap-md">
            <div className="form-grid">
              <div className="field"><label>Leave type</label>
                <select value={leaveForm.leave_type} onChange={e => setLeaveForm(f => ({ ...f, leave_type: e.target.value }))}>
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>From date *</label>
                <input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm(f => ({ ...f, from_date: e.target.value }))} />
              </div>
              <div className="field"><label>To date *</label>
                <input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm(f => ({ ...f, to_date: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Reason *</label>
                <input value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave" />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Additional notes</label>
                <input value={leaveForm.notes} onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setLeaveModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={applyLeave} className="btn-primary flex-1 justify-center">Submit Request</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Advance request modal */}
      {advModal && (
        <Modal title="Request Salary Advance" onClose={() => setAdvModal(false)}>
          <div className="p-md flex flex-col gap-md">
            <div className="field"><label>Amount (₹) *</label>
              <input type="number" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" />
            </div>
            <div className="field"><label>Reason *</label>
              <input value={advForm.reason} onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why do you need the advance?" />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setAdvModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={requestAdvance} className="btn-primary flex-1 justify-center">Submit Request</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change password modal */}
      {pwModal && (
        <Modal title="Change Password" onClose={() => setPwModal(false)}>
          <div className="p-md flex flex-col gap-md">
            <div className="field"><label>Current password</label>
              <input type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
            </div>
            <div className="field"><label>New password (min 6 chars)</label>
              <input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
            </div>
            <div className="field"><label>Confirm new password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            {pwErr && <p className="text-error text-label-sm">{pwErr}</p>}
            <div className="flex gap-sm">
              <button onClick={() => setPwModal(false)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={changePassword} className="btn-primary flex-1 justify-center">Change Password</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
