const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// GET all — include slabs
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM rate_card ORDER BY id').all();
  const slabs = db.prepare('SELECT * FROM rate_card_slabs ORDER BY rate_card_id, min_qty').all();
  const result = items.map(item => ({
    ...item,
    slabs: slabs.filter(s => s.rate_card_id === item.id),
  }));
  res.json(result);
});

router.post('/', ownerOnly, (req, res) => {
  const { job_type, unit, rate, min_qty, description, pricing_type, slabs } = req.body;
  const result = db.prepare('INSERT INTO rate_card (job_type,unit,rate,min_qty,description,pricing_type) VALUES (?,?,?,?,?,?)').run(
    job_type, unit || 'per piece', parseFloat(rate) || 0,
    parseFloat(min_qty) || 1, description || '', pricing_type || 'single'
  );
  const id = result.lastInsertRowid;
  if (pricing_type === 'slab' && Array.isArray(slabs)) {
    const ins = db.prepare('INSERT INTO rate_card_slabs (rate_card_id,min_qty,max_qty,rate) VALUES (?,?,?,?)');
    slabs.forEach(s => ins.run(id, parseFloat(s.min_qty) || 0, parseFloat(s.max_qty) || 999999, parseFloat(s.rate) || 0));
  }
  res.json({ success: true, id });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { job_type, unit, rate, min_qty, description, pricing_type, slabs } = req.body;
  const id = req.params.id;
  db.prepare('UPDATE rate_card SET job_type=?,unit=?,rate=?,min_qty=?,description=?,pricing_type=? WHERE id=?').run(
    job_type, unit, parseFloat(rate) || 0, parseFloat(min_qty) || 1,
    description || '', pricing_type || 'single', id
  );
  // Replace slabs
  db.prepare('DELETE FROM rate_card_slabs WHERE rate_card_id=?').run(id);
  if (pricing_type === 'slab' && Array.isArray(slabs)) {
    const ins = db.prepare('INSERT INTO rate_card_slabs (rate_card_id,min_qty,max_qty,rate) VALUES (?,?,?,?)');
    slabs.forEach(s => ins.run(id, parseFloat(s.min_qty) || 0, parseFloat(s.max_qty) || 999999, parseFloat(s.rate) || 0));
  }
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM rate_card_slabs WHERE rate_card_id=?').run(req.params.id);
  db.prepare('DELETE FROM rate_card WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
