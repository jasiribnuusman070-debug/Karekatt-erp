import { useState, useEffect } from 'react';
import api from '../api';
import { fmt, Badge, calcPrice, printQuotation, printInvoice } from '../utils';
import Modal from './Modal';

const URGENCY = ['Normal', 'Urgent', 'Express'];
const EMPTY_FORM = { customer_name: '', phone: '', job_type: '', size: '', width: '', height: '', qty: '', deadline: '', urgency: 'Normal', notes: '', discount_pct: '' };

function waLink(template, order) {
  if (!template || !order.phone) return null;
  const msg = template
    .replace('{customer_name}', order.customer_name || '')
    .replace('{order_id}', order.order_id || '')
    .replace('{job_type}', order.job_type || '')
    .replace('{total_amount}', `₹${Math.round(order.total_amount || order.amount || 0).toLocaleString('en-IN')}`);
  const phone = order.phone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function ReceptionistConsole() {
  const [tab, setTab] = useState('new');
  const [rateCard, setRateCard] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Phone lookup
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Cancel modal
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Reprint modal
  const [reprintModal, setReprintModal] = useState(null);
  const [reprintReason, setReprintReason] = useState('');
  const [noExtraCharge, setNoExtraCharge] = useState(false);

  const load = async () => {
    const [rc, ord, st] = await Promise.all([api.get('/rate-card'), api.get('/orders'), api.get('/settings')]);
    setRateCard(rc.data);
    setOrders(ord.data);
    setSettings(st.data);
    if (!form.job_type && rc.data.length > 0) setForm(f => ({ ...f, job_type: rc.data[0].job_type }));
  };
  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const selectedItem = rateCard.find(r => r.job_type === form.job_type);
  const pricing = calcPrice(selectedItem, form.qty, form.width, form.height);

  // Apply discount
  const discPct = parseFloat(form.discount_pct) || 0;
  const discountAmt = (pricing.base * discPct) / 100;
  const discountedBase = pricing.base - discountAmt;
  const discountedGst = discountedBase * 0.18;
  const discountedTotal = discountedBase + discountedGst;
  const effectivePricing = discPct > 0
    ? { base: discountedBase, gst: discountedGst, total: discountedTotal, displayQty: pricing.displayQty }
    : pricing;

  const sizeStr = selectedItem?.unit === 'sq ft'
    ? `${form.width || 0}×${form.height || 0} ft`
    : selectedItem?.unit === 'fixed' ? 'Fixed'
    : `${form.qty || 0} ${selectedItem?.unit === 'per 100 pcs' ? 'pcs' : 'pcs'}`;

  const phoneLookup = async () => {
    if (!form.phone || form.phone.length < 6) return;
    setLookupLoading(true);
    try {
      const r = await api.get(`/customers/lookup?phone=${form.phone}`);
      setLookupResult(r.data);
      if (r.data.customer) setForm(f => ({ ...f, customer_name: r.data.customer.name || f.customer_name }));
    } catch {} finally { setLookupLoading(false); }
  };

  const submit = async e => {
    e.preventDefault();
    if (!effectivePricing.base) return alert('Enter size/quantity to calculate price.');
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        phone: form.phone,
        job_type: form.job_type,
        size: sizeStr,
        qty: effectivePricing.displayQty,
        unit: selectedItem?.unit || '',
        rate_per_unit: selectedItem?.rate || 0,
        base_amount: effectivePricing.base,
        gst_amount: effectivePricing.gst,
        total_amount: effectivePricing.total,
        discount_pct: discPct,
        discount_amount: discountAmt,
        deadline: form.deadline,
        urgency: form.urgency,
        notes: form.notes,
      };
      const r = await api.post('/orders', payload);
      const newOrder = { ...payload, order_id: r.data.order_id, id: r.data.id };
      setCreatedOrder(newOrder);
      setForm(EMPTY_FORM);
      setLookupResult(null);
      load();
    } finally { setSaving(false); }
  };

  const confirm = async (id) => {
    await api.put(`/orders/${id}`, { action: 'confirm' });
    load();
  };

  const deliver = async (order) => {
    if (!window.confirm(`Collect payment of ₹${Math.round(order.total_amount || order.amount).toLocaleString('en-IN')} from ${order.customer_name}?`)) return;
    await api.put(`/orders/${order.id}`, { action: 'deliver' });
    printInvoice(order, `INV-AUTO`);
    load();
  };

  const cancelOrder = async () => {
    await api.put(`/orders/${cancelModal.id}`, { action: 'cancel', cancel_reason: cancelReason });
    setCancelModal(null); setCancelReason(''); load();
  };

  const reprintOrder = async () => {
    await api.put(`/orders/${reprintModal.id}`, { action: 'reprint', reprint_reason: reprintReason, no_extra_charge: noExtraCharge });
    setReprintModal(null); setReprintReason(''); setNoExtraCharge(false); load();
  };

  // Quote expiry check
  const quoteValidityDays = parseInt(settings.quote_validity_days) || 7;
  const isExpired = (order) => {
    if (!order.created_at || order.status !== 'Received') return false;
    const created = new Date(order.created_at);
    const expiry = new Date(created.getTime() + quoteValidityDays * 86400000);
    return new Date() > expiry;
  };

  const waEnabled = settings.wa_enabled === 'true';

  const active = orders.filter(o => ['Received', 'Confirmed'].includes(o.status));
  const ready = orders.filter(o => o.status === 'Ready');
  const inProg = orders.filter(o => ['In Design', 'Design Complete', 'Design Approved', 'Printing', 'Cutting', 'Finishing'].includes(o.status));
  const delivered = orders.filter(o => o.status === 'Delivered').slice(0, 30);

  const URGENCY_COLOR = { Normal: 'text-on-surface-variant', Urgent: 'text-amber-600 font-semibold', Express: 'text-error font-semibold' };

  const tabs = [
    { id: 'new',       label: 'New Order',                    icon: 'add_circle' },
    { id: 'active',    label: `Active (${active.length})`,    icon: 'pending_actions' },
    { id: 'prog',      label: `In Progress (${inProg.length})`, icon: 'autorenew' },
    { id: 'ready',     label: ready.length > 0 ? `Ready ⚡ ${ready.length}` : 'Ready for Pickup', icon: 'inventory_2' },
    { id: 'delivered', label: 'Delivered',                    icon: 'check_circle' },
  ];

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-on-background font-semibold">Reception Desk</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Walk-in orders, quotations, and payment collection.</p>
        </div>
        <div className="flex gap-sm">
          {[
            { label: 'Active', val: active.length, color: 'text-primary-container' },
            { label: 'In Progress', val: inProg.length, color: 'text-amber-600' },
            { label: 'Ready', val: ready.length, color: ready.length > 0 ? 'text-emerald-600' : 'text-on-surface-variant' },
          ].map(m => (
            <div key={m.label} className="metric-card py-sm px-md text-center min-w-[80px]">
              <p className="metric-label">{m.label}</p>
              <p className={`text-display-lg font-bold ${m.color}`}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-xs border-b border-outline-variant overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs px-md py-sm text-label-md transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id ? 'border-primary-container text-primary-container font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            } ${t.id === 'ready' && ready.length > 0 ? 'text-emerald-600' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* NEW ORDER TAB */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="card lg:col-span-7">
            <div className="card-head">
              <span className="text-label-md text-on-surface font-semibold">Order Details</span>
            </div>
            <form onSubmit={submit} className="p-md flex flex-col gap-md">
              <div className="form-grid">
                <div className="field">
                  <label>Phone</label>
                  <div className="flex gap-xs">
                    <input name="phone" value={form.phone} onChange={handle} placeholder="Mobile number" className="flex-1" />
                    <button type="button" onClick={phoneLookup} disabled={lookupLoading}
                      className="btn btn-sm px-sm" title="Lookup customer">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{lookupLoading ? 'hourglass_empty' : 'person_search'}</span>
                    </button>
                  </div>
                </div>
                <div className="field"><label>Customer name *</label><input name="customer_name" value={form.customer_name} onChange={handle} placeholder="Full name" required /></div>

                {/* Phone lookup result */}
                {lookupResult && lookupResult.customer && (
                  <div className="col-span-2 p-sm bg-primary-container/5 border border-primary-container/20 rounded-lg">
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 16 }}>person</span>
                      <span className="text-label-md text-primary-container font-semibold">Returning Customer</span>
                    </div>
                    <p className="text-body-sm text-on-surface">{lookupResult.customer.name} — {lookupResult.customer.order_count} orders · spent {fmt(lookupResult.customer.total_spent)}</p>
                    {lookupResult.orders.length > 0 && (
                      <div className="mt-sm">
                        <p className="text-label-sm text-on-surface-variant mb-xs">Recent orders:</p>
                        {lookupResult.orders.slice(0, 3).map(o => (
                          <div key={o.id} className="flex items-center justify-between text-label-sm py-xs border-b border-outline-variant/30">
                            <span className="font-mono text-primary-container">{o.order_id}</span>
                            <span className="text-on-surface">{o.job_type}</span>
                            <Badge s={o.status} />
                            <span className="font-mono">{fmt(o.total_amount || o.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {lookupResult && !lookupResult.customer && (
                  <div className="col-span-2 p-xs bg-surface-container rounded-lg text-label-sm text-on-surface-variant">
                    No existing customer found for this phone number
                  </div>
                )}

                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Job type *</label>
                  <select name="job_type" value={form.job_type} onChange={handle} required>
                    <option value="">— Select job type —</option>
                    {rateCard.map(r => <option key={r.id} value={r.job_type}>{r.job_type} — ₹{r.rate} / {r.unit}</option>)}
                  </select>
                </div>

                {selectedItem?.unit === 'sq ft' && (
                  <>
                    <div className="field"><label>Width (ft)</label><input type="number" name="width" value={form.width} onChange={handle} placeholder="e.g. 6" min="0" step="0.5" /></div>
                    <div className="field"><label>Height (ft)</label><input type="number" name="height" value={form.height} onChange={handle} placeholder="e.g. 3" min="0" step="0.5" /></div>
                  </>
                )}
                {(selectedItem?.unit === 'per 100 pcs' || selectedItem?.unit === 'per piece') && (
                  <div className="field" style={{ gridColumn: '1/-1' }}>
                    <label>Quantity (pieces)</label>
                    <input type="number" name="qty" value={form.qty} onChange={handle} placeholder={`Min ${selectedItem.min_qty}`} min={selectedItem.min_qty} />
                  </div>
                )}
                {selectedItem?.unit === 'fixed' && (
                  <div className="p-sm bg-surface-container rounded-lg text-body-sm text-on-surface-variant col-span-2">
                    Fixed price job — no size input needed
                  </div>
                )}

                <div className="field"><label>Urgency</label>
                  <select name="urgency" value={form.urgency} onChange={handle}>
                    {URGENCY.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field"><label>Deadline</label><input type="date" name="deadline" value={form.deadline} onChange={handle} /></div>
                <div className="field">
                  <label>Discount (%)</label>
                  <input type="number" name="discount_pct" value={form.discount_pct} onChange={handle} placeholder="0" min="0" max="100" step="0.5" />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Special instructions</label>
                  <input name="notes" value={form.notes} onChange={handle} placeholder="Any special requirements…" />
                </div>
              </div>
              <div className="flex gap-sm">
                <button type="button" disabled={!effectivePricing.total} onClick={() => printQuotation({ customer_name: form.customer_name, phone: form.phone, job_type: form.job_type, size: sizeStr, urgency: form.urgency, deadline: form.deadline, notes: form.notes }, effectivePricing)}
                  className="btn flex-1 justify-center py-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> Print Quotation
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                  {saving ? 'Creating…' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>

          {/* Price Panel */}
          <div className="lg:col-span-5 flex flex-col gap-md">
            <div className="card">
              <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Price Preview</span></div>
              <div className="p-md">
                {selectedItem ? (
                  <>
                    <div className="p-sm bg-surface-container rounded-lg mb-md">
                      <p className="text-label-sm text-on-surface-variant">{selectedItem.description}</p>
                      <p className="text-label-sm text-primary-container mt-xs font-semibold">Rate: ₹{selectedItem.rate} per {selectedItem.unit}</p>
                    </div>
                    <div className="space-y-sm">
                      <div className="flex justify-between text-body-sm">
                        <span className="text-on-surface-variant">Size / Qty</span>
                        <span className="font-semibold text-on-surface">{sizeStr || '—'}</span>
                      </div>
                      <div className="flex justify-between text-body-sm">
                        <span className="text-on-surface-variant">Base amount</span>
                        <span className="font-semibold text-on-surface">{fmt(pricing.base)}</span>
                      </div>
                      {discPct > 0 && (
                        <div className="flex justify-between text-body-sm text-emerald-600">
                          <span>Discount ({discPct}%)</span>
                          <span>− {fmt(discountAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-body-sm">
                        <span className="text-on-surface-variant">GST @ 18%</span>
                        <span className="font-semibold text-on-surface">{fmt(effectivePricing.gst)}</span>
                      </div>
                      <div className="flex justify-between pt-sm border-t border-outline-variant">
                        <span className="text-label-md font-bold text-on-surface">Total</span>
                        <span className={`text-headline-sm font-bold ${effectivePricing.total > 0 ? 'text-primary-container' : 'text-on-surface-variant'}`}>{fmt(effectivePricing.total)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-body-sm text-on-surface-variant text-center py-lg">Select a job type to see pricing</p>
                )}
              </div>
            </div>

            {createdOrder && (
              <div className="card border-2 border-emerald-500">
                <div className="p-md">
                  <div className="flex items-center gap-sm mb-sm">
                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                    <span className="text-label-md text-on-surface font-semibold">Order Created!</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mb-md">{createdOrder.order_id} — {createdOrder.customer_name}</p>
                  <div className="flex gap-sm flex-wrap">
                    <button onClick={() => printQuotation(createdOrder, { base: createdOrder.base_amount, gst: createdOrder.gst_amount, total: createdOrder.total_amount })}
                      className="btn flex-1 text-label-sm justify-center">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span> Quotation
                    </button>
                    {waEnabled && createdOrder.phone && settings.wa_template_confirmed && (
                      <a href={waLink(settings.wa_template_confirmed, createdOrder)} target="_blank" rel="noreferrer"
                        className="btn flex-1 text-label-sm justify-center text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span> WhatsApp
                      </a>
                    )}
                    <button onClick={() => setCreatedOrder(null)} className="btn-primary flex-1 text-label-sm justify-center">Done</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE ORDERS TAB */}
      {tab === 'active' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Active Orders</span>
            <span className="text-label-sm text-on-surface-variant">{active.length} orders</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Urgency</th><th>Deadline</th><th className="text-right">Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {active.map(o => (
                  <tr key={o.id} className={isExpired(o) ? 'bg-amber-50' : ''}>
                    <td>
                      <p className="font-mono text-primary-container text-data-mono">{o.order_id}</p>
                      {o.is_reprint ? <span className="chip chip-gray text-[10px]">Reprint</span> : null}
                      {isExpired(o) && <span className="chip chip-error text-[10px]">Quote Expired</span>}
                    </td>
                    <td>
                      <p className="text-label-md text-on-surface font-semibold">{o.customer_name}</p>
                      <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
                    </td>
                    <td>
                      <p className="text-body-sm text-on-surface">{o.job_type}</p>
                      <p className="text-label-sm text-on-surface-variant">{o.size}</p>
                    </td>
                    <td><span className={`text-label-sm ${URGENCY_COLOR[o.urgency]}`}>{o.urgency}</span></td>
                    <td className="text-body-sm text-on-surface-variant">{o.deadline || '—'}</td>
                    <td className="text-right font-mono text-data-mono font-semibold">{fmt(o.total_amount || o.amount)}</td>
                    <td><Badge s={o.status} /></td>
                    <td>
                      <div className="flex flex-col gap-xs">
                        {o.status === 'Received' && (
                          <button onClick={() => confirm(o.id)} className="btn btn-sm text-label-sm">Confirm</button>
                        )}
                        {o.status === 'Confirmed' && (
                          <span className="text-label-sm text-on-surface-variant italic">Awaiting design</span>
                        )}
                        <button onClick={() => { setCancelModal(o); setCancelReason(''); }} className="btn btn-sm text-label-sm text-error">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {active.length === 0 && <tr><td colSpan={8} className="text-center py-xl text-on-surface-variant text-body-sm">No active orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IN PROGRESS TAB */}
      {tab === 'prog' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">In Progress</span>
            <span className="text-label-sm text-on-surface-variant">{inProg.length} orders</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th>Designer</th><th>Deadline</th><th className="text-right">Total</th><th>Status</th></tr></thead>
              <tbody>
                {inProg.map(o => (
                  <tr key={o.id}>
                    <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                    <td className="text-label-md text-on-surface font-semibold">{o.customer_name}</td>
                    <td><p className="text-body-sm text-on-surface">{o.job_type}</p><p className="text-label-sm text-on-surface-variant">{o.size}</p></td>
                    <td className="text-body-sm text-on-surface-variant">{o.designer_name || '—'}</td>
                    <td className="text-body-sm text-on-surface-variant">{o.deadline || '—'}</td>
                    <td className="text-right font-mono text-data-mono">{fmt(o.total_amount || o.amount)}</td>
                    <td><Badge s={o.status} /></td>
                  </tr>
                ))}
                {inProg.length === 0 && <tr><td colSpan={7} className="text-center py-xl text-on-surface-variant text-body-sm">No orders in progress</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* READY FOR PICKUP TAB */}
      {tab === 'ready' && (
        <div className="flex flex-col gap-md">
          {ready.length > 0 && (
            <div className="p-md bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-sm">
              <span className="material-symbols-outlined text-emerald-600">notifications_active</span>
              <span className="text-label-md text-emerald-700 font-semibold">{ready.length} order{ready.length > 1 ? 's' : ''} ready for pickup</span>
            </div>
          )}
          <div className="card">
            <div className="card-head"><span className="text-label-md text-on-surface font-semibold">Ready for Pickup</span></div>
            {ready.length === 0 ? (
              <div className="p-xl text-center text-on-surface-variant text-body-sm">No orders ready yet</div>
            ) : (
              <div className="p-md grid grid-cols-1 lg:grid-cols-2 gap-md">
                {ready.map(o => (
                  <div key={o.id} className="border-2 border-emerald-300 rounded-xl p-md bg-emerald-50 flex flex-col gap-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-primary-container text-data-mono font-semibold">{o.order_id}</p>
                        <p className="text-label-md text-on-surface font-bold mt-xs">{o.customer_name}</p>
                        <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
                      </div>
                      <Badge s={o.status} />
                    </div>
                    <div className="text-body-sm text-on-surface">
                      <span className="text-on-surface-variant">Job: </span>{o.job_type} — {o.size}
                    </div>
                    {o.print_notes && <p className="text-label-sm text-on-surface-variant italic">Note: {o.print_notes}</p>}
                    <div className="flex items-center justify-between pt-sm border-t border-emerald-200">
                      <div>
                        <p className="text-label-sm text-on-surface-variant">Amount to collect</p>
                        <p className="text-headline-sm font-bold text-emerald-700">{fmt(o.total_amount || o.amount)}</p>
                        <p className="text-label-sm text-on-surface-variant">(incl. GST ₹{Math.round(o.gst_amount || 0).toLocaleString('en-IN')})</p>
                      </div>
                      <div className="flex flex-col gap-sm items-end">
                        {waEnabled && o.phone && settings.wa_template_ready && (
                          <a href={waLink(settings.wa_template_ready, o)} target="_blank" rel="noreferrer"
                            className="btn btn-sm text-emerald-700 border-emerald-300">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span> WA
                          </a>
                        )}
                        <button onClick={() => deliver(o)} className="btn-primary py-sm">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                          Collect & Close
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELIVERED TAB */}
      {tab === 'delivered' && (
        <div className="card">
          <div className="card-head">
            <span className="text-label-md text-on-surface font-semibold">Delivered Orders</span>
            <span className="text-label-sm text-on-surface-variant">Recent 30</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th className="text-right">Total</th><th>Action</th></tr></thead>
              <tbody>
                {delivered.map(o => (
                  <tr key={o.id}>
                    <td className="font-mono text-primary-container text-data-mono">{o.order_id}</td>
                    <td>
                      <p className="text-label-md text-on-surface font-semibold">{o.customer_name}</p>
                      <p className="text-label-sm text-on-surface-variant">{o.phone}</p>
                    </td>
                    <td><p className="text-body-sm text-on-surface">{o.job_type}</p><p className="text-label-sm text-on-surface-variant">{o.size}</p></td>
                    <td className="text-right font-mono font-semibold">{fmt(o.total_amount || o.amount)}</td>
                    <td>
                      <button onClick={() => { setReprintModal(o); setReprintReason(''); setNoExtraCharge(false); }}
                        className="btn btn-sm text-label-sm">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span> Reprint
                      </button>
                    </td>
                  </tr>
                ))}
                {delivered.length === 0 && <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">No delivered orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <Modal title={`Cancel Order — ${cancelModal.order_id}`} onClose={() => setCancelModal(null)}>
          <div className="p-md flex flex-col gap-md">
            <p className="text-body-sm text-on-surface-variant">Cancelling order for <strong>{cancelModal.customer_name}</strong> ({cancelModal.job_type})</p>
            <div className="field">
              <label>Cancellation reason</label>
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Why is this order being cancelled?" />
            </div>
            {waEnabled && cancelModal.phone && settings.wa_template_cancelled && (
              <a href={waLink(settings.wa_template_cancelled, cancelModal)} target="_blank" rel="noreferrer"
                className="btn justify-center text-emerald-700 border-emerald-300">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span> Send WA Cancellation
              </a>
            )}
            <div className="flex gap-sm">
              <button onClick={() => setCancelModal(null)} className="btn flex-1 justify-center">Keep Order</button>
              <button onClick={cancelOrder} className="flex-1 btn justify-center text-error border-error/30 hover:bg-error/5">Confirm Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reprint modal */}
      {reprintModal && (
        <Modal title={`Reprint — ${reprintModal.order_id}`} onClose={() => setReprintModal(null)}>
          <div className="p-md flex flex-col gap-md">
            <p className="text-body-sm text-on-surface-variant">
              Creating a reprint of <strong>{reprintModal.job_type}</strong> for {reprintModal.customer_name}
            </p>
            <div className="field">
              <label>Reason for reprint</label>
              <input value={reprintReason} onChange={e => setReprintReason(e.target.value)} placeholder="e.g. Print quality issue, wrong size" />
            </div>
            <label className="flex items-center gap-sm cursor-pointer">
              <input type="checkbox" checked={noExtraCharge} onChange={e => setNoExtraCharge(e.target.checked)} />
              <span className="text-label-md text-on-surface">No extra charge (free reprint)</span>
            </label>
            {!noExtraCharge && (
              <div className="p-sm bg-amber-50 border border-amber-200 rounded-lg text-label-sm text-amber-800">
                Customer will be charged {fmt(reprintModal.total_amount || reprintModal.amount)} again
              </div>
            )}
            <div className="flex gap-sm">
              <button onClick={() => setReprintModal(null)} className="btn flex-1 justify-center">Cancel</button>
              <button onClick={reprintOrder} className="btn-primary flex-1 justify-center">Create Reprint Order</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
