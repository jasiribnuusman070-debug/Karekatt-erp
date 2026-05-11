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
  res.json(db.prepare('SELECT * FROM invoices ORDER BY id DESC').all());
});

router.post('/', ownerOnly, (req, res) => {
  const { customer_name, description, amount, gst_rate } = req.body;
  const result = db.prepare(`INSERT INTO invoices (customer_name, description, amount, gst_rate, status) VALUES (?, ?, ?, ?, 'Pending')`).run(customer_name, description || '', amount || 0, gst_rate || 18);
  const id = result.lastInsertRowid;
  db.prepare('UPDATE invoices SET invoice_id = ? WHERE id = ?').run(`INV-${String(id).padStart(3, '0')}`, id);

  const existing = db.prepare('SELECT * FROM customers WHERE LOWER(name) = LOWER(?)').get(customer_name || '');
  if (existing) {
    db.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?').run(amount || 0, existing.id);
  }
  res.json({ success: true, id });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
