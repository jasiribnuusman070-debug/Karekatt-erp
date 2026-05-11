export const fmt = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');

const CHIP_CLASS = {
  Received:         'chip chip-blue',
  Confirmed:        'chip chip-purple',
  'In Design':      'chip chip-purple',
  'Design Complete':'chip chip-blue',
  'Design Approved':'chip chip-green',
  Printing:         'chip chip-amber',
  Cutting:          'chip chip-amber',
  Finishing:        'chip chip-amber',
  Ready:            'chip chip-green',
  Delivered:        'chip chip-gray',
  Paid:             'chip chip-green',
  Pending:          'chip chip-amber',
  Approved:         'chip chip-green',
  Rejected:         'chip chip-red',
  Present:          'chip chip-green',
  Leave:            'chip chip-amber',
  Absent:           'chip chip-red',
  Low:              'chip chip-red',
  OK:               'chip chip-green',
  Normal:           'chip chip-gray',
  Urgent:           'chip chip-amber',
  Express:          'chip chip-red',
};

const CHIP_ICON = {
  Received: 'schedule', Confirmed: 'thumb_up', 'In Design': 'brush',
  'Design Complete': 'done', 'Design Approved': 'verified',
  Printing: 'print', Cutting: 'content_cut', Finishing: 'auto_fix_high',
  Ready: 'inventory_2', Delivered: 'local_shipping',
  Paid: 'check_circle', Pending: 'pending',
  Approved: 'check_circle', Rejected: 'cancel',
  Present: 'check_circle', Leave: 'event_busy', Absent: 'cancel',
  Low: 'warning', OK: 'check_circle',
  Normal: 'radio_button_unchecked', Urgent: 'priority_high', Express: 'bolt',
};

export function Badge({ s }) {
  const cls = CHIP_CLASS[s] || 'chip chip-gray';
  const icon = CHIP_ICON[s];
  return (
    <span className={cls}>
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{icon}</span>}
      {s}
    </span>
  );
}

