const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// === MACHINES ===
router.get('/', (req, res) => {
  // all roles can view machines (for awareness of breakdowns)
  const machines = db.prepare('SELECT * FROM machines ORDER BY name').all();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const result = machines.map(m => ({
    ...m,
    service_alert: m.next_service_due && m.next_service_due <= today ? 'overdue'
                 : m.next_service_due && m.next_service_due <= soon ? 'due_soon'
                 : 'ok',
  }));
  res.json(result);
});

router.post('/', ownerOnly, (req, res) => {
  const { name, model, serial_no, purchase_date, last_service_date, next_service_due, status } = req.body;
  const r = db.prepare('INSERT INTO machines (name,model,serial_no,purchase_date,last_service_date,next_service_due,status) VALUES (?,?,?,?,?,?,?)').run(
    name, model || '', serial_no || '', purchase_date || '', last_service_date || '', next_service_due || '', status || 'OK'
  );
  res.json({ success: true, id: r.lastInsertRowid });
});

router.put('/:id', ownerOnly, (req, res) => {
  const { name, model, serial_no, purchase_date, last_service_date, next_service_due, status } = req.body;
  db.prepare('UPDATE machines SET name=?,model=?,serial_no=?,purchase_date=?,last_service_date=?,next_service_due=?,status=? WHERE id=?').run(
    name, model || '', serial_no || '', purchase_date || '', last_service_date || '', next_service_due || '', status || 'OK', req.params.id
  );
  res.json({ success: true });
});

router.delete('/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM machines WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// === MAINTENANCE LOG ===
router.get('/maintenance', (req, res) => {
  res.json(db.prepare('SELECT * FROM maintenance_log ORDER BY date DESC, id DESC LIMIT 100').all());
});

router.post('/maintenance', ownerOnly, (req, res) => {
  const { machine_id, machine_name, type, date, description, cost, technician } = req.body;
  db.prepare('INSERT INTO maintenance_log (machine_id,machine_name,type,date,description,cost,technician) VALUES (?,?,?,?,?,?,?)').run(
    parseInt(machine_id), machine_name || '', type, date, description || '', parseFloat(cost) || 0, technician || ''
  );
  // If type is Service, update last_service_date on machine
  if (type === 'Service') {
    db.prepare('UPDATE machines SET last_service_date=? WHERE id=?').run(date, parseInt(machine_id));
  }
  // If breakdown, set machine status
  if (type === 'Breakdown') {
    db.prepare("UPDATE machines SET status='Breakdown' WHERE id=?").run(parseInt(machine_id));
  }
  // Add maintenance cost to expenses
  const cost_val = parseFloat(cost) || 0;
  if (cost_val > 0) {
    db.prepare("INSERT INTO expenses (date,category,description,amount) VALUES (?,?,?,?)").run(date, 'Maintenance', `${machine_name || 'Machine'}: ${description || type}`, cost_val);
  }
  res.json({ success: true });
});

router.put('/maintenance/:id/resolve', ownerOnly, (req, res) => {
  db.prepare('UPDATE maintenance_log SET resolved=1 WHERE id=?').run(req.params.id);
  // If resolving a breakdown, reset machine status
  const entry = db.prepare('SELECT * FROM maintenance_log WHERE id=?').get(req.params.id);
  if (entry && entry.type === 'Breakdown') {
    db.prepare("UPDATE machines SET status='OK' WHERE id=?").run(entry.machine_id);
  }
  res.json({ success: true });
});

router.delete('/maintenance/:id', ownerOnly, (req, res) => {
  db.prepare('DELETE FROM maintenance_log WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
