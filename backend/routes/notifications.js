const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  const { role } = req.user;
  const notifs = role === 'owner'
    ? db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all()
    : db.prepare('SELECT * FROM notifications WHERE to_role=? ORDER BY id DESC LIMIT 50').all(role);
  res.json(notifs);
});

router.get('/count', (req, res) => {
  const { role } = req.user;
  const count = role === 'owner'
    ? db.prepare('SELECT COUNT(*) as c FROM notifications WHERE read=0').get().c
    : db.prepare('SELECT COUNT(*) as c FROM notifications WHERE to_role=? AND read=0').get(role).c;
  res.json({ count });
});

// PUT /read-all must be before PUT /:id/read
router.put('/read-all', (req, res) => {
  const { role } = req.user;
  if (role === 'owner') db.prepare('UPDATE notifications SET read=1').run();
  else db.prepare('UPDATE notifications SET read=1 WHERE to_role=?').run(role);
  res.json({ success: true });
});

router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
