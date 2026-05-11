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
  const wdays = 22;
  const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
  const payroll = staff.map(s => {
    const dailyRate = s.salary / wdays;
    const deduction = Math.round(s.absent_days * dailyRate);
    const netPay = s.salary - deduction - s.advance;
    return { ...s, daily_rate: dailyRate, deduction, net_pay: netPay };
  });
  const total = payroll.reduce((sum, s) => sum + s.net_pay, 0);
  res.json({ payroll, total, wdays });
});

router.put('/advance/:id', ownerOnly, (req, res) => {
  const { advance } = req.body;
  db.prepare('UPDATE staff SET advance = ? WHERE id = ?').run(advance || 0, req.params.id);
  res.json({ success: true });
});

module.exports = router;
