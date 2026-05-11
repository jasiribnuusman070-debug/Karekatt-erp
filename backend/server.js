const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/staff',         require('./routes/staff'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/finance',       require('./routes/finance'));
app.use('/api/payroll',       require('./routes/payroll'));
app.use('/api/rate-card',     require('./routes/rate_card'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/cash-register', require('./routes/cash_register'));
app.use('/api/suppliers',     require('./routes/suppliers'));
app.use('/api/machines',      require('./routes/machines'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/leaves',        require('./routes/leaves'));
app.use('/api/hr',            require('./routes/hr'));
app.use('/api/dashboard',     require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  const index = path.join(frontendDist, 'index.html');
  res.sendFile(index, err => {
    if (err) res.status(404).json({ error: 'Frontend not built. Run: cd frontend && npm run build' });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nKarekat Prints ERP — http://localhost:${PORT}`);
  console.log('owner / karekat2024 | designhead / karekat2024');
  console.log('riya / karekat2024 | arun / staff2024 | fathima / staff2024');
  console.log('suresh / staff2024 | babu / staff2024\n');
});
