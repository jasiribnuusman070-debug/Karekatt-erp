const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

function notify(to_role, order_id, order_ref, message, from_role) {
  db.prepare('INSERT INTO notifications (to_role,from_role,order_id,order_ref,message) VALUES (?,?,?,?,?)').run(to_role, from_role || '', order_id, order_ref || '', message);
}

// GET / — role-filtered
router.get('/', (req, res) => {
  const { role, staff_name } = req.user;
  const firstName = (staff_name || '').split(' ')[0];
  let orders;
  if (role === 'owner')
    orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  else if (role === 'receptionist')
    orders = db.prepare("SELECT * FROM orders WHERE status NOT IN ('Delivered','Cancelled') ORDER BY id DESC").all();
  else if (role === 'design_head')
    orders = db.prepare("SELECT * FROM orders WHERE status IN ('Confirmed','In Design','Design Complete') ORDER BY id DESC").all();
  else if (role === 'designer')
    orders = db.prepare("SELECT * FROM orders WHERE designer_name=? AND status IN ('In Design','Design Complete') ORDER BY id DESC").all(firstName);
  else if (role === 'print_dept')
    orders = db.prepare("SELECT * FROM orders WHERE status IN ('Design Approved','Printing','Cutting','Finishing','Ready') ORDER BY id DESC").all();
  else
    orders = db.prepare('SELECT * FROM orders WHERE assigned_to=? ORDER BY id DESC').all(firstName);
  res.json(orders);
});

// GET /all — owner only, for reporting
router.get('/all', (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all());
});

