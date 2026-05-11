const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// design_head needs staff list to assign designers
router.get('/', (req, res) => {
  if (!['owner', 'design_head'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
  // Attach user account info
  const result = staff.map(s => {
    const u = db.prepare('SELECT id, username, role, is_active, must_change_password FROM users WHERE LOWER(staff_name)=LOWER(?)').get(s.name);
    return { ...s, user: u || null };
  });
  res.json(result);
});

// Get own profile (any logged-in user)
router.get('/me', (req, res) => {
  const s = db.prepare('SELECT * FROM staff WHERE LOWER(name)=LOWER(?)').get(req.user.staff_name || '');
  const u = db.prepare('SELECT id, username, role, is_active, must_change_password FROM users WHERE id=?').get(req.user.id);
  res.json({ staff: s || null, user: u });
});

// Update own profile (limited fields)
router.put('/me', (req, res) => {
  const { phone } = req.body;
  const s = db.prepare('SELECT * FROM staff WHERE LOWER(name)=LOWER(?)').get(req.user.staff_name || '');
  if (s && phone) db.prepare('UPDATE staff SET phone=? WHERE id=?').run(phone, s.id);
  res.json({ success: true });
});

router.post('/', ownerOnly, (req, res) => {
  const { name, role, phone, salary, join_date, annual_leave, employment_type, shift,
          username, temp_password, login_role } = req.body;

  const result = db.prepare(`
    INSERT INTO staff (name,role,phone,salary,join_date,annual_leave,present_days,
      absent_days,leave_used,advance,status,employment_type,shift)
    VALUES (?,?,?,?,?,?,0,0,0,0,'Present',?,?)
  `).run(name, role, phone || '', salary || 0, join_date || '',
         annual_leave || 12, employment_type || 'Full-time', shift || 'Morning');

  const staffId = result.lastInsertRowid;
  const uname = (username || name.split(' ')[0]).toLowerCase().replace(/\s+/g, '');
  const pw = temp_password || 'staff2024';
  const hash = bcrypt.hashSync(pw, 10);
  const lrole = login_role || 'staff';

  let uid;
  try {
    const ur = db.prepare('INSERT INTO users (username,password_hash,role,staff_name,must_change_password,is_active) VALUES (?,?,?,?,1,1)')
      .run(uname, hash, lrole, name);
    uid = ur.lastInsertRowid;
  } catch {
    const ur = db.prepare('INSERT INTO users (username,password_hash,role,staff_name,must_change_password,is_active) VALUES (?,?,?,?,1,1)')
      .run(uname + staffId, hash, lrole, name);
    uid = ur.lastInsertRowid;
  }

  res.json({ success: true, id: staffId, username: uname, temp_password: pw });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { name, role, phone, salary, join_date, annual_leave, advance, status,
          present_days, absent_days, employment_type, shift } = req.body;
  db.prepare(`UPDATE staff SET name=?,role=?,phone=?,salary=?,join_date=?,annual_leave=?,
    advance=?,status=?,present_days=?,absent_days=?,employment_type=?,shift=? WHERE id=?`).run(
    name, role, phone || '', salary || 0, join_date || '', annual_leave || 12,
    advance || 0, status || 'Present', present_days || 0, absent_days || 0,
    employment_type || 'Full-time', shift || 'Morning', req.params.id
  );
  res.json({ success: true });
});

// Reset password (owner)
router.post('/:id/reset-password', ownerOnly, (req, res) => {
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ error: 'new_password required' });
  const s = db.prepare('SELECT * FROM staff WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Staff not found' });
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash=?,must_change_password=1 WHERE LOWER(staff_name)=LOWER(?)').run(hash, s.name);
  res.json({ success: true, temp_password: new_password });
});

// Change role (owner)
router.post('/:id/change-role', ownerOnly, (req, res) => {
  const { login_role } = req.body;
  const s = db.prepare('SELECT * FROM staff WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE users SET role=? WHERE LOWER(staff_name)=LOWER(?)').run(login_role, s.name);
  res.json({ success: true });
});

// Deactivate / activate (owner)
router.post('/:id/deactivate', ownerOnly, (req, res) => {
  const s = db.prepare('SELECT * FROM staff WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE users SET is_active=0 WHERE LOWER(staff_name)=LOWER(?)').run(s.name);
  res.json({ success: true });
});
router.post('/:id/activate', ownerOnly, (req, res) => {
  const s = db.prepare('SELECT * FROM staff WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE users SET is_active=1 WHERE LOWER(staff_name)=LOWER(?)').run(s.name);
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
