import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { fmt, Badge, todayLabel } from '../utils';
import { useAuth } from '../App';

// ── Browser push notifications ──────────────────────────────────────────────
function requestNotifPerm() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function pushNotif(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/favicon.ico', tag }); } catch {}
}

const ALERT_DEFAULTS = {
  alert_absent:       '1',
  alert_overdue:      '1',
  alert_design_queue: '1',
  alert_low_stock:    '1',
  alert_large_order:  '1',
  alert_daily_summary:'1',
  overdue_threshold:  '2',
  large_order_amount: '5000',
  daily_summary_hour: '19',
};

// ── Live Ops — owner only ────────────────────────────────────────────────────
function LiveOps({ settings }) {
  const [live, setLive]     = useState(null);
  const [loading, setLoading] = useState(true);
  const firedRef = useRef({});

  const load = useCallback(async () => {
    try {
      const r = await api.get('/dashboard/live');
      setLive(r.data);
      fireAlerts(r.data, settings, firedRef);
    } finally { setLoading(false); }
  }, [settings]);

  useEffect(() => {
    requestNotifPerm();
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !live) return (
    <div className="flex items-center gap-sm text-on-surface-variant text-body-sm py-md">
      <span className="material-symbols-outlined animate-spin" style={{fontSize:16}}>progress_activity</span> Loading live data…
    </div>
  );
  if (!live) return null;

  const { staff_activity, pipeline, overdue, today: tod, design_queue, print_queue, design_head_stats } = live;

  return (
    <div className="flex flex-col gap-lg">
      {/* ── Today's Output ────────────────────────────────────────────────── */}
      <div>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm font-semibold">Today's Output</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {[
            { label: 'Received',  value: tod.received,  icon: 'inbox',           color: 'text-primary-container', bg: 'bg-primary-container/10' },
            { label: 'Completed', value: tod.completed, icon: 'check_circle',    color: 'text-emerald-600',       bg: 'bg-emerald-100' },
            { label: 'Revenue',   value: fmt(tod.revenue), icon: 'payments',     color: 'text-emerald-600',       bg: 'bg-emerald-100' },
            { label: 'Active Jobs', value: tod.pending_total, icon: 'hourglass_top', color: 'text-amber-600',    bg: 'bg-amber-100' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <span className={`material-symbols-outlined p-xs rounded-lg ${m.color} ${m.bg} mb-sm`} style={{fontSize:20}}>{m.icon}</span>
              <p className="metric-label">{m.label}</p>
              <p className={`text-display-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overdue Alert ─────────────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <div className="p-md bg-error-container/20 border border-error rounded-xl flex flex-col gap-xs">
          <div className="flex items-center gap-sm text-error font-semibold text-label-md">
            <span className="material-symbols-outlined" style={{fontSize:18}}>warning</span>
            {overdue.length} Overdue Order{overdue.length > 1 ? 's' : ''}
          </div>
          {overdue.map(o => (
            <div key={o.order_id} className="flex items-center justify-between text-body-sm">
              <span className="font-mono text-error font-semibold">{o.order_id}</span>
              <span className="text-on-surface-variant">{o.customer_name}</span>
              <span className="chip chip-red">{o.hours_overdue}h overdue</span>
              <span className="chip chip-gray text-xs">{o.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Jobs Pipeline ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm font-semibold">Jobs Pipeline</p>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-sm">
          {[
            { label: 'Unassigned',    val: pipeline.unassigned,      icon: 'inbox',              color: 'text-on-surface-variant' },
            { label: 'In Design',     val: pipeline.in_design,        icon: 'brush',              color: 'text-violet-600' },
            { label: 'Pending Review',val: pipeline.pending_review,   icon: 'rate_review',        color: pipeline.pending_review > 4 ? 'text-error' : 'text-amber-600' },
            { label: 'Approved',      val: pipeline.design_approved,  icon: 'verified',           color: 'text-primary-container' },
            { label: 'Printing',      val: pipeline.printing,         icon: 'print',              color: 'text-teal-600' },
            { label: 'Ready',         val: pipeline.ready,            icon: 'inventory_2',        color: 'text-emerald-600' },
          ].map(m => (
            <div key={m.label} className="card p-md text-center">
              <span className={`material-symbols-outlined ${m.color} mb-xs`} style={{fontSize:22}}>{m.icon}</span>
              <p className={`text-2xl font-bold ${m.color}`}>{m.val}</p>
              <p className="text-label-sm text-on-surface-variant mt-xs">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Design + Print Queue Status ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Design Queue</span>
            {design_queue.pending_count > 4 && <span className="chip chip-red">High load</span>}
          </div>
          <div className="p-md flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant">Pending review</span>
              <span className={`text-headline-md font-bold ${design_queue.pending_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{design_queue.pending_count}</span>
            </div>
            {design_queue.oldest && (
              <div className="p-sm bg-amber-50 border border-amber-200 rounded-lg text-label-sm text-amber-700">
                <span className="font-semibold">Oldest waiting: </span>{design_queue.oldest.order_id} — {design_queue.oldest.customer_name}
                {design_queue.oldest.hours_waiting != null && <span className="ml-sm chip chip-amber">{design_queue.oldest.hours_waiting}h</span>}
              </div>
            )}
            {design_head_stats && (
              <div className="grid grid-cols-3 gap-xs pt-sm border-t border-outline-variant">
                {[
                  { label: 'Head own', val: design_head_stats.own_jobs },
                  { label: 'Team',     val: design_head_stats.assigned_to_team },
                  { label: 'To approve', val: design_head_stats.pending_approval },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-lg font-bold text-on-surface">{m.val}</p>
                    <p className="text-label-sm text-on-surface-variant">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Print Queue</span>
          </div>
          <div className="p-md flex flex-col gap-sm">
            {[
              { label: 'Waiting to print', val: print_queue.waiting,         color: 'text-primary-container', icon: 'schedule' },
              { label: 'In progress',      val: print_queue.in_progress,     color: 'text-teal-600',          icon: 'print' },
              { label: 'Ready (uncollected)', val: print_queue.ready_uncollected, color: 'text-emerald-600',  icon: 'inventory_2' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between p-sm bg-surface-container rounded-lg">
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

      {/* ── Staff Activity ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm font-semibold">Staff Activity</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-md">
          {staff_activity.map(s => (
            <div key={s.id} className={`card p-md ${s.idle ? 'border-2 border-amber-300 bg-amber-50/30' : ''}`}>
              <div className="flex items-start justify-between mb-sm">
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{s.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{s.role}</p>
                </div>
                <div className="flex flex-col items-end gap-xs">
                  <Badge s={s.status} />
                  {s.idle && s.status === 'Present' && (
                    <span className="chip chip-amber text-[10px]">IDLE</span>
                  )}
                </div>
              </div>
              {s.current_job ? (
                <div className="p-sm bg-surface-container rounded-lg text-label-sm">
                  <p className="text-on-surface-variant">Working on</p>
                  <p className="font-semibold text-on-surface">{s.current_job.order_id} — {s.current_job.job_type}</p>
                  <p className="text-on-surface-variant">{s.current_job.customer}</p>
                </div>
              ) : (
                <div className="p-sm bg-surface-container rounded-lg text-label-sm text-on-surface-variant italic">
                  {s.status !== 'Present' ? `${s.status} today` : 'No active job'}
                </div>
              )}
              {s.pending_count > 0 && (
                <p className="text-label-sm text-on-surface-variant mt-xs">{s.pending_count} pending job{s.pending_count > 1 ? 's' : ''}</p>
              )}
            </div>
          ))}
          {staff_activity.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">No staff found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Alert firing logic ───────────────────────────────────────────────────────
function fireAlerts(live, settings, firedRef) {
  const s = { ...ALERT_DEFAULTS, ...settings };
  const fired = firedRef.current;
  const now = Date.now();

  // Absent staff
  if (s.alert_absent === '1') {
    live.staff_activity.filter(x => x.status === 'Absent').forEach(x => {
      const key = `absent_${x.id}_${new Date().toISOString().slice(0,10)}`;
      if (!fired[key]) {
        pushNotif('Staff Absent', `${x.name} is marked absent today`, key);
        fired[key] = true;
      }
    });
  }

  // Overdue jobs
  if (s.alert_overdue === '1') {
    const threshold = parseInt(s.overdue_threshold) || 2;
    live.overdue.filter(o => o.hours_overdue >= threshold).forEach(o => {
      const key = `overdue_${o.order_id}`;
      if (!fired[key]) {
        pushNotif('Job Overdue', `${o.order_id} (${o.customer_name}) is ${o.hours_overdue}h overdue`, key);
        fired[key] = true;
      }
    });
  }

  // Design queue high load
  if (s.alert_design_queue === '1' && live.design_queue.pending_count >= 5) {
    const key = `design_queue_${new Date().toISOString().slice(0,13)}`;
    if (!fired[key]) {
      pushNotif('Design Queue Alert', `${live.design_queue.pending_count} designs waiting for approval`, key);
      fired[key] = true;
    }
  }
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState({ orders: [], invoices: [], inventory: [], staff: [] });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orders, invoices, inventory, staff, sett] = await Promise.all([
          api.get('/orders').then(r => r.data),
          user.role === 'owner' ? api.get('/invoices').then(r => r.data) : Promise.resolve([]),
          user.role === 'owner' ? api.get('/inventory').then(r => r.data) : Promise.resolve([]),
          user.role === 'owner' ? api.get('/staff').then(r => r.data) : Promise.resolve([]),
          user.role === 'owner' ? api.get('/settings').then(r => r.data) : Promise.resolve({}),
        ]);
        setData({ orders, invoices, inventory, staff });
        setSettings(sett);
      } finally { setLoading(false); }
    };
    load();
  }, [user.role]);

  if (loading) return (
    <div className="flex items-center justify-center py-xl text-on-surface-variant text-body-sm">
      <span className="material-symbols-outlined animate-spin mr-sm">progress_activity</span> Loading…
    </div>
  );

  const { orders, invoices, inventory, staff } = data;
  const revenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount * (1 + i.gst_rate / 100), 0);
  const lowStock = inventory.filter(i => i.qty <= i.reorder_level).length;
  const pending  = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Ready').length;
  const jobMap   = {};
  orders.filter(o => o.status !== 'Delivered').forEach(o => {
    if (!jobMap[o.assigned_to]) jobMap[o.assigned_to] = [];
    jobMap[o.assigned_to].push(o.job_type);
  });

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-on-surface-variant">{todayLabel()}</p>
        {user.role === 'owner' && (
          <span className="flex items-center gap-xs text-label-sm text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live · refreshes every 60s
          </span>
        )}
      </div>

      {/* Owner metric row */}
      {user.role === 'owner' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {[
            { label: 'Active Orders',   value: orders.length,  icon: 'pending_actions', color: 'text-primary-container', bg: 'bg-primary-container/10' },
            { label: 'Pending Jobs',    value: pending,        icon: 'hourglass_top',   color: 'text-amber-600',         bg: 'bg-amber-100' },
            { label: 'Revenue (month)', value: fmt(revenue),   icon: 'payments',        color: 'text-emerald-600',       bg: 'bg-emerald-100' },
            { label: 'Low Stock Items', value: lowStock,       icon: 'warning',         color: 'text-error',             bg: 'bg-error-container' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="flex justify-between items-start mb-sm">
                <span className={`material-symbols-outlined p-xs rounded-lg ${m.color} ${m.bg}`} style={{fontSize:20}}>{m.icon}</span>
              </div>
              <p className="metric-label">{m.label}</p>
              <p className={`text-display-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Live Ops — owner only */}
      {user.role === 'owner' && <LiveOps settings={settings} />}

      {/* Orders table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="card lg:col-span-8">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">{user.role === 'staff' ? 'My Assigned Orders' : 'Active Orders'}</span>
            <span className="text-label-sm text-on-surface-variant">{orders.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Job Type</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 6).map(o => (
                  <tr key={o.id}>
                    <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                    <td className="text-body-sm text-on-background">{o.customer_name}</td>
                    <td className="text-body-sm text-on-surface-variant">{o.job_type}</td>
                    <td><Badge s={o.status} /></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={4} className="text-center py-xl text-on-surface-variant text-body-sm">No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {user.role === 'owner' && (
          <div className="card lg:col-span-4">
            <div className="card-head">
              <span className="text-label-md text-on-surface font-semibold">Inventory Alerts</span>
              <span className="material-symbols-outlined text-error" style={{fontSize:18}}>warning</span>
            </div>
            <div className="p-sm space-y-xs">
              {inventory.map(i => (
                <div key={i.id} className={`flex items-center justify-between p-sm rounded-lg ${i.qty <= i.reorder_level ? 'bg-error-container/20' : 'bg-surface-container'}`}>
                  <div className="flex items-center gap-sm">
                    <div className={`w-2 h-2 rounded-full ${i.qty <= i.reorder_level ? 'bg-error' : 'bg-outline'}`} />
                    <span className="text-body-sm text-on-background">{i.name}</span>
                  </div>
                  <Badge s={i.qty <= i.reorder_level ? 'Low' : 'OK'} />
                </div>
              ))}
              {inventory.length === 0 && <p className="text-body-sm text-on-surface-variant text-center py-md">No materials</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
