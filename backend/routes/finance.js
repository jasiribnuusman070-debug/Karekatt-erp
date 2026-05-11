const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

router.get('/expenses', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all());
});

router.post('/expenses', ownerOnly, (req, res) => {
  const { date, category, description, amount } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO expenses (date, category, description, amount) VALUES (?, ?, ?, ?)').run(date || today, category, description || '', amount || 0);
  res.json({ success: true });
});

router.delete('/expenses/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/summary', ownerOnly, (req, res) => {
  const invoices = db.prepare('SELECT * FROM invoices').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  const staff = db.prepare('SELECT * FROM staff').all();

  const revenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount * (1 + i.gst_rate / 100), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const wdays = 22;
  const payroll = staff.reduce((s, st) => {
    const ded = Math.round(st.absent_days * (st.salary / wdays));
    return s + (st.salary - ded - st.advance);
  }, 0);

  res.json({ revenue, totalExpenses, payroll, profit: revenue - totalExpenses - payroll });
});

module.exports = router;