export const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function todayLabel() {
  const d = new Date();
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
export function monthLabel() {
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
export function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Price calculator — handles single rate and slab pricing
export function calcPrice(item, qty, width, height) {
  if (!item) return { base: 0, gst: 0, total: 0, displayQty: 0, sizeStr: '', activeSlab: null };
  const q = parseFloat(qty) || 0;
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;

  let effectiveQty = 0;
  let sizeStr = '';

  if (item.unit === 'sq ft') {
    effectiveQty = w * h;
    sizeStr = `${w}×${h} ft`;
  } else if (item.unit === 'per 100 pcs') {
    effectiveQty = q;
    sizeStr = `${q} pcs`;
  } else if (item.unit === 'per piece') {
    effectiveQty = q;
    sizeStr = `${q} pcs`;
  } else {
    effectiveQty = 1;
    sizeStr = 'Fixed';
  }

  // Resolve rate — slab or single
  let rate = item.rate;
  let activeSlab = null;
  if (item.pricing_type === 'slab' && Array.isArray(item.slabs) && item.slabs.length > 0) {
    const sorted = [...item.slabs].sort((a, b) => a.min_qty - b.min_qty);
    const matching = sorted.filter(s => effectiveQty >= s.min_qty);
    activeSlab = matching.length > 0 ? matching[matching.length - 1] : sorted[0];
    rate = activeSlab.rate;
  }

  let base = 0;
  if (item.unit === 'sq ft') {
    base = effectiveQty * rate;
  } else if (item.unit === 'per 100 pcs') {
    base = Math.ceil(effectiveQty / 100) * rate;
  } else if (item.unit === 'per piece') {
    base = effectiveQty * rate;
  } else {
    base = rate;
  }

  const gst = base * 0.18;
  return {
    base: Math.round(base), gst: Math.round(gst),
    total: Math.round(base + gst), displayQty: effectiveQty,
    sizeStr, activeSlab,
  };
}

// Print quotation in new window
export function printQuotation(order, pricing) {
  const win = window.open('', '_blank', 'width=800,height=600');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  win.document.write(`<!DOCTYPE html><html><head><title>Quotation ${order.order_id || ''}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:680px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #213145;padding-bottom:16px;margin-bottom:24px}
    .logo{font-size:22px;font-weight:800;color:#213145}
    .logo span{display:block;font-size:11px;font-weight:400;color:#666;letter-spacing:2px;margin-top:2px}
    .badge{background:#213145;color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
    h2{font-size:15px;font-weight:700;color:#213145;margin:0 0 4px}
    .section{margin-bottom:20px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
    .row:last-child{border-bottom:none}
    .label{color:#666;font-size:13px}
    .val{font-weight:600;font-size:13px}
    .total-box{background:#f8f9ff;border:2px solid #213145;border-radius:8px;padding:16px;margin-top:16px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .total-row.big{font-size:18px;font-weight:800;color:#213145;border-top:1px solid #ddd;margin-top:8px;padding-top:8px}
    .sig{margin-top:40px;display:flex;justify-content:space-between}
    .sig-box{width:200px;border-top:1px solid #333;padding-top:8px;font-size:12px;color:#666}
    .note{margin-top:16px;font-size:11px;color:#888;text-align:center}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header">
    <div><div class="logo">Karekat Prints<span>PRINT SHOP ERP</span></div>
    <div style="font-size:12px;color:#666;margin-top:8px">Manjeri, Malappuram | Ph: 9000000000</div></div>
    <div style="text-align:right"><div class="badge">QUOTATION</div>
    <div style="font-size:12px;color:#666;margin-top:8px">${order.order_id || 'DRAFT'}<br/>${today}</div></div>
  </div>
  <div class="section">
    <h2>Customer Details</h2>
    <div class="row"><span class="label">Name</span><span class="val">${order.customer_name || '—'}</span></div>
    <div class="row"><span class="label">Phone</span><span class="val">${order.phone || '—'}</span></div>
  </div>
  <div class="section">
    <h2>Job Details</h2>
    <div class="row"><span class="label">Job Type</span><span class="val">${order.job_type || '—'}</span></div>
    <div class="row"><span class="label">Size / Specs</span><span class="val">${order.size || '—'}</span></div>
    <div class="row"><span class="label">Urgency</span><span class="val">${order.urgency || 'Normal'}</span></div>
    ${order.deadline ? `<div class="row"><span class="label">Deadline</span><span class="val">${order.deadline}</span></div>` : ''}
    ${order.notes ? `<div class="row"><span class="label">Notes</span><span class="val">${order.notes}</span></div>` : ''}
  </div>
  <div class="total-box">
    <div class="total-row"><span>Base amount (before GST)</span><span>₹${(pricing.base || order.base_amount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>GST @ 18%</span><span>₹${(pricing.gst || order.gst_amount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row big"><span>TOTAL</span><span>₹${(pricing.total || order.total_amount || 0).toLocaleString('en-IN')}</span></div>
  </div>
  <div class="sig">
    <div class="sig-box">Customer Signature<br/><br/>Date: ___________</div>
    <div class="sig-box">For Karekat Prints<br/><br/>Authorised Signatory</div>
  </div>
  <div class="note">This quotation is valid for 3 days from the date of issue. Subject to material availability.</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// Print delivery invoice
export function printInvoice(order, invoiceId) {
  const win = window.open('', '_blank', 'width=800,height=600');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoiceId}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:680px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #213145;padding-bottom:16px;margin-bottom:24px}
    .logo{font-size:22px;font-weight:800;color:#213145}
    .logo span{display:block;font-size:11px;font-weight:400;color:#666;letter-spacing:2px;margin-top:2px}
    .badge{background:#15803d;color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
    .label{color:#666;font-size:13px}
    .val{font-weight:600;font-size:13px}
    .total-box{background:#f0fdf4;border:2px solid #15803d;border-radius:8px;padding:16px;margin-top:16px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .total-row.big{font-size:18px;font-weight:800;color:#15803d;border-top:1px solid #ddd;margin-top:8px;padding-top:8px}
    .paid-stamp{text-align:center;margin-top:24px;font-size:28px;font-weight:900;color:#15803d;border:3px solid #15803d;border-radius:8px;padding:8px;transform:rotate(-5deg);width:160px;margin-left:auto}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header">
    <div><div class="logo">Karekat Prints<span>TAX INVOICE</span></div>
    <div style="font-size:12px;color:#666;margin-top:8px">Manjeri, Malappuram | GSTIN: 32XXXXX</div></div>
    <div style="text-align:right"><div class="badge">PAID</div>
    <div style="font-size:12px;color:#666;margin-top:8px">${invoiceId}<br/>${today}</div></div>
  </div>
  <div class="row"><span class="label">Customer</span><span class="val">${order.customer_name}</span></div>
  <div class="row"><span class="label">Phone</span><span class="val">${order.phone || '—'}</span></div>
  <div class="row"><span class="label">Job</span><span class="val">${order.job_type} — ${order.size}</span></div>
  <div class="row"><span class="label">Order Ref</span><span class="val">${order.order_id}</span></div>
  <div class="total-box">
    <div class="total-row"><span>Amount (before GST)</span><span>₹${Math.round(order.base_amount || order.amount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>GST @ 18%</span><span>₹${Math.round(order.gst_amount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row big"><span>Total Paid</span><span>₹${Math.round(order.total_amount || order.amount || 0).toLocaleString('en-IN')}</span></div>
  </div>
  <div class="paid-stamp">PAID ✓</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
