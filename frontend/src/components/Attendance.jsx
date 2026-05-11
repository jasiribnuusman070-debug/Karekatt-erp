import { useState, useEffect } from 'react';
import api from '../api';
import { Badge, monthLabel } from '../utils';
import Modal from './Modal';

const WDAYS = 22;

export default function Attendance() {
  const [staff, setStaff] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ staff_name: '', from_date: '', to_date: '', reason: '' });
  const [marking, setMarking] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const load = async () => {
    const [s, l] = await Promise.all([
      api.get('/attendance').then(r => r.data),
      api.get('/attendance/leaves').then(r => r.data),
    ]);
    setStaff(s); setLeaves(l);
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    setMarking(true);
    try { await api.post('/attendance/mark-all'); load(); }
    finally { setMarking(false); }
  };

  const updateAttendance = async (s, field, val) => {
    const updated = { ...s, [field]: parseInt(val) || 0 };
    await api.put(`/attendance/staff/${s.id}`, {
      present_days: updated.present_days,
      absent_days: updated.absent_days,
      leave_used: updated.leave_used,
      advance: updated.advance,
      status: updated.status,
    });
    setStaff(prev => prev.map(x => x.id === s.id ? { ...x, [field]: parseInt(val) || 0 } : x));
  };

  const updateStatus = async (s, status) => {
    await api.put(`/attendance/staff/${s.id}`, { present_days: s.present_days, absent_days: s.absent_days, leave_used: s.leave_used, advance: s.advance, status });
    setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status } : x));
  };

  const approveLeave = async (id, status) => {
    await api.put(`/attendance/leaves/${id}`, { status });
    load();
  };

  const submitLeave = async e => {
    e.preventDefault();
    await api.post('/attendance/leaves', leaveForm);
    setShowLeaveModal(false);
    setLeaveForm({ staff_name: '', from_date: '', to_date: '', reason: '' });
    load();
  };

  const present = staff.filter(s => s.status === 'Present').length;
  const onLeave = staff.filter(s => s.status === 'Leave').length;

  return (
    <div className="page-wrap">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Attendance — {monthLabel()}</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Track daily presence and leave requests.</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn" onClick={() => setShowLeaveModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_busy</span> Leave request
          </button>
          <button className="btn-primary" onClick={markAll} disabled={marking}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
            {marking ? 'Marking…' : 'Mark all present'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {[
          { label: 'Total Staff', value: staff.length, icon: 'group', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Present Today', value: present, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'On Leave', value: onLeave, icon: 'event_busy', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Leave Requests', value: leaves.filter(l => l.status === 'Pending').length, icon: 'pending_actions', color: 'text-on-surface-variant', bg: 'bg-surface-container' },
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
          <span className="text-label-md text-on-surface font-semibold">Monthly summary ({WDAYS} working days)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Staff</th><th>Role</th><th>Present</th><th>Absent</th><th>Leave</th><th>Today</th><th>Attendance %</th></tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const pct = Math.round((s.present_days / WDAYS) * 100);
                const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-error';
                const txtColor = pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-error';
                return (
                  <tr key={s.id}>
                    <td className="text-label-md text-on-surface font-semibold">{s.name}</td>
                    <td className="text-body-sm text-on-surface-variant">{s.role}</td>
                    <td>
                      <input
                        type="number"
                        defaultValue={s.present_days}
                        className="w-16 px-xs py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container"
                        onBlur={e => updateAttendance(s, 'present_days', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={s.absent_days}
                        className="w-16 px-xs py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container"
                        onBlur={e => updateAttendance(s, 'absent_days', e.target.value)}
                      />
                    </td>
                    <td><span className="chip chip-amber">{s.leave_used}</span></td>
                    <td>
                      <select
                        className="chip chip-gray border-0 bg-transparent cursor-pointer text-label-sm font-bold"
                        value={s.status}
                        onChange={e => updateStatus(s, e.target.value)}
                      >
                        <option>Present</option>
                        <option>Absent</option>
                        <option>Leave</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-label-sm font-semibold min-w-[36px] ${txtColor}`}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant text-body-sm">No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">Leave requests</span>
          <span className="text-label-sm text-on-surface-variant">{leaves.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Staff</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id}>
                  <td className="text-label-md text-on-surface font-semibold">{l.staff_name}</td>
                  <td className="text-body-sm text-on-surface-variant">{l.from_date}</td>
                  <td className="text-body-sm text-on-surface-variant">{l.to_date}</td>
                  <td className="text-body-sm text-on-surface-variant">{l.reason}</td>
                  <td><Badge s={l.status} /></td>
                  <td>
                    {l.status === 'Pending' ? (
                      <div className="flex items-center gap-xs">
                        <button onClick={() => approveLeave(l.id, 'Approved')} className="btn btn-sm text-label-sm">Approve</button>
                        <button onClick={() => approveLeave(l.id, 'Rejected')} className="btn btn-sm btn-danger text-label-sm">Reject</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant text-body-sm">No leave requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Leave request">
        <form onSubmit={submitLeave} className="flex flex-col gap-md">
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Staff name</label>
              <select value={leaveForm.staff_name} onChange={e => setLeaveForm(f => ({ ...f, staff_name: e.target.value }))} required>
                <option value="">— Select staff —</option>
                {staff.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field"><label>From date</label><input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm(f => ({ ...f, from_date: e.target.value }))} required /></div>
            <div className="field"><label>To date</label><input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm(f => ({ ...f, to_date: e.target.value }))} required /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Reason</label>
              <input value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave" />
            </div>
          </div>
          <button type="submit" className="btn-primary justify-center py-sm">Submit request</button>
        </form>
      </Modal>
    </div>
  );
}
