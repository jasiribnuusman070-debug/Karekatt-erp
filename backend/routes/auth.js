const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'karekat-erp-secret-2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.is_active === 0) return res.status(403).json({ error: 'Account deactivated. Contact owner.' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = {
    id: user.id, username: user.username, role: user.role,
    staff_name: user.staff_name, must_change_password: user.must_change_password || 0
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

// Change own password (force change or voluntary)
router.put('/change-password', auth, (req, res) => {
  const { new_password, current_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // If not force-change, verify current password
  if (!user.must_change_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password required' });
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?').run(hash, req.user.id);

  const payload = {
    id: user.id, username: user.username, role: user.role,
    staff_name: user.staff_name, must_change_password: 0
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: payload });
});

module.exports = router;
