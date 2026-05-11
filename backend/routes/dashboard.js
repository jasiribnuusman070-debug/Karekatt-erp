const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/live', (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  // All active orders
  const orders = db.prepare("SELECT * FROM orders WHERE cancelled=0 OR cancelled IS NULL ORDER BY id DESC").all();
  const staff  = db.prepare('SELECT * FROM staff ORDER BY name').all();

  // ── Staff Activity ──────────────────────────────────────────────────────────
  const activeOrders = orders.filter(o => !['Delivered','Cancelled'].includes(o.status));
  const staffActivity = staff.map(s => {
    const firstName = s.name.split(' ')[0];
    const myJobs = activeOrders.filter(o =>
      o.designer_name === firstName ||
      o.assigned_to   === firstName
    );
    const currentJob = myJobs.find(o => ['In Design','Printing','Cutting','Finishing'].includes(o.status)) || myJobs[0] || null;
    // Last activity: newest order touched by them
    const lastOrd = myJobs.sort((a, b) => b.id - a.id)[0];
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      status: s.status || 'Present',
      shift: s.shift || 'Morning',
      pending_count: myJobs.length,
      current_job: currentJob ? { order_id: currentJob.order_id, job_type: currentJob.job_type, status: currentJob.status, customer: currentJob.customer_name } : null,
      idle: myJobs.length === 0 && (s.status || 'Present') === 'Present',
    };
  });

  // ── Pipeline Counts ─────────────────────────────────────────────────────────
  const pipeline = {
    unassigned:      orders.filter(o => o.status === 'Confirmed').length,
    in_design:       orders.filter(o => o.status === 'In Design').length,
    pending_review:  orders.filter(o => o.status === 'Design Complete').length,
    design_approved: orders.filter(o => o.status === 'Design Approved').length,
    printing:        orders.filter(o => ['Printing','Cutting','Finishing'].includes(o.status)).length,
    ready:           orders.filter(o => o.status === 'Ready').length,
  };

  // ── Overdue Jobs ────────────────────────────────────────────────────────────
  const overdue = orders
    .filter(o => o.deadline && o.deadline < today && !['Design Approved','Ready','Delivered','Cancelled'].includes(o.status))
    .map(o => {
      const dl = new Date(o.deadline + 'T09:00:00');
      const hoursOver = Math.round((now - dl.getTime()) / 3600000);
      return { order_id: o.order_id, customer_name: o.customer_name, status: o.status, hours_overdue: hoursOver };
    })
    .sort((a, b) => b.hours_overdue - a.hours_overdue);

  // ── Today Stats ─────────────────────────────────────────────────────────────
  const todayOrders   = orders.filter(o => o.created_at && o.created_at.startsWith(today));
  const completedToday = orders.filter(o => o.status === 'Delivered' && o.updated_at && o.updated_at.startsWith(today));
  const invoices = db.prepare("SELECT * FROM invoices WHERE status='Paid'").all();
  const todayRevenue = invoices
    .filter(i => i.created_at && i.created_at.startsWith(today))
    .reduce((s, i) => s + (i.amount || 0), 0);

  // ── Design Queue ────────────────────────────────────────────────────────────
  const pendingReview = orders.filter(o => o.status === 'Design Complete');
  const oldestReview  = pendingReview.length > 0
    ? pendingReview.sort((a, b) => a.id - b.id)[0]
    : null;
  const designQueue = {
    pending_count: pendingReview.length,
    oldest: oldestReview ? {
      order_id: oldestReview.order_id,
      customer_name: oldestReview.customer_name,
      job_type: oldestReview.job_type,
      hours_waiting: oldestReview.updated_at
        ? Math.round((now - new Date(oldestReview.updated_at).getTime()) / 3600000)
        : null,
    } : null,
  };

  // ── Print Queue ─────────────────────────────────────────────────────────────
  const printQueue = {
    waiting: pipeline.design_approved,
    in_progress: pipeline.printing,
    ready_uncollected: pipeline.ready,
  };

  // ── Design Head Stats (for owner dashboard card) ────────────────────────────
  const dhStaff = staff.find(s => s.role === 'Design Head' || s.role === 'design_head');
  const dhName  = dhStaff ? dhStaff.name.split(' ')[0] : null;
  const designHeadStats = dhName ? {
    name: dhStaff.name,
    own_jobs: orders.filter(o => o.designer_name === dhName && !['Design Approved','Ready','Delivered'].includes(o.status)).length,
    assigned_to_team: orders.filter(o => o.status === 'In Design' && o.designer_name !== dhName).length,
    pending_approval: pendingReview.length,
  } : null;

  res.json({
    staff_activity: staffActivity,
    pipeline,
    overdue,
    today: {
      received: todayOrders.length,
      completed: completedToday.length,
      revenue: Math.round(todayRevenue),
      pending_total: activeOrders.length,
    },
    design_queue: designQueue,
    print_queue: printQueue,
    design_head_stats: designHeadStats,
  });
});

module.exports = router;
