const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const canAccess = (req, res, next) => {
  if (!['owner', 'receptionist'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// GET all entries (owner) or last 30 days (receptionist)
router.get('/', canAccess, (req, res) => {
  const entries = db.prepare('SELECT * FROM cash_register ORDER BY date DESC LIMIT 60').all();
  res.json(entries);
});

// GET today's entry
router.get('/today', canAccess, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const entry = db.prepare('SELECT * FROM cash_register WHERE date = ?').get(today);
  // Also get today's expenses
  const expenses = db.prepare("SELECT * FROM expenses WHERE date = ? ORDER BY id DESC").all(today);
  // Get today's collections from delivered orders
  const collections = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ? AND status = 'Delivered'").get(today);
  res.json({ entry, expenses, collections: collections.total || 0, today });
});

// POST / PUT — upsert today's entry
router.post('/', canAccess, (req, res) => {
  const { date, opening_balance, cash_in, upi_in, expenses_out, notes } = req.body;
  const d = date || new Date().toISOString().slice(0, 10);
  const closing = (parseFloat(opening_balance) || 0) + (parseFloat(cash_in) || 0) + (parseFloat(upi_in) || 0) - (parseFloat(expenses_out) || 0);
  const existing = db.prepare('SELECT id FROM cash_register WHERE date = ?').get(d);
  if (existing) {
    db.prepare('UPDATE cash_register SET opening_balance=?,cash_in=?,upi_in=?,expenses_out=?,closing_balance=?,notes=?,created_by=?,updated_at=datetime("now") WHERE date=?').run(
      parseFloat(opening_balance) || 0, parseFloat(cash_in) || 0, parseFloat(upi_in) || 0, parseFloat(expenses_out) || 0, closing, notes || '', req.user.staff_name || req.user.username, d
    );
  } else {
    db.prepare('INSERT INTO cash_register (date,opening_balance,cash_in,upi_in,expenses_out,closing_balance,notes,created_by) VALUES (?,?,?,?,?,?,?,?)').run(
      d, parseFloat(opening_balance) || 0, parseFloat(cash_in) || 0, parseFloat(upi_in) || 0, parseFloat(expenses_out) || 0, closing, notes || '', req.user.staff_name || req.user.username
    );
  }
  res.json({ success: true, closing });
});

// Quick expense entry — adds to both expenses table and updates cash_register
router.post('/quick-expense', canAccess, (req, res) => {
  const { category, description, amount } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  const amt = parseFloat(amount) || 0;
  // Add to expenses
  db.prepare('INSERT INTO expenses (date,category,description,amount) VALUES (?,?,?,?)').run(today, category || 'Other', description || '', amt);
  // Update today's cash_register expenses_out
  const entry = db.prepare('SELECT * FROM cash_register WHERE date = ?').get(today);
  if (entry) {
    const newExp = entry.expenses_out + amt;
    const newClose = entry.opening_balance + entry.cash_in + entry.upi_in - newExp;
    db.prepare('UPDATE cash_register SET expenses_out=?,closing_balance=?,updated_at=datetime("now") WHERE date=?').run(newExp, newClose, today);
  }
  res.json({ success: true });
});

module.exports = router;
