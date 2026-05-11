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
  res.json(db.prepare('SELECT * FROM customers ORDER BY name').all());
});

// Phone lookup for receptionist — returns customer + order history
router.get('/lookup', (req, res) => {
  if (!['owner', 'receptionist'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const customer = db.prepare('SELECT * FROM customers WHERE phone LIKE ?').get(`%${phone}%`);
  if (!customer) return res.json({ customer: null, orders: [] });
  const orders = db.prepare('SELECT * FROM orders WHERE phone LIKE ? ORDER BY id DESC LIMIT 20').all(`%${phone}%`);
  res.json({ customer, orders });
});

// Order history by customer id
router.get('/:id/orders', ownerOnly, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  const orders = db.prepare('SELECT * FROM orders WHERE LOWER(customer_name)=LOWER(?) ORDER BY id DESC').all(customer.name);
  res.json({ customer, orders });
});

router.post('/', ownerOnly, (req, res) => {
  const { name, phone, business_name, area } = req.body;
  db.prepare('INSERT INTO customers (name, phone, business_name, area, order_count, total_spent) VALUES (?, ?, ?, ?, 0, 0)').run(name, phone || '', business_name || '', area || '');
  res.json({ success: true });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { name, phone, business_name, area } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, business_name=?, area=? WHERE id=?').run(name, phone || '', business_name || '', area || '', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
