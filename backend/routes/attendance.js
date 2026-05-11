const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

router.get('/', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM staff ORDER BY name').all());
});

router.post('/mark-all', ownerOnly, (req, res) => {
  const allStaff = db.prepare("SELECT * FROM staff WHERE status = 'Present'").all();
  allStaff.forEach(s => {
    const newPresent = Math.min(s.present_days + 1, 22);
    db.prepare('UPDATE staff SET present_days = ? WHERE id = ?').run(newPresent, s.id);
  });
  res.json({ success: true, marked: allStaff.length });
});

router.put('/staff/:id', ownerOnly, (req, res) => {
  const { present_days, absent_days, leave_used, advance, status } = req.body;
  db.prepare('UPDATE staff SET present_days=?, absent_days=?, leave_used=?, advance=?, status=? WHERE id=?').run(
    present_days || 0, absent_days || 0, leave_used || 0, advance || 0, status || 'Present', req.params.id
  );
  res.json({ success: true });
});

router.get('/leaves', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM leave_requests ORDER BY id DESC').all());
});

router.post('/leaves', auth, (req, res) => {
  const { staff_name, from_date, to_date, reason } = req.body;
  db.prepare("INSERT INTO leave_requests (staff_name, from_date, to_date, reason, status) VALUES (?, ?, ?, ?, 'Pending')").run(
    staff_name, from_date, to_date, reason || ''
  );
  res.json({ success: true });
});

router.put('/leaves/:id', ownerOnly, (req, res) => {
  const { status } = req.body;
  const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, req.params.id);

  if (status === 'Approved') {
    const s = db.prepare('SELECT * FROM staff WHERE name = ?').get(leave.staff_name);
    if (s) {
      db.prepare("UPDATE staff SET leave_used = leave_used + 1, status = 'Leave' WHERE id = ?").run(s.id);
    }
  }
  res.json({ success: true });
});

module.exports = router;
