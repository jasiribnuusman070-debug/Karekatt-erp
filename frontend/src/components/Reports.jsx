import { useState, useEffect } from 'react';
import api from '../api';
import { fmt } from '../utils';

export default function Reports() {
  const [tab, setTab] = useState('profit');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [profit, setProfit] = useState(null);
  const [gst, setGst] = useState(null);
  const [summary, setSummary] = useState([]);

  const load = async () => {
    const params = `?year=${year}&month=${month}`;
    const [p, g, s] = await Promise.all([
      api.get(`/reports/profit${params}`),
      api.get(`/reports/gst${params}`),
      api.get('/reports/summary'),
    ]);
    setProfit(p.data);
    setGst(g.data);
    setSummary(s.data);
  };
  useEffect(() => { load(); }, [year, month]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const printGST = () => {
    if (!gst) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>GST Report</title><style>
      body { font-family: Arial; padding: 20px; font-size: 13px; }
      h2 { border-bottom: 2px solid #000; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f5f5f5; }
      .text-right { text-align: right; }
      .summary { margin-top: 16px; padding: 12px; background: #f9f9f9; border: 1px solid #ddd; }
      .total { font-weight: bold; font-size: 1.1em; }
    </style></head><body>
    <h2>GST Report — ${gst.month}</h2>
    <div class="summary">
      <div>Taxable Amount: <strong>₹${gst.summary.taxable_amount.toLocaleString('en-IN')}</strong></div>
      <div>CGST (9%): <strong>₹${gst.summary.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
      <div>SGST (9%): <strong>₹${gst.summary.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
      <div class="total">Total GST: ₹${gst.summary.total_gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
    </div>
    <table>
      <thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Job Type</th><th class="text-right">Base Amount</th><th class="text-right">CGST</th><th class="text-right">SGST</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        ${gst.orders.map(o => `<tr>
          <td>${o.order_id}</td><td>${o.customer_name}</td><td>${o.phone || ''}</td><td>${o.job_type}</td>
          <td class="text-right">₹${(o.base_amount || 0).toLocaleString('en-IN')}</td>
          <td class="text-right">₹${((o.gst_amount || 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td class="text-right">₹${((o.gst_amount || 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td class="text-right">₹${(o.total_amount || 0).toLocaleString('en-IN')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`);
    win.print();
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Reports</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">GST filing, profit analysis, and revenue trends.</p>
        </div>
        <div className="flex gap-sm items-center">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="field-inline">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="field-inline">
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          {tab === 'gst' && (
            <button onClick={printGST} className="btn">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> Print GST
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-xs border-b border-outline-variant">
        {[
          { id: 'profit', label: 'Profit by Job Type', icon: 'trending_up' },
          { id: 'gst', label: 'GST Report', icon: 'receipt_long' },
          { id: 'trend', label: 'Revenue Trend', icon: 'bar_chart' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profit' && profit && (
        <div className="flex flex-col gap-md">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              { label: 'Revenue', val: fmt(profit.totals.revenue), icon: 'payments', color: 'text-primary-container' },
              { label: 'Material Cost', val: fmt(profit.totals.material_cost), icon: 'inventory_2', color: 'text-amber-600' },
              { label: 'Gross Profit', val: fmt(profit.totals.gross_profit), icon: 'trending_up', color: 'text-emerald-600' },
              { label: 'Net Profit', val: fmt(profit.net_profit), icon: 'account_balance', color: profit.net_profit >= 0 ? 'text-emerald-600' : 'text-error' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div className="flex items-center gap-sm mb-sm">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{m.icon}</span>
                  <span className="metric-label">{m.label}</span>
                </div>
                <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
              </div>
            ))}
          </div>

          {profit.maintenance_cost > 0 && (
            <div className="p-sm bg-amber-50 border border-amber-200 rounded-xl text-label-sm text-amber-800">
              Maintenance costs this month: {fmt(profit.maintenance_cost)} (deducted from gross profit to get net)
            </div>
          )}

          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Profit by Job Type — {MONTHS[month - 1]} {year}</span></div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Job Type</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">Material Cost</th><th className="text-right">Gross Profit</th><th className="text-right">Margin</th></tr></thead>
                <tbody>
                  {profit.by_job_type.map(r => (
                    <tr key={r.job_type}>
                      <td className="font-semibold text-on-surface">{r.job_type}</td>
                      <td className="text-right text-body-sm">{r.order_count}</td>
                      <td className="text-right font-mono">{fmt(r.revenue)}</td>
                      <td className="text-right font-mono text-amber-600">{fmt(r.material_cost)}</td>
                      <td className="text-right font-mono font-semibold text-emerald-700">{fmt(r.gross_profit)}</td>
                      <td className="text-right">
                        <span className={`text-label-sm font-bold ${parseFloat(r.margin_pct) >= 50 ? 'text-emerald-600' : parseFloat(r.margin_pct) >= 25 ? 'text-amber-600' : 'text-error'}`}>
                          {r.margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {profit.by_job_type.length === 0 && <tr><td colSpan={6} className="text-center py-xl text-on-surface-variant">No delivered orders this month</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'gst' && gst && (
        <div className="flex flex-col gap-md">
          {/* GST summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              { label: 'Taxable Amount', val: fmt(gst.summary.taxable_amount) },
              { label: 'CGST (9%)', val: fmt(gst.summary.cgst) },
              { label: 'SGST (9%)', val: fmt(gst.summary.sgst) },
              { label: 'Total GST', val: fmt(gst.summary.total_gst) },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <p className="metric-label">{m.label}</p>
                <p className="text-display-lg font-bold text-on-surface">{m.val}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <span className="text-label-md text-on-surface font-semibold">GST Breakdown — {MONTHS[month - 1]} {year}</span>
              <span className="text-label-sm text-on-surface-variant">{gst.orders.length} delivered orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Job Type</th><th className="text-right">Base Amount</th><th className="text-right">CGST (9%)</th><th className="text-right">SGST (9%)</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {gst.orders.map(o => (
                    <tr key={o.order_id}>
                      <td className="font-mono text-primary-container text-label-md">{o.order_id}</td>
                      <td>
                        <p className="text-body-sm font-semibold text-on-surface">{o.customer_name}</p>
                        <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
                      </td>
                      <td className="text-body-sm text-on-surface">{o.job_type}</td>
                      <td className="text-right font-mono">{fmt(o.base_amount)}</td>
                      <td className="text-right font-mono">{fmt((o.gst_amount || 0) / 2)}</td>
                      <td className="text-right font-mono">{fmt((o.gst_amount || 0) / 2)}</td>
                      <td className="text-right font-mono font-semibold">{fmt(o.total_amount)}</td>
                    </tr>
                  ))}
                  {gst.orders.length === 0 && <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant">No delivered orders this month</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'trend' && (
        <div className="card">
          <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Monthly Revenue Trend (Last 12 months)</span></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Month</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {summary.map(r => (
                  <tr key={r.month}>
                    <td className="font-mono text-label-md text-primary-container">{r.month}</td>
                    <td className="text-right text-body-sm">{r.orders}</td>
                    <td className="text-right font-mono">{fmt(r.revenue)}</td>
                    <td className="text-right font-mono text-on-surface-variant">{fmt(r.gst)}</td>
                    <td className="text-right font-mono font-semibold">{fmt(r.total)}</td>
                  </tr>
                ))}
                {summary.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">No data yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
