import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, monthLabel } from '../utils';

export default function Payroll() {
  const [data, setData] = useState({ payroll: [], total: 0, wdays: 22 });
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const r = await api.get('/payroll');
    setData(r.data);
  };

  useEffect(() => {
    api.get('/payroll').then(r => { setData(r.data); setLoading(false); });
  }, []);

  const updateAdvance = async (id, advance) => {
    await api.put(`/payroll/advance/${id}`, { advance: parseFloat(advance) || 0 });
    reload();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-xl text-on-surface-variant text-body-sm">
      <span className="material-symbols-outlined animate-spin mr-sm">progress_activity</span> Loading…
    </div>
  );

  const { payroll, total, wdays } = data;

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Payroll — {monthLabel()}</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Auto-calculated from attendance records.</p>
        </div>
        <div className="metric-card py-sm px-md">
          <p className="metric-label">Total payout</p>
          <p className="text-display-lg font-bold text-primary-container">{fmt(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md">
        {[
          { label: 'Total Payout', value: fmt(total), icon: 'payments', color: 'text-primary-container', bg: 'bg-primary-container/10' },
          { label: 'Staff Count', value: payroll.length, icon: 'group', color: 'text-on-surface-variant', bg: 'bg-surface-container' },
          { label: 'Working Days', value: wdays, icon: 'calendar_month', color: 'text-amber-600', bg: 'bg-amber-100' },
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
          <span className="text-label-md text-on-surface font-semibold">Monthly payroll</span>
          <span className="text-label-sm text-on-surface-variant">advance editable inline</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff</th><th>Role</th><th className="text-right">Base salary</th>
                <th>Days present/{wdays}</th><th className="text-right">Absent deduction</th>
                <th className="text-right">Advance</th><th className="text-right">Net pay</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(s => (
                <tr key={s.id}>
                  <td className="text-label-md text-on-surface font-semibold">{s.name}</td>
                  <td className="text-body-sm text-on-surface-variant">{s.role}</td>
                  <td className="text-right font-mono text-data-mono">{fmt(s.salary)}</td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round(s.present_days / wdays * 100))}%` }} />
                      </div>
                      <span className="text-label-sm text-on-surface-variant">{s.present_days}</span>
                    </div>
                  </td>
                  <td className="text-right font-mono text-data-mono text-error">− {fmt(s.deduction)}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      defaultValue={s.advance}
                      className="w-24 px-sm py-xs border border-outline-variant rounded-lg text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-container text-right"
                      onBlur={e => updateAdvance(s.id, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && updateAdvance(s.id, e.target.value)}
                    />
                  </td>
                  <td className="text-right font-mono text-data-mono font-bold text-primary-container">{fmt(s.net_pay)}</td>
                </tr>
              ))}
              {payroll.length === 0 && (
                <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant text-body-sm">No payroll data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
