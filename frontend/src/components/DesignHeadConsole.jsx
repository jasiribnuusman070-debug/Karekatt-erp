import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge } from '../utils';
import { useAuth } from '../App';

const URGENCY_COLOR = { Normal: 'chip chip-gray', Urgent: 'chip chip-amber', Express: 'chip chip-red' };

export default function DesignHeadConsole() {
  const { user } = useAuth();
  const myFirstName = (user.staff_name || user.username || '').split(' ')[0];

  const [tab, setTab]               = useState('incoming');
  const [orders, setOrders]         = useState([]);
  const [staff, setStaff]           = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [assignForm, setAssignForm]   = useState({ designer_name: '', urgency: 'Normal' });
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving]           = useState(false);

  const load = async () => {
    const [ord, sf] = await Promise.all([api.get('/orders'), api.get('/staff')]);
    setOrders(ord.data);
    setStaff(sf.data.filter(s => s.role === 'Designer'));
  };
  useEffect(() => { load(); }, []);

  const incoming  = orders.filter(o => o.status === 'Confirmed' || (o.status === 'Received' && o.is_reprint));
  const inDesign  = orders.filter(o => o.status === 'In Design' && o.designer_name !== myFirstName);
  const myJobs    = orders.filter(o => o.status === 'In Design' && o.designer_name === myFirstName);
  const complete  = orders.filter(o => o.status === 'Design Complete');

  const today   = new Date().toISOString().slice(0, 10);
  const overdue = orders.filter(o => o.deadline && o.deadline < today && !['Design Approved','Ready','Delivered'].includes(o.status));

  const assign = async () => {
    if (!assignForm.designer_name) return alert('Select a designer or choose Assign to Myself.');
    setSaving(true);
    try {
      await api.put(`/orders/${assignModal.id}`, {
        action: 'assign',
        designer_name: assignForm.designer_name,
        urgency: assignForm.urgency,
      });
      setAssignModal(null);
      load();
    } finally { setSaving(false); }
  };

  const markComplete = async (id, notes) => {
    await api.put(`/orders/${id}`, { action: 'complete', design_notes: notes || '' });
    load();
  };

  const approve = async (id) => {
    await api.put(`/orders/${id}`, { action: 'approve' });
    setReviewModal(null);
    load();
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) return alert('Enter rejection reason.');
    await api.put(`/orders/${id}`, { action: 'reject', rejection_reason: rejectReason });
    setRejectReason('');
    setReviewModal(null);
    load();
  };

  const tabs = [
    { id: 'incoming', label: `Incoming (${incoming.length})`,          icon: 'inbox' },
    { id: 'myjobs',   label: myJobs.length > 0 ? `My Jobs ⚡${myJobs.length}` : 'My Jobs', icon: 'person' },
    { id: 'indesign', label: `Team (${inDesign.length})`,             icon: 'brush' },
    { id: 'review',   label: complete.length > 0 ? `Review ⚡${complete.length}` : 'Review', icon: 'rate_review' },
    { id: 'report',   label: 'Report',                                  icon: 'bar_chart' },
  ];

  const OrderRow = ({ o, action }) => (
    <tr className="group">
      <td className="font-mono text-primary-container text-data-mono">
        {o.order_id}
        {o.is_reprint ? <span className="ml-xs chip chip-amber text-[10px]">Reprint</span> : null}
      </td>
      <td>
        <p className="text-label-md text-on-surface font-semibold">{o.customer_name}</p>
        <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
      </td>
      <td>
        <p className="text-body-sm text-on-surface">{o.job_type}</p>
        <p className="text-label-sm text-on-surface-variant">{o.size}</p>
      </td>
      <td className={`text-body-sm ${o.deadline < today && o.status !== 'Delivered' ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{o.deadline || '—'}</td>
      <td><span className={URGENCY_COLOR[o.urgency] || 'chip chip-gray'}>{o.urgency}</span></td>
      <td className="text-right font-mono text-data-mono">{fmt(o.total_amount || o.amount)}</td>
      <td>{action}</td>
    </tr>
  );

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Design Head Console</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Assign jobs, review designs, approve for print.</p>
        </div>
        <div className="flex gap-sm">
          {[
            { label: 'Incoming',    val: incoming.length,  color: 'text-primary-container' },
            { label: 'My Jobs',     val: myJobs.length,    color: myJobs.length > 0 ? 'text-violet-600' : 'text-on-surface-variant' },
            { label: 'Team',        val: inDesign.length,  color: 'text-violet-600' },
            { label: 'Review',      val: complete.length,  color: complete.length > 0 ? 'text-amber-600' : 'text-on-surface-variant' },
            { label: 'Overdue',     val: overdue.length,   color: overdue.length > 0 ? 'text-error' : 'text-on-surface-variant' },
          ].map(m => (
            <div key={m.label} className="metric-card py-sm px-md text-center min-w-[80px]">
              <p className="metric-label">{m.label}</p>
              <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="p-sm bg-error-container/30 border border-error rounded-xl flex items-center gap-sm text-label-sm text-error">
          <span className="material-symbols-outlined" style={{fontSize:16}}>warning</span>
          {overdue.length} overdue: {overdue.map(o => o.order_id).join(', ')}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-xs border-b border-outline-variant">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            } ${(t.id === 'review' && complete.length > 0) || (t.id === 'myjobs' && myJobs.length > 0) ? 'text-amber-600' : ''}`}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* INCOMING */}
      {tab === 'incoming' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Confirmed Orders — Awaiting Assignment</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Deadline</th><th>Urgency</th><th className="text-right">Total</th><th>Action</th></tr></thead>
              <tbody>
                {incoming.map(o => (
                  <OrderRow key={o.id} o={o} action={
                    <button onClick={() => { setAssignModal(o); setAssignForm({ designer_name: '', urgency: o.urgency || 'Normal' }); }} className="btn btn-sm text-label-sm">
                      <span className="material-symbols-outlined" style={{fontSize:14}}>person_add</span> Assign
                    </button>
                  } />
                ))}
                {incoming.length === 0 && <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant text-body-sm">No confirmed orders waiting</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MY JOBS — self-assigned */}
      {tab === 'myjobs' && (
        <div className="flex flex-col gap-md">
          {myJobs.length > 0 && (
            <div className="p-sm bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-sm text-label-sm text-violet-700">
              <span className="material-symbols-outlined" style={{fontSize:16}}>person</span>
              {myJobs.length} job{myJobs.length > 1 ? 's' : ''} assigned to you — mark complete when design is done
            </div>
          )}
          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">My Design Jobs</span></div>
            {myJobs.length === 0 ? (
              <div className="p-xl text-center text-on-surface-variant text-body-sm">No self-assigned jobs. Assign a job to yourself from Incoming.</div>
            ) : (
              <div className="p-md grid gap-md">
                {myJobs.map(o => (
                  <MyJobCard key={o.id} o={o} today={today} onComplete={markComplete} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEAM IN DESIGN */}
      {tab === 'indesign' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Team Jobs In Design</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Deadline</th><th>Urgency</th><th className="text-right">Total</th><th>Designer</th></tr></thead>
              <tbody>
                {inDesign.map(o => (
                  <tr key={o.id} className={o.deadline < today ? 'bg-error-container/10' : ''}>
                    <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                    <td>
                      <p className="text-label-md text-on-surface font-semibold">{o.customer_name}</p>
                      {o.rejection_reason && <p className="text-label-sm text-error">↩ Rejected: {o.rejection_reason}</p>}
                    </td>
                    <td><p className="text-body-sm text-on-surface">{o.job_type}</p><p className="text-label-sm text-on-surface-variant">{o.size}</p></td>
                    <td className={`text-body-sm ${o.deadline < today ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{o.deadline || '—'}</td>
                    <td><span className={URGENCY_COLOR[o.urgency] || 'chip chip-gray'}>{o.urgency}</span></td>
                    <td className="text-right font-mono text-data-mono">{fmt(o.total_amount || o.amount)}</td>
                    <td><p className="text-label-md text-on-surface font-semibold">{o.designer_name || '—'}</p></td>
                  </tr>
                ))}
                {inDesign.length === 0 && <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant text-body-sm">No team jobs in design</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {tab === 'review' && (
        <div className="flex flex-col gap-md">
          {complete.length > 0 && (
            <div className="p-sm bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-sm text-label-sm text-amber-700">
              <span className="material-symbols-outlined" style={{fontSize:16}}>rate_review</span>
              {complete.length} design{complete.length > 1 ? 's' : ''} waiting for your review
            </div>
          )}
          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Design Complete — Awaiting Review</span></div>
            {complete.length === 0 ? (
              <div className="p-xl text-center text-on-surface-variant text-body-sm">No designs to review</div>
            ) : (
              <div className="p-md grid gap-md">
                {complete.map(o => (
                  <div key={o.id} className="border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-primary-container text-data-mono">{o.order_id}</span>
                        {o.designer_name === myFirstName && (
                          <span className="ml-sm chip chip-purple text-[10px]">Self-designed</span>
                        )}
                        <p className="text-label-md text-on-surface font-bold mt-xs">{o.customer_name}</p>
                        <p className="text-body-sm text-on-surface-variant">{o.job_type} — {o.size}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-label-sm text-on-surface-variant">Designer</p>
                        <p className="text-label-md text-on-surface font-semibold">{o.designer_name === myFirstName ? 'You' : o.designer_name}</p>
                      </div>
                    </div>
                    {o.design_notes && (
                      <div className="p-sm bg-surface-container rounded-lg text-body-sm text-on-surface">
                        <span className="text-on-surface-variant">Notes: </span>{o.design_notes}
                      </div>
                    )}
                    <div className="flex gap-sm pt-sm border-t border-outline-variant">
                      <button onClick={() => approve(o.id)} className="btn-primary flex-1 justify-center py-sm">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>verified</span> Approve → Print Queue
                      </button>
                      <button onClick={() => { setReviewModal(o); setRejectReason(''); }} className="btn btn-danger flex-1 justify-center py-sm">
                        <span className="material-symbols-outlined" style={{fontSize:16}}>cancel</span> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT */}
      {tab === 'report' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Designer Workload</span></div>
            <div className="p-md space-y-sm">
              {/* Design Head self stats */}
              {(() => {
                const active = orders.filter(o => o.designer_name === myFirstName && !['Design Approved','Ready','Delivered'].includes(o.status));
                return (
                  <div className="flex items-center justify-between p-sm rounded-lg bg-violet-50 border border-violet-200">
                    <div>
                      <p className="text-label-md text-on-surface font-semibold">{user.staff_name || 'You'} <span className="chip chip-purple text-[10px] ml-xs">Head</span></p>
                      <p className="text-label-sm text-on-surface-variant">{active.length} own · {orders.filter(o => o.status === 'Design Complete').length} pending approval</p>
                    </div>
                    <div className="flex gap-xs">
                      {active.slice(0, 3).map(o => <span key={o.id} className="chip chip-purple text-xs">{o.order_id}</span>)}
                      {active.length > 3 && <span className="chip chip-gray text-xs">+{active.length - 3}</span>}
                    </div>
                  </div>
                );
              })()}
              {staff.map(s => {
                const firstN = s.name.split(' ')[0];
                const active = orders.filter(o => o.designer_name === firstN && !['Design Approved','Ready','Delivered'].includes(o.status));
                const done   = orders.filter(o => o.designer_name === firstN && o.status === 'Design Approved');
                return (
                  <div key={s.id} className="flex items-center justify-between p-sm rounded-lg bg-surface-container">
                    <div>
                      <p className="text-label-md text-on-surface font-semibold">{s.name}</p>
                      <p className="text-label-sm text-on-surface-variant">{active.length} active · {done.length} approved</p>
                    </div>
                    <div className="flex gap-xs">
                      {active.slice(0, 3).map(o => <span key={o.id} className="chip chip-purple text-xs">{o.order_id}</span>)}
                      {active.length > 3 && <span className="chip chip-gray text-xs">+{active.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Pipeline</span></div>
            <div className="p-md space-y-sm">
              {[
                { label: 'Incoming (unassigned)',  val: incoming.length,              color: 'text-primary-container', icon: 'inbox' },
                { label: 'My jobs (in design)',    val: myJobs.length,                color: 'text-violet-600',        icon: 'person' },
                { label: 'Team in design',         val: inDesign.length,              color: 'text-violet-600',        icon: 'brush' },
                { label: 'Pending review',         val: complete.length,              color: 'text-amber-600',         icon: 'rate_review' },
                { label: 'Overdue',                val: overdue.length,               color: 'text-error',             icon: 'warning' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between p-sm rounded-lg bg-surface-container">
                  <div className="flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${m.color}`} style={{fontSize:18}}>{m.icon}</span>
                    <span className="text-body-sm text-on-surface">{m.label}</span>
                  </div>
                  <span className={`text-headline-sm font-bold ${m.color}`}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setAssignModal(null)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="text-headline-sm text-on-background font-semibold">Assign {assignModal.order_id}</h3>
              <button onClick={() => setAssignModal(null)} className="p-xs rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined" style={{fontSize:20}}>close</span>
              </button>
            </div>
            <div className="p-sm bg-surface-container rounded-lg mb-md text-body-sm">
              <p className="text-on-surface font-semibold">{assignModal.customer_name}</p>
              <p className="text-on-surface-variant">{assignModal.job_type} — {assignModal.size}</p>
            </div>
            <div className="flex flex-col gap-md">
              <div className="field">
                <label>Assign to</label>
                <select value={assignForm.designer_name} onChange={e => setAssignForm(f => ({...f, designer_name: e.target.value}))}>
                  <option value="">— Select —</option>
                  <option value="__self__">🙋 Assign to Myself ({user.staff_name || 'You'})</option>
                  {staff.map(s => <option key={s.id} value={s.name.split(' ')[0]}>{s.name}</option>)}
                </select>
              </div>
              {assignForm.designer_name === '__self__' && (
                <div className="p-sm bg-violet-50 border border-violet-200 rounded-lg text-label-sm text-violet-700">
                  Job will appear in your <strong>My Jobs</strong> tab. Mark complete when done → goes to Review.
                </div>
              )}
              <div className="field">
                <label>Set urgency</label>
                <select value={assignForm.urgency} onChange={e => setAssignForm(f => ({...f, urgency: e.target.value}))}>
                  {['Normal', 'Urgent', 'Express'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <button onClick={assign} disabled={saving} className="btn-primary justify-center py-sm">
                {saving ? 'Assigning…' : assignForm.designer_name === '__self__' ? 'Take Job Myself' : 'Assign & Start Design'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {reviewModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="text-headline-sm text-on-background font-semibold">Reject Design — {reviewModal.order_id}</h3>
              <button onClick={() => setReviewModal(null)} className="p-xs rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined" style={{fontSize:20}}>close</span>
              </button>
            </div>
            <div className="field mb-md">
              <label>Rejection reason (shown to designer)</label>
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Font size too small, wrong colour…" autoFocus />
            </div>
            <button onClick={() => reject(reviewModal.id)} className="btn btn-danger w-full justify-center py-sm">
              <span className="material-symbols-outlined" style={{fontSize:16}}>cancel</span> Reject & Send Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Job Card (for self-assigned) ─────────────────────────────────────────
function MyJobCard({ o, today, onComplete }) {
  const [notes, setNotes] = useState('');
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await onComplete(o.id, notes); }
    finally { setSaving(false); }
  };

  return (
    <div className="border border-violet-200 rounded-xl p-md flex flex-col gap-sm bg-violet-50/30">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-primary-container text-data-mono">{o.order_id}</span>
          <p className="text-label-md text-on-surface font-bold mt-xs">{o.customer_name}</p>
          <p className="text-body-sm text-on-surface-variant">{o.job_type} — {o.size}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-xs">
          <span className={`chip ${o.deadline < today ? 'chip-red' : 'chip-gray'}`}>{o.deadline || 'No deadline'}</span>
          <span className={`chip ${o.urgency === 'Express' ? 'chip-red' : o.urgency === 'Urgent' ? 'chip-amber' : 'chip-gray'}`}>{o.urgency}</span>
        </div>
      </div>
      {o.notes && <div className="p-sm bg-surface-container rounded-lg text-body-sm text-on-surface-variant">Notes: {o.notes}</div>}
      {o.rejection_reason && (
        <div className="p-sm bg-error-container/20 rounded-lg text-body-sm text-error">
          ↩ Rejected: {o.rejection_reason}
        </div>
      )}
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary justify-center py-sm">
          <span className="material-symbols-outlined" style={{fontSize:16}}>done_all</span> Mark Design Complete
        </button>
      ) : (
        <div className="flex flex-col gap-sm">
          <div className="field">
            <label>Design notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for review…" autoFocus />
          </div>
          <div className="flex gap-sm">
            <button onClick={submit} disabled={saving} className="btn-primary flex-1 justify-center py-sm">
              {saving ? 'Saving…' : 'Confirm Complete → Review'}
            </button>
            <button onClick={() => setOpen(false)} className="btn">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