// POST / — receptionist or owner
router.post('/', (req, res) => {
  const { role } = req.user;
  if (!['receptionist', 'owner'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
  const {
    customer_name, phone, job_type, size, qty, unit, rate_per_unit,
    base_amount, gst_amount, total_amount, discount_pct, discount_amount,
    material_cost, deadline, urgency, notes
  } = req.body;
  const ba = parseFloat(base_amount) || 0;
  const ga = parseFloat(gst_amount) || 0;
  const ta = parseFloat(total_amount) || 0;
  const dp = parseFloat(discount_pct) || 0;
  const da = parseFloat(discount_amount) || 0;
  const mc = parseFloat(material_cost) || 0;

  const result = db.prepare(`
    INSERT INTO orders (customer_name,phone,job_type,size,qty,unit,rate_per_unit,
      base_amount,gst_amount,total_amount,amount,discount_pct,discount_amount,
      material_cost,deadline,urgency,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Received',?)
  `).run(
    customer_name, phone || '', job_type, size || '',
    parseFloat(qty) || 1, unit || '', parseFloat(rate_per_unit) || 0,
    ba, ga, ta, ba, dp, da, mc,
    deadline || '', urgency || 'Normal', notes || ''
  );
  const id = result.lastInsertRowid;
  const ref = `ORD-${String(id).padStart(3, '0')}`;
  db.prepare('UPDATE orders SET order_id=? WHERE id=?').run(ref, id);

  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT * FROM customers WHERE LOWER(name)=LOWER(?)').get(customer_name || '');
  if (existing) {
    db.prepare('UPDATE customers SET order_count=order_count+1, last_order=?, phone=? WHERE id=?').run(today, phone || existing.phone, existing.id);
  } else if (customer_name) {
    db.prepare('INSERT INTO customers (name,phone,order_count,last_order) VALUES (?,?,1,?)').run(customer_name, phone || '', today);
  }
  res.json({ success: true, id, order_id: ref });
});

// PUT /:id — workflow actions
router.put('/:id', (req, res) => {
  const { role } = req.user;
  const id = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const {
    action, status, designer_name, urgency, design_notes,
    rejection_reason, print_notes, customer_name, phone,
    job_type, size, deadline, notes, assigned_to,
    cancel_reason, reprint_reason, no_extra_charge
  } = req.body;

  // Cancel — receptionist or owner
  if (action === 'cancel' && ['receptionist', 'owner'].includes(role)) {
    db.prepare("UPDATE orders SET status='Cancelled',cancelled=1,cancel_reason=? WHERE id=?").run(cancel_reason || '', id);
    notify('design_head', id, order.order_id, `${order.order_id} (${order.customer_name}) was cancelled`, role);
    return res.json({ success: true });
  }

  // Reprint — receptionist or owner creates new order
  if (action === 'reprint' && ['receptionist', 'owner'].includes(role)) {
    const noExtra = no_extra_charge ? 1 : 0;
    const newAmt = noExtra ? 0 : (order.total_amount || order.amount);
    const result = db.prepare(`
      INSERT INTO orders (customer_name,phone,job_type,size,qty,unit,rate_per_unit,
        base_amount,gst_amount,total_amount,amount,deadline,urgency,status,notes,
        is_reprint,reprint_reason,no_extra_charge)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'Received',?,1,?,?)
    `).run(
      order.customer_name, order.phone, order.job_type, order.size,
      order.qty, order.unit, noExtra ? 0 : order.rate_per_unit,
      noExtra ? 0 : order.base_amount, noExtra ? 0 : order.gst_amount,
      newAmt, newAmt,
      order.deadline, order.urgency, `Reprint of ${order.order_id}`,
      reprint_reason || '', noExtra
    );
    const newId = result.lastInsertRowid;
    const ref = `ORD-${String(newId).padStart(3, '0')}`;
    db.prepare('UPDATE orders SET order_id=? WHERE id=?').run(ref, newId);
    notify('design_head', newId, ref, `Reprint: ${ref} for ${order.customer_name} (original: ${order.order_id})`, role);
    return res.json({ success: true, id: newId, order_id: ref });
  }

  if (role === 'owner') {
    const ns = status || order.status;
    db.prepare('UPDATE orders SET status=?,customer_name=?,phone=?,job_type=?,size=?,deadline=?,urgency=?,notes=?,designer_name=?,assigned_to=? WHERE id=?').run(
      ns, customer_name || order.customer_name, phone || order.phone,
      job_type || order.job_type, size || order.size,
      deadline || order.deadline, urgency || order.urgency,
      notes || order.notes, designer_name || order.designer_name,
      assigned_to || order.assigned_to, id
    );
  } else if (role === 'receptionist') {
    if (action === 'confirm') {
      db.prepare("UPDATE orders SET status='Confirmed' WHERE id=? AND status='Received'").run(id);
      notify('design_head', id, order.order_id, `${order.order_id} (${order.customer_name}) confirmed — needs design assignment`, 'receptionist');
    } else if (action === 'deliver') {
      db.prepare("UPDATE orders SET status='Delivered' WHERE id=?").run(id);
      const invRes = db.prepare("INSERT INTO invoices (customer_name,description,amount,gst_rate,order_id,status) VALUES (?,?,?,18,?,'Paid')").run(
        order.customer_name, `${order.job_type} — ${order.size}`, order.base_amount || order.amount, id
      );
      db.prepare('UPDATE invoices SET invoice_id=? WHERE id=?').run(`INV-${String(invRes.lastInsertRowid).padStart(3,'0')}`, invRes.lastInsertRowid);
      const cust = db.prepare('SELECT * FROM customers WHERE LOWER(name)=LOWER(?)').get(order.customer_name || '');
      if (cust) db.prepare('UPDATE customers SET total_spent=total_spent+? WHERE id=?').run(order.total_amount || order.amount, cust.id);
    }
  } else if (role === 'design_head') {
    const dhFirstName = (req.user.staff_name || '').split(' ')[0];
    if (action === 'assign') {
      // '__self__' = assign to design head themselves
      const targetName = designer_name === '__self__' ? dhFirstName : (designer_name || '');
      db.prepare("UPDATE orders SET status='In Design',designer_name=?,urgency=?,rejection_reason='' WHERE id=?").run(targetName, urgency || order.urgency, id);
      if (designer_name !== '__self__') {
        notify('designer', id, order.order_id, `${order.order_id} (${order.customer_name}) assigned to you`, 'design_head');
      }
    } else if (action === 'complete') {
      // Design head completing their own self-assigned job
      db.prepare("UPDATE orders SET status='Design Complete',design_notes=? WHERE id=?").run(design_notes || '', id);
      notify('design_head', id, order.order_id, `${order.order_id} (${order.customer_name}) self-design complete — ready for review`, 'design_head');
    } else if (action === 'approve') {
      db.prepare("UPDATE orders SET status='Design Approved' WHERE id=?").run(id);
      notify('print_dept', id, order.order_id, `${order.order_id} (${order.customer_name}) approved — ready for print`, 'design_head');
    } else if (action === 'reject') {
      db.prepare("UPDATE orders SET status='In Design',rejection_reason=? WHERE id=?").run(rejection_reason || 'Needs revision', id);
      notify('designer', id, order.order_id, `${order.order_id} design rejected: ${rejection_reason || 'needs revision'}`, 'design_head');
    }
  } else if (role === 'designer') {
    if (action === 'complete') {
      db.prepare("UPDATE orders SET status='Design Complete',design_notes=? WHERE id=?").run(design_notes || '', id);
      notify('design_head', id, order.order_id, `${order.order_id} (${order.customer_name}) design complete — ready for review`, 'designer');
    }
  } else if (role === 'print_dept') {
    const valid = ['Printing', 'Cutting', 'Finishing', 'Ready'];
    if (status && valid.includes(status)) {
      db.prepare('UPDATE orders SET status=?,print_notes=? WHERE id=?').run(status, print_notes || order.print_notes || '', id);
      if (status === 'Ready') {
        notify('receptionist', id, order.order_id, `${order.order_id} (${order.customer_name}) is Ready for pickup`, 'print_dept');
      }
    }
  }
  res.json({ success: true });
});

// DELETE /:id — owner only
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
