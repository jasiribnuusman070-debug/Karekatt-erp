const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

function getStaffId(staff_name) {
  const s = db.prepare('SELECT id FROM staff WHERE LOWER(name)=LOWER(?)').get(staff_name || '');
  return s ? s.id : 0;
}

function ensureBalance(staff_id, year) {
  const existing = db.prepare('SELECT * FROM leave_balances WHERE staff_id=? AND year=?').get(staff_id, year);
  if (!existing) {
    db.prepare('INSERT OR IGNORE INTO leave_balances (staff_id,year) VALUES (?,?)').run(staff_id, year);
  }
  return db.prepare('SELECT * FROM leave_balances WHERE staff_id=? AND year=?').get(staff_id, year);
}

// GET all requests — owner sees all, staff sees own
router.get('/', (req, res) => {
  if (req.user.role === 'owner') {
    res.json(db.prepare('SELECT * FROM leave_requests ORDER BY id DESC').all());
  } else {
    res.json(db.prepare("SELECT * FROM leave_requests WHERE LOWER(staff_name)=LOWER(?) ORDER BY id DESC").all(req.user.staff_name || ''));
  }
});

// Apply for leave (any staff)
router.post('/', (req, res) => {
  const { from_date, to_date, leave_type, reason, notes } = req.body;
  if (!from_date || !to_date || !leave_type) return res.status(400).json({ error: 'from_date, to_date, leave_type required' });
  const name = req.user.staff_name || req.user.username;
  const staff_id = getStaffId(name);
  const d1 = new Date(from_date), d2 = new Date(to_date);
  const days = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  db.prepare('INSERT INTO leave_requests (staff_name,staff_id,from_date,to_date,reason,status,leave_type,days,notes) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(name, staff_id, from_date, to_date, reason || '', 'Pending', leave_type, days, notes || '');
  res.json({ success: true });
});

// Approve (owner)
router.put('/:id/approve', ownerOnly, (req, res) => {
  const req_rec = db.prepare('SELECT * FROM leave_requests WHERE id=?').get(req.params.id);
  if (!req_rec) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE leave_requests SET status=?,handled_by=? WHERE id=?').run('Approved', req.user.staff_name || 'Owner', req.params.id);
  // Deduct from leave balance
  if (req_rec.staff_id) {
    const year = new Date(req_rec.from_date).getFullYear();
    ensureBalance(req_rec.staff_id, year);
    const col = req_rec.leave_type === 'Casual' ? 'casual_used' : req_rec.leave_type === 'Sick' ? 'sick_used' : 'earned_used';
    db.prepare(`UPDATE leave_balances SET ${col}=${col}+? WHERE staff_id=? AND year=?`).run(req_rec.days || 1, req_rec.staff_id, year);
  }
  res.json({ success: true });
});

// Reject (owner)
router.put('/:id/reject', ownerOnly, (req, res) => {
  db.prepare('UPDATE leave_requests SET status=?,handled_by=? WHERE id=?').run('Rejected', req.user.staff_name || 'Owner', req.params.id);
  res.json({ success: true });
});

// Get own leave balance
router.get('/balance', (req, res) => {
  const name = req.user.staff_name || req.user.username;
  const staff_id = getStaffId(name);
  if (!staff_id) return res.json({ casual: { total: 12, used: 0 }, sick: { total: 6, used: 0 }, earned: { total: 15, used: 0 } });
  const year = new Date().getFullYear();
  const bal = ensureBalance(staff_id, year);
  res.json({
    casual: { total: bal.casual_total, used: bal.casual_used, remaining: bal.casual_total - bal.casual_used },
    sick:   { total: bal.sick_total,   used: bal.sick_used,   remaining: bal.sick_total - bal.sick_used },
    earned: { total: bal.earned_total, used: bal.earned_used, remaining: bal.earned_total - bal.earned_used },
  });
});

// Get balance for any staff (owner)
router.get('/balance/:staff_id', ownerOnly, (req, res) => {
  const year = new Date().getFullYear();
  const bal = ensureBalance(parseInt(req.params.staff_id), year);
  res.json(bal);
});

// Update leave limits (owner)
router.put('/balance/:staff_id', ownerOnly, (req, res) => {
  const { casual_total, sick_total, earned_total, year } = req.body;
  const sid = parseInt(req.params.staff_id);
  const y = year || new Date().getFullYear();
  ensureBalance(sid, y);
  db.prepare('UPDATE leave_balances SET casual_total=?,sick_total=?,earned_total=? WHERE staff_id=? AND year=?')
    .run(casual_total || 12, sick_total || 6, earned_total || 15, sid, y);
  res.json({ success: true });
});

module.exports = router;
