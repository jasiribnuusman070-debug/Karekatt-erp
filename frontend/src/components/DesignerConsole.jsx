import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge } from '../utils';
import { useAuth } from '../App';

export default function DesignerConsole() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [completeModal, setCompleteModal] = useState(null);
  const [designNotes, setDesignNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/orders').then(r => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const myName = user.staff_name || user.username;
  const today = new Date().toISOString().slice(0, 10);

  const active   = orders.filter(o => o.status === 'In Design');
  const complete = orders.filter(o => o.status === 'Design Complete');

  const markComplete = async () => {
    setSaving(true);
    try {
      await api.put(`/orders/${completeModal.id}`, { action: 'complete', design_notes: designNotes });
      setCompleteModal(null);
      setDesignNotes('');
      load();
    } finally { setSaving(false); }
  };

  const URGENCY_BG = { Normal: 'bg-surface-container', Urgent: 'bg-amber-50 border-amber-200', Express: 'bg-red-50 border-red-200' };
  const URGENCY_BADGE = { Normal: 'chip chip-gray', Urgent: 'chip chip-amber', Express: 'chip chip-red' };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">My Design Jobs</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Hi {myName.split(' ')[0]} — your active assignments.</p>
        </div>
        <div className="flex gap-sm">
          {[
            { label: 'Active', val: active.length, color: 'text-violet-600' },
            { label: 'Submitted', val: complete.length, color: 'text-primary-container' },
          ].map(m => (
            <div key={m.label} className="metric-card py-sm px-md text-center min-w-[80px]">
              <p className="metric-label">{m.label}</p>
              <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {active.length === 0 && complete.length === 0 && (
        <div className="card p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl block mb-md">brush</span>
          <p className="text-label-md text-on-surface-variant">No jobs assigned yet. Check back later.</p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h4 className="text-label-md text-on-surface-variant font-semibold tracking-widest uppercase">Active Jobs</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {active.map(o => {
              const isOverdue = o.deadline && o.deadline < today;
              return (
                <div key={o.id} className={`card border-2 ${isOverdue ? 'border-error' : 'border-outline-variant'} flex flex-col gap-sm p-md`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-primary-container text-data-mono">{o.order_id}</span>
                      <p className="text-label-md text-on-surface font-bold mt-xs">{o.customer_name}</p>
                    </div>
                    <span className={URGENCY_BADGE[o.urgency] || 'chip chip-gray'}>{o.urgency}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-xs text-body-sm">
                    <div className="p-sm bg-surface-container rounded-lg">
                      <p className="text-label-sm text-on-surface-variant mb-xs">Job Type</p>
                      <p className="text-on-surface font-semibold">{o.job_type}</p>
                    </div>
                    <div className="p-sm bg-surface-container rounded-lg">
                      <p className="text-label-sm text-on-surface-variant mb-xs">Size / Specs</p>
                      <p className="text-on-surface font-semibold">{o.size || '—'}</p>
                    </div>
                    <div className={`p-sm rounded-lg ${isOverdue ? 'bg-error-container' : 'bg-surface-container'}`}>
                      <p className="text-label-sm text-on-surface-variant mb-xs">Deadline</p>
                      <p className={`font-semibold ${isOverdue ? 'text-error' : 'text-on-surface'}`}>{o.deadline || '—'}{isOverdue ? ' ⚠' : ''}</p>
                    </div>
                    <div className="p-sm bg-surface-container rounded-lg">
                      <p className="text-label-sm text-on-surface-variant mb-xs">Value</p>
                      <p className="text-on-surface font-semibold">{fmt(o.total_amount || o.amount)}</p>
                    </div>
                  </div>

                  {o.notes && (
                    <div className="p-sm bg-amber-50 border border-amber-200 rounded-lg text-body-sm">
                      <span className="text-amber-600 font-semibold">Instructions: </span>{o.notes}
                    </div>
                  )}

                  {o.rejection_reason && (
                    <div className="p-sm bg-error-container/30 border border-error rounded-lg text-body-sm text-error">
                      <span className="font-semibold">Rejected by Head: </span>{o.rejection_reason}
                    </div>
                  )}

                  <button onClick={() => { setCompleteModal(o); setDesignNotes(''); }} className="btn-primary justify-center py-sm mt-xs">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done</span>
                    Mark Design Complete
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {complete.length > 0 && (
        <>
          <h4 className="text-label-md text-on-surface-variant font-semibold tracking-widest uppercase">Submitted — Awaiting Head Review</h4>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>
                  {complete.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                      <td className="text-label-md text-on-surface font-semibold">{o.customer_name}</td>
                      <td><p className="text-body-sm text-on-surface">{o.job_type}</p><p className="text-label-sm text-on-surface-variant">{o.size}</p></td>
                      <td className="text-body-sm text-on-surface-variant">{o.design_notes ? `"${o.design_notes.slice(0, 40)}…"` : '—'}</td>
                      <td><Badge s={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Complete Modal */}
      {completeModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setCompleteModal(null)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="text-headline-sm text-on-background font-semibold">Mark Complete — {completeModal.order_id}</h3>
              <button onClick={() => setCompleteModal(null)} className="p-xs rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="p-sm bg-surface-container rounded-lg mb-md text-body-sm">
              <p className="text-on-surface font-semibold">{completeModal.customer_name} — {completeModal.job_type}</p>
            </div>
            <div className="field mb-md">
              <label>Design notes (optional — visible to head)</label>
              <input value={designNotes} onChange={e => setDesignNotes(e.target.value)} placeholder="e.g. Used client's logo, RGB adjusted for print…" autoFocus />
            </div>
            <button onClick={markComplete} disabled={saving} className="btn-primary w-full justify-center py-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done</span>
              {saving ? 'Submitting…' : 'Submit for Head Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
