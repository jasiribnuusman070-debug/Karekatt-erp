const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// === SUPPLIERS ===
router.get('/', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

router.post('/', ownerOnly, (req, res) => {
  const { name, phone, material_type, address, notes } = req.body;
  const r = db.prepare('INSERT INTO suppliers (name,phone,material_type,address,notes) VALUES (?,?,?,?,?)').run(name, phone || '', material_type || '', address || '', notes || '');
  res.json({ success: true, id: r.lastInsertRowid });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { name, phone, material_type, address, notes } = req.body;
  db.prepare('UPDATE suppliers SET name=?,phone=?,material_type=?,address=?,notes=? WHERE id=?').run(name, phone || '', material_type || '', address || '', notes || '', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// === STOCK PURCHASES ===
router.get('/purchases', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM stock_purchases ORDER BY date DESC, id DESC').all());
});

router.post('/purchases', ownerOnly, (req, res) => {
  const { date, supplier_id, supplier_name, inventory_id, material_name, qty, unit, unit_price, notes } = req.body;
  const q = parseFloat(qty) || 0;
  const up = parseFloat(unit_price) || 0;
  const total = q * up;
  db.prepare('INSERT INTO stock_purchases (date,supplier_id,supplier_name,inventory_id,material_name,qty,unit,unit_price,total_amount,notes) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    date, parseInt(supplier_id) || 0, supplier_name || '', parseInt(inventory_id) || 0, material_name || '', q, unit || '', up, total, notes || ''
  );
  // Auto-update inventory
  if (inventory_id && q > 0) {
    db.prepare('UPDATE inventory SET qty = qty + ? WHERE id = ?').run(q, parseInt(inventory_id));
  }
  // Add to expenses
  if (total > 0) {
    db.prepare("INSERT INTO expenses (date,category,description,amount) VALUES (?,?,?,?)").run(date, 'Materials', `Stock: ${material_name || 'purchase'} from ${supplier_name || 'supplier'}`, total);
  }
  res.json({ success: true });
});

router.delete('/purchases/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM stock_purchases WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Supplier purchase history
router.get('/:id/purchases', ownerOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM stock_purchases WHERE supplier_id=? ORDER BY date DESC').all(req.params.id));
});

module.exports = router;
