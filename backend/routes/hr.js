const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// === ADVANCE REQUESTS ===
router.get('/advances', (req, res) => {
  if (req.user.role === 'owner') {
    res.json(db.prepare('SELECT * FROM advance_requests ORDER BY id DESC').all());
  } else {
    const staff = db.prepare('SELECT id FROM staff WHERE LOWER(name)=LOWER(?)').get(req.user.staff_name || '');
    const sid = staff ? staff.id : -1;
    res.json(db.prepare('SELECT * FROM advance_requests WHERE staff_id=? ORDER BY id DESC').all(sid));
  }
});

router.post('/advances', (req, res) => {
  const { amount, reason, deduct_month } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const name = req.user.staff_name || req.user.username;
  const staff = db.prepare('SELECT id FROM staff WHERE LOWER(name)=LOWER(?)').get(name);
  const sid = staff ? staff.id : 0;
  db.prepare('INSERT INTO advance_requests (staff_id,staff_name,amount,reason,deduct_month) VALUES (?,?,?,?,?)')
    .run(sid, name, parseFloat(amount), reason || '', deduct_month || '');
  res.json({ success: true });
});

router.put('/advances/:id/approve', ownerOnly, (req, res) => {
  const { deduct_month } = req.body;
  const adv = db.prepare('SELECT * FROM advance_requests WHERE id=?').get(req.params.id);
  if (!adv) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE advance_requests SET status=?,approved_by=?,deduct_month=? WHERE id=?')
    .run('Approved', req.user.staff_name || 'Owner', deduct_month || adv.deduct_month, req.params.id);
  // Add to staff advance balance
  db.prepare('UPDATE staff SET advance=advance+? WHERE id=?').run(adv.amount, adv.staff_id);
  res.json({ success: true });
});

router.put('/advances/:id/reject', ownerOnly, (req, res) => {
  db.prepare('UPDATE advance_requests SET status=?,approved_by=? WHERE id=?')
    .run('Rejected', req.user.staff_name || 'Owner', req.params.id);
  res.json({ success: true });
});

// === HOLIDAYS ===
router.get('/holidays', (req, res) => {
  res.json(db.prepare('SELECT * FROM holidays ORDER BY date').all());
});

router.post('/holidays', ownerOnly, (req, res) => {
  const { date, name, type } = req.body;
  if (!date || !name) return res.status(400).json({ error: 'date and name required' });
  try {
    db.prepare('INSERT INTO holidays (date,name,type) VALUES (?,?,?)').run(date, name, type || 'public');
    res.json({ success: true });
  } catch { res.status(409).json({ error: 'Holiday already exists for that date' }); }
});

router.delete('/holidays/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM holidays WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// === PERFORMANCE NOTES ===
router.get('/performance', ownerOnly, (req, res) => {
  const { staff_id, month, year } = req.query;
  let q = 'SELECT * FROM performance_notes WHERE 1=1';
  const params = [];
  if (staff_id) { q += ' AND staff_id=?'; params.push(staff_id); }
  if (month)    { q += ' AND month=?';    params.push(month); }
  if (year)     { q += ' AND year=?';     params.push(year); }
  q += ' ORDER BY year DESC, month DESC, id DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/performance', ownerOnly, (req, res) => {
  const { staff_id, staff_name, month, year, notes, rating } = req.body;
  db.prepare('INSERT INTO performance_notes (staff_id,staff_name,month,year,notes,rating,created_by) VALUES (?,?,?,?,?,?,?)')
    .run(staff_id, staff_name || '', month, year, notes || '', rating || 3, req.user.staff_name || 'Owner');
  res.json({ success: true });
});

router.delete('/performance/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM performance_notes WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// === SALARY REVISIONS ===
router.get('/salary-revisions', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM salary_revisions ORDER BY id DESC').all());
});

router.post('/salary-revisions', ownerOnly, (req, res) => {
  const { staff_id, staff_name, effective_date, new_salary, reason } = req.body;
  if (!staff_id || !new_salary || !effective_date) return res.status(400).json({ error: 'Missing fields' });
  const staff = db.prepare('SELECT * FROM staff WHERE id=?').get(staff_id);
  if (!staff) return res.status(404).json({ error: 'Staff not found' });
  db.prepare('INSERT INTO salary_revisions (staff_id,staff_name,effective_date,old_salary,new_salary,reason) VALUES (?,?,?,?,?,?)')
    .run(staff_id, staff_name || staff.name, effective_date, staff.salary, parseFloat(new_salary), reason || '');
  db.prepare('UPDATE staff SET salary=? WHERE id=?').run(parseFloat(new_salary), staff_id);
  res.json({ success: true });
});

// === LEAVE BALANCES (all staff, for HR config view) ===
router.get('/leave-balances', ownerOnly, (req, res) => {
  const year = new Date().getFullYear();
  const staff = db.prepare('SELECT * FROM staff').all();
  const result = staff.map(s => {
    let bal = db.prepare('SELECT * FROM leave_balances WHERE staff_id=? AND year=?').get(s.id, year);
    if (!bal) {
      db.prepare('INSERT OR IGNORE INTO leave_balances (staff_id,year) VALUES (?,?)').run(s.id, year);
      bal = db.prepare('SELECT * FROM leave_balances WHERE staff_id=? AND year=?').get(s.id, year);
    }
    return bal || { staff_id: s.id, year, casual_total:12, casual_used:0, sick_total:6, sick_used:0, earned_total:15, earned_used:0 };
  });
  res.json(result);
});

// === EXIT RECORDS ===
router.get('/exits', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM exit_records ORDER BY id DESC').all());
});
router.get('/exit', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM exit_records ORDER BY id DESC').all());
});

router.post('/exits', ownerOnly, (req, res) => {
  const { staff_id, last_day, reason, settlement_amount, notes } = req.body;
  if (!staff_id || !last_day) return res.status(400).json({ error: 'Missing fields' });
  const s = db.prepare('SELECT name FROM staff WHERE id=?').get(staff_id);
  db.prepare('INSERT INTO exit_records (staff_id,staff_name,last_day,reason,settlement_amount,notes) VALUES (?,?,?,?,?,?)')
    .run(staff_id, s?.name||'', last_day, reason||'Resignation', parseFloat(settlement_amount)||0, notes||'');
  res.json({ success: true });
});
router.post('/exit', ownerOnly, (req, res) => {
  const { staff_id, staff_name, last_day, settlement_amount, notes } = req.body;
  if (!staff_id || !last_day) return res.status(400).json({ error: 'Missing fields' });
  db.prepare('INSERT INTO exit_records (staff_id,staff_name,last_day,settlement_amount,notes) VALUES (?,?,?,?,?)')
    .run(staff_id, staff_name || '', last_day, parseFloat(settlement_amount) || 0, notes || '');
  res.json({ success: true });
});

module.exports = router;
