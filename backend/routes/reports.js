const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// GST report: monthly CGST + SGST breakdown from delivered orders
router.get('/gst', ownerOnly, (req, res) => {
  const { month, year } = req.query;
  const y = year || new Date().getFullYear();
  const m = month || (new Date().getMonth() + 1);
  const prefix = `${y}-${String(m).padStart(2, '0')}`;

  const orders = db.prepare(`
    SELECT order_id, customer_name, phone, job_type, created_at,
           base_amount, gst_amount, total_amount, discount_amount
    FROM orders
    WHERE status = 'Delivered'
      AND strftime('%Y-%m', created_at) = ?
    ORDER BY id DESC
  `).all(prefix);

  const totals = orders.reduce((acc, o) => {
    acc.taxable += o.base_amount || 0;
    acc.gst += o.gst_amount || 0;
    return acc;
  }, { taxable: 0, gst: 0 });

  res.json({
    month: prefix,
    orders,
    summary: {
      taxable_amount: totals.taxable,
      cgst: totals.gst / 2,
      sgst: totals.gst / 2,
      total_gst: totals.gst,
      grand_total: totals.taxable + totals.gst,
    }
  });
});

// Profit per job type
router.get('/profit', ownerOnly, (req, res) => {
  const { month, year } = req.query;
  const y = year || new Date().getFullYear();
  const m = month || (new Date().getMonth() + 1);
  const prefix = `${y}-${String(m).padStart(2, '0')}`;

  const orders = db.prepare(`
    SELECT job_type,
           COUNT(*) as order_count,
           SUM(base_amount) as revenue,
           SUM(COALESCE(material_cost, 0)) as material_cost,
           SUM(gst_amount) as gst_collected
    FROM orders
    WHERE status = 'Delivered'
      AND strftime('%Y-%m', created_at) = ?
    GROUP BY job_type
    ORDER BY revenue DESC
  `).all(prefix);

  const maintenance = db.prepare(`
    SELECT SUM(cost) as total FROM maintenance_log
    WHERE strftime('%Y-%m', date) = ?
  `).get(prefix);

  const result = orders.map(r => ({
    ...r,
    gross_profit: (r.revenue || 0) - (r.material_cost || 0),
    margin_pct: r.revenue > 0 ? (((r.revenue - r.material_cost) / r.revenue) * 100).toFixed(1) : '0.0',
  }));

  const totals = result.reduce((acc, r) => {
    acc.revenue += r.revenue || 0;
    acc.material_cost += r.material_cost || 0;
    acc.gross_profit += r.gross_profit || 0;
    return acc;
  }, { revenue: 0, material_cost: 0, gross_profit: 0 });

  res.json({
    month: prefix,
    by_job_type: result,
    maintenance_cost: maintenance?.total || 0,
    net_profit: totals.gross_profit - (maintenance?.total || 0),
    totals,
  });
});

// Revenue summary (monthly overview, last 12 months)
router.get('/summary', ownerOnly, (req, res) => {
  const months = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           COUNT(*) as orders,
           SUM(base_amount) as revenue,
           SUM(gst_amount) as gst,
           SUM(total_amount) as total
    FROM orders
    WHERE status = 'Delivered'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all();
  res.json(months);
});

module.exports = router;
