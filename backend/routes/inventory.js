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
  res.json(db.prepare('SELECT * FROM inventory ORDER BY name').all());
});

router.post('/', ownerOnly, (req, res) => {
  const { name, unit, qty, reorder_level } = req.body;
  db.prepare('INSERT INTO inventory (name, unit, qty, reorder_level) VALUES (?, ?, ?, ?)').run(name, unit || 'pcs', qty || 0, reorder_level || 0);
  res.json({ success: true });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { name, unit, qty, reorder_level } = req.body;
  db.prepare('UPDATE inventory SET name=?, unit=?, qty=?, reorder_level=? WHERE id=?').run(name, unit, qty || 0, reorder_level || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
