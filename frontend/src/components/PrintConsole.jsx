import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge } from '../utils';
import { useAuth } from '../App';

const PRINT_STAGES = ['Printing', 'Cutting', 'Finishing', 'Ready'];

const STAGE_ICON = { Printing: 'print', Cutting: 'content_cut', Finishing: 'auto_fix_high', Ready: 'inventory_2' };
const STAGE_COLOR = { Printing: 'text-amber-600 bg-amber-100', Cutting: 'text-amber-600 bg-amber-100', Finishing: 'text-amber-600 bg-amber-100', Ready: 'text-emerald-600 bg-emerald-100' };

export default function PrintConsole() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [printNotes, setPrintNotes] = useState('');
  const [notesModal, setNotesModal] = useState(null);

  const load = () => api.get('/orders').then(r => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const advance = async (order, notes) => {
    const idx = PRINT_STAGES.indexOf(order.status);
    const next = idx < 0 ? 'Printing' : PRINT_STAGES[Math.min(idx + 1, PRINT_STAGES.length - 1)];
    await api.put(`/orders/${order.id}`, { status: next, print_notes: notes || order.print_notes || '' });
    load();
  };

  const setStatus = async (order, status) => {
    await api.put(`/orders/${order.id}`, { status, print_notes: order.print_notes || '' });
    load();
  };

  const today = new Date().toISOString().slice(0, 10);

  // Bulk batches: job types with 3+ orders in Design Approved
  const approvedOrders = orders.filter(o => o.status === 'Design Approved');
  const batchCounts = approvedOrders.reduce((acc, o) => {
    acc[o.job_type] = (acc[o.job_type] || 0) + 1;
    return acc;
  }, {});
  const bulkBatches = Object.entries(batchCounts).filter(([, n]) => n >= 3);

  const queue = orders.filter(o =>
    filter === 'all'
      ? ['Design Approved', 'Printing', 'Cutting', 'Finishing', 'Ready'].includes(o.status)
      : o.status === filter
  );

  const counts = {
    'Design Approved': orders.filter(o => o.status === 'Design Approved').length,
    'Printing':        orders.filter(o => o.status === 'Printing').length,
    'Cutting':         orders.filter(o => o.status === 'Cutting').length,
    'Finishing':       orders.filter(o => o.status === 'Finishing').length,
    'Ready':           orders.filter(o => o.status === 'Ready').length,
  };

  const URGENCY_COLOR = { Normal: 'text-on-surface-variant', Urgent: 'text-amber-600 font-semibold', Express: 'text-error font-semibold' };

  const nextLabel = (status) => {
    const idx = PRINT_STAGES.indexOf(status);
    if (idx < 0) return 'Start Printing';
    if (idx >= PRINT_STAGES.length - 1) return null;
    return `→ ${PRINT_STAGES[idx + 1]}`;
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Print Department Console</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Manage the production queue — printing, cutting, finishing.</p>
        </div>
      </div>

      {/* Bulk batch alerts */}
      {bulkBatches.length > 0 && (
        <div className="p-sm bg-violet-50 border border-violet-200 rounded-xl flex flex-wrap gap-sm items-center">
          <span className="material-symbols-outlined text-violet-600" style={{ fontSize: 18 }}>layers</span>
          <span className="text-label-md text-violet-700 font-semibold">Bulk batch opportunity:</span>
          {bulkBatches.map(([type, count]) => (
            <span key={type} className="chip chip-purple">{type} × {count} — run together</span>
          ))}
        </div>
      )}

      {/* Status metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md">
        {[
          { label: 'Approved', status: 'Design Approved', icon: 'verified', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Printing', status: 'Printing',        icon: 'print',    color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Cutting',  status: 'Cutting',         icon: 'content_cut', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Finishing',status: 'Finishing',       icon: 'auto_fix_high', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Ready',    status: 'Ready',           icon: 'inventory_2', color: 'text-emerald-600', bg: 'bg-emerald-100' },
        ].map(m => (
          <button key={m.label} onClick={() => setFilter(filter === m.status ? 'all' : m.status)}
            className={`metric-card text-left transition-all ${filter === m.status ? 'ring-2 ring-primary-container' : ''}`}>
            <div className="flex justify-between items-start mb-sm">
              <span className={`material-symbols-outlined p-xs rounded-lg ${m.color} ${m.bg}`} style={{ fontSize: 18 }}>{m.icon}</span>
            </div>
            <p className="metric-label">{m.label}</p>
            <p className={`text-display-lg font-bold ${m.color}`}>{counts[m.status]}</p>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="text-label-md text-on-surface font-semibold">
            {filter === 'all' ? 'All Jobs in Production' : filter}
          </span>
          <div className="flex items-center gap-sm">
            {filter !== 'all' && <button onClick={() => setFilter('all')} className="btn btn-sm text-label-sm">Show all</button>}
            <span className="text-label-sm text-on-surface-variant">{queue.length} jobs</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Job / Specs</th><th>Urgency</th><th>Deadline</th><th className="text-right">Value</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {queue.map(o => {
                const isOverdue = o.deadline && o.deadline < today && o.status !== 'Ready';
                const next = nextLabel(o.status);
                return (
                  <tr key={o.id} className={`group ${isOverdue ? 'bg-error-container/10' : ''}`}>
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
                      {o.notes && <p className="text-label-sm text-amber-600 italic">{o.notes}</p>}
                    </td>
                    <td><span className={`text-label-sm ${URGENCY_COLOR[o.urgency]}`}>{o.urgency}</span></td>
                    <td className={`text-body-sm ${isOverdue ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>
                      {o.deadline || '—'}{isOverdue ? ' ⚠' : ''}
                    </td>
                    <td className="text-right font-mono text-data-mono">{fmt(o.total_amount || o.amount)}</td>
                    <td><Badge s={o.status} /></td>
                    <td>
                      <div className="flex items-center gap-xs">
                        {o.status === 'Design Approved' && (
                          <button onClick={() => advance(o, '')} className="btn btn-sm text-label-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>print</span> Start Print
                          </button>
                        )}
                        {['Printing', 'Cutting', 'Finishing'].includes(o.status) && next && (
                          <button onClick={() => { setNotesModal(o); setPrintNotes(o.print_notes || ''); }} className="btn btn-sm text-label-sm">
                            {next}
                          </button>
                        )}
                        {o.status === 'Ready' && (
                          <span className="text-label-sm text-emerald-600 font-semibold flex items-center gap-xs">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications_active</span>
                            Notified
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {queue.length === 0 && (
                <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant text-body-sm">
                  {filter === 'all' ? 'No jobs in production queue' : `No jobs with status "${filter}"`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance status modal */}
      {notesModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setNotesModal(null)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-lg">
              <h3 className="text-headline-sm text-on-background font-semibold">
                {notesModal.order_id} — {nextLabel(notesModal.status)}
              </h3>
              <button onClick={() => setNotesModal(null)} className="p-xs rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="p-sm bg-surface-container rounded-lg mb-md text-body-sm">
              <p className="text-on-surface font-semibold">{notesModal.customer_name} — {notesModal.job_type} ({notesModal.size})</p>
            </div>
            <div className="field mb-md">
              <label>Production notes (optional)</label>
              <input value={printNotes} onChange={e => setPrintNotes(e.target.value)} placeholder="e.g. Cut to 3mm bleed, used gloss lam…" autoFocus />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setNotesModal(null)} className="btn flex-1 justify-center py-sm">Cancel</button>
              <button onClick={async () => {
                const idx = PRINT_STAGES.indexOf(notesModal.status);
                const next = PRINT_STAGES[Math.min(idx + 1, PRINT_STAGES.length - 1)];
                await api.put(`/orders/${notesModal.id}`, { status: next, print_notes: printNotes });
                setNotesModal(null);
                load();
              }} className="btn-primary flex-1 justify-center py-sm">
                {nextLabel(notesModal.status)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
