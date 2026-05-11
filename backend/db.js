const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'karekatt.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    staff_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    salary REAL DEFAULT 0,
    join_date TEXT,
    annual_leave INTEGER DEFAULT 12,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    leave_used INTEGER DEFAULT 0,
    advance REAL DEFAULT 0,
    status TEXT DEFAULT 'Present'
  );
  CREATE TABLE IF NOT EXISTS rate_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'per piece',
    rate REAL NOT NULL DEFAULT 0,
    min_qty REAL DEFAULT 1,
    material_cost_rate REAL DEFAULT 0,
    description TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_role TEXT NOT NULL,
    from_role TEXT DEFAULT '',
    order_id INTEGER DEFAULT 0,
    order_ref TEXT DEFAULT '',
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE,
    customer_name TEXT,
    phone TEXT,
    job_type TEXT,
    size TEXT,
    qty REAL DEFAULT 1,
    unit TEXT DEFAULT '',
    rate_per_unit REAL DEFAULT 0,
    base_amount REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    discount_pct REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    material_cost REAL DEFAULT 0,
    assigned_to TEXT DEFAULT '',
    designer_name TEXT DEFAULT '',
    deadline TEXT,
    urgency TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Received',
    cancelled INTEGER DEFAULT 0,
    cancel_reason TEXT DEFAULT '',
    is_reprint INTEGER DEFAULT 0,
    reprint_reason TEXT DEFAULT '',
    no_extra_charge INTEGER DEFAULT 0,
    batch_id TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    design_notes TEXT DEFAULT '',
    rejection_reason TEXT DEFAULT '',
    print_notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id TEXT UNIQUE,
    order_id INTEGER DEFAULT 0,
    customer_name TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    gst_rate REAL DEFAULT 18,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT,
    qty REAL DEFAULT 0,
    reorder_level REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    business_name TEXT,
    area TEXT,
    discount_pct REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    order_count INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    last_order TEXT
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_name TEXT,
    from_date TEXT,
    to_date TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending'
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    category TEXT,
    description TEXT,
    amount REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS cash_register (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    opening_balance REAL DEFAULT 0,
    cash_in REAL DEFAULT 0,
    upi_in REAL DEFAULT 0,
    expenses_out REAL DEFAULT 0,
    closing_balance REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    material_type TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS stock_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    supplier_id INTEGER DEFAULT 0,
    supplier_name TEXT DEFAULT '',
    inventory_id INTEGER DEFAULT 0,
    material_name TEXT DEFAULT '',
    qty REAL NOT NULL,
    unit TEXT DEFAULT '',
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT DEFAULT '',
    serial_no TEXT DEFAULT '',
    purchase_date TEXT DEFAULT '',
    last_service_date TEXT DEFAULT '',
    next_service_due TEXT DEFAULT '',
    status TEXT DEFAULT 'OK'
  );
  CREATE TABLE IF NOT EXISTS maintenance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    machine_name TEXT DEFAULT '',
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT DEFAULT '',
    cost REAL DEFAULT 0,
    technician TEXT DEFAULT '',
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// New tables (Phase 3+)
db.exec(`
  CREATE TABLE IF NOT EXISTS rate_card_slabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rate_card_id INTEGER NOT NULL,
    min_qty REAL NOT NULL,
    max_qty REAL DEFAULT 999999,
    rate REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    casual_total INTEGER DEFAULT 12,
    casual_used INTEGER DEFAULT 0,
    sick_total INTEGER DEFAULT 6,
    sick_used INTEGER DEFAULT 0,
    earned_total INTEGER DEFAULT 15,
    earned_used INTEGER DEFAULT 0,
    UNIQUE(staff_id, year)
  );
  CREATE TABLE IF NOT EXISTS advance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT DEFAULT '',
    amount REAL NOT NULL,
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'Pending',
    approved_by TEXT DEFAULT '',
    deduct_month TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'public'
  );
  CREATE TABLE IF NOT EXISTS performance_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT DEFAULT '',
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    rating INTEGER DEFAULT 3,
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS salary_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT DEFAULT '',
    effective_date TEXT NOT NULL,
    old_salary REAL DEFAULT 0,
    new_salary REAL DEFAULT 0,
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exit_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT DEFAULT '',
    last_day TEXT NOT NULL,
    settlement_amount REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Column migrations — safe for existing installs
function addCol(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
[
  ['qty',            'REAL DEFAULT 1'],
  ['unit',           "TEXT DEFAULT ''"],
  ['rate_per_unit',  'REAL DEFAULT 0'],
  ['base_amount',    'REAL DEFAULT 0'],
  ['gst_amount',     'REAL DEFAULT 0'],
  ['total_amount',   'REAL DEFAULT 0'],
  ['designer_name',  "TEXT DEFAULT ''"],
  ['urgency',        "TEXT DEFAULT 'Normal'"],
  ['design_notes',   "TEXT DEFAULT ''"],
  ['rejection_reason',"TEXT DEFAULT ''"],
  ['print_notes',    "TEXT DEFAULT ''"],
  ['discount_pct',   'REAL DEFAULT 0'],
  ['discount_amount','REAL DEFAULT 0'],
  ['material_cost',  'REAL DEFAULT 0'],
  ['cancelled',      'INTEGER DEFAULT 0'],
  ['cancel_reason',  "TEXT DEFAULT ''"],
  ['is_reprint',     'INTEGER DEFAULT 0'],
  ['reprint_reason', "TEXT DEFAULT ''"],
  ['no_extra_charge','INTEGER DEFAULT 0'],
  ['batch_id',       "TEXT DEFAULT ''"],
].forEach(([c, d]) => addCol('orders', c, d));
addCol('invoices', 'order_id', 'INTEGER DEFAULT 0');
addCol('customers', 'discount_pct', 'REAL DEFAULT 0');
addCol('customers', 'notes', "TEXT DEFAULT ''");
addCol('rate_card', 'material_cost_rate', 'REAL DEFAULT 0');
addCol('rate_card', 'pricing_type', "TEXT DEFAULT 'single'");
addCol('users', 'must_change_password', 'INTEGER DEFAULT 0');
addCol('users', 'is_active', 'INTEGER DEFAULT 1');
addCol('leave_requests', 'staff_id', 'INTEGER DEFAULT 0');
addCol('leave_requests', 'leave_type', "TEXT DEFAULT 'Casual'");
addCol('leave_requests', 'days', 'INTEGER DEFAULT 1');
addCol('leave_requests', 'notes', "TEXT DEFAULT ''");
addCol('leave_requests', 'handled_by', "TEXT DEFAULT ''");
addCol('staff', 'employment_type', "TEXT DEFAULT 'Full-time'");
addCol('staff', 'shift', "TEXT DEFAULT 'Morning'");
addCol('exit_records', 'reason', "TEXT DEFAULT 'Resignation'");

function seedSettings() {
  const defaults = [
    ['quote_validity_days', '7'],
    ['wa_enabled', '1'],
    ['wa_template_confirmed',
      'Hello {customer_name}! 🎉 Your order *{order_id}* for _{job_type}_ is confirmed at Karekat Prints.\n\n💰 Total: *{total}*\n📅 Expected by: {deadline}\n\nWe\'ll notify you when ready! Thank you 🙏'],
    ['wa_template_ready',
      'Hello {customer_name}! ✅ Your order *{order_id}* ({job_type}) is *READY for pickup* at Karekat Prints.\n\n💰 Amount to pay: *{total}*\n\nPlease visit us soon. Thank you! 🖨️'],
    ['wa_template_cancelled',
      'Hello {customer_name}, your order *{order_id}* at Karekat Prints has been cancelled.\nReason: {reason}\nWe apologise for the inconvenience.'],
  ];
  defaults.forEach(([k, v]) => {
    try { db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(k, v); } catch {}
  });
}

function seedRateCard() {
  const ins = db.prepare('INSERT INTO rate_card (job_type,unit,rate,min_qty,material_cost_rate,description) VALUES (?,?,?,?,?,?)');
  [
    ['Banner / Flex',   'sq ft',       35,   4,   15,  'Outdoor flex/vinyl banners'],
    ['Visiting cards',  'per 100 pcs', 180,  100, 60,  'Standard business cards'],
    ['Brochure',        'per piece',   12,   100, 4,   'Tri-fold / bi-fold brochures'],
    ['Poster',          'per piece',   25,   10,  8,   'A3/A2 posters'],
    ['Sticker',         'per piece',   5,    50,  1.5, 'Vinyl / paper stickers'],
    ['ID card',         'per piece',   30,   10,  8,   'PVC / laminated ID cards'],
    ['Invitation card', 'per piece',   15,   50,  4,   'Wedding / event invitations'],
    ['Logo design',     'fixed',       1500, 1,   0,   'Logo design (fixed price)'],
  ].forEach(r => ins.run(...r));
}

function migrateUserRoles() {
  db.prepare("UPDATE users SET role='receptionist' WHERE LOWER(username)='riya' AND role='staff'").run();
  db.prepare("UPDATE users SET role='designer' WHERE LOWER(username) IN ('arun','fathima') AND role='staff'").run();
  db.prepare("UPDATE users SET role='print_dept' WHERE LOWER(username) IN ('suresh','babu') AND role='staff'").run();
  if (!db.prepare("SELECT id FROM users WHERE username='designhead'").get()) {
    db.prepare('INSERT INTO users (username,password_hash,role,staff_name) VALUES (?,?,?,?)').run(
      'designhead', bcrypt.hashSync('karekat2024', 10), 'design_head', 'Design Head'
    );
  }
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  if (userCount === 0) {
    console.log('Seeding database...');
    db.prepare('INSERT INTO users (username,password_hash,role,staff_name) VALUES (?,?,?,?)').run('owner', bcrypt.hashSync('karekat2024', 10), 'owner', 'Owner');
    db.prepare('INSERT INTO users (username,password_hash,role,staff_name) VALUES (?,?,?,?)').run('designhead', bcrypt.hashSync('karekat2024', 10), 'design_head', 'Design Head');

    const staffData = [
      { name:'Riya Pradeep', role:'Counter / Reception', ph:'9000000004', sal:14000, jd:'2025-02-01', al:12, pd:20, ad:0, lu:0, adv:0, st:'Present', lr:'receptionist', pw:'karekat2024' },
      { name:'Arun Kumar',   role:'Designer',            ph:'9000000001', sal:18000, jd:'2024-01-10', al:10, pd:18, ad:2, lu:0, adv:0, st:'Present', lr:'designer',     pw:'staff2024' },
      { name:'Fathima Noor', role:'Designer',            ph:'9000000002', sal:17000, jd:'2024-03-01', al:12, pd:19, ad:1, lu:0, adv:0, st:'Present', lr:'designer',     pw:'staff2024' },
      { name:'Suresh Menon', role:'Press Operator',      ph:'9000000003', sal:16000, jd:'2023-11-15', al:8,  pd:17, ad:2, lu:1, adv:500, st:'Present', lr:'print_dept', pw:'staff2024' },
      { name:'Babu Thomas',  role:'Finishing',           ph:'9000000005', sal:15000, jd:'2024-06-01', al:6,  pd:16, ad:3, lu:1, adv:1000,st:'Leave',   lr:'print_dept', pw:'staff2024' },
      { name:'Jasim KP',     role:'Delivery',            ph:'9000000006', sal:13000, jd:'2025-05-01', al:12, pd:20, ad:0, lu:0, adv:0, st:'Present', lr:'staff',       pw:'staff2024' },
    ];
    const insStaff = db.prepare('INSERT INTO staff (name,role,phone,salary,join_date,annual_leave,present_days,absent_days,leave_used,advance,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const insUser  = db.prepare('INSERT INTO users (username,password_hash,role,staff_name) VALUES (?,?,?,?)');
    staffData.forEach(s => {
      insStaff.run(s.name, s.role, s.ph, s.sal, s.jd, s.al, s.pd, s.ad, s.lu, s.adv, s.st);
      insUser.run(s.name.split(' ')[0].toLowerCase(), bcrypt.hashSync(s.pw, 10), s.lr, s.name);
    });

    const insOrd = db.prepare(`INSERT INTO orders
      (order_id,customer_name,phone,job_type,size,qty,unit,rate_per_unit,base_amount,gst_amount,total_amount,amount,material_cost,designer_name,deadline,urgency,status,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    [
      ['ORD-001','Rahul Store',    '9876543210','Banner / Flex',  '6×3 ft',         18, 'sq ft',      35,  630,  113, 743,  630,  270, 'Arun',   '2026-05-15','Normal', 'Printing',      ''],
      ['ORD-002','City Clinic',    '9876543211','Visiting cards', '500 pcs',        500,'per 100 pcs',180, 900,  162, 1062, 900,  300, 'Fathima','2026-05-13','Urgent', 'In Design',     'Double sided'],
      ['ORD-003','New Bakery',     '9876543212','Poster',         'A3 × 50',        50, 'per piece',  25,  1250, 225, 1475, 1250, 400, 'Arun',   '2026-05-11','Express','Ready',         ''],
      ['ORD-004','Rahman Textiles','9876543213','Brochure',       'Tri-fold 200pcs',200,'per piece',  12,  2400, 432, 2832, 2400, 800, '',       '2026-05-18','Normal', 'Confirmed',     'Urgent'],
      ['ORD-005','Sahara Travels', '9876543214','Sticker',        'A4 × 100',       100,'per piece',  5,   500,  90,  590,  500,  150, 'Fathima','2026-05-14','Normal', 'Design Approved',''],
      ['ORD-006','Rahul Store',    '9876543210','Visiting cards', '250 pcs',        250,'per 100 pcs',180, 450,  81,  531,  450,  150, '',       '2026-05-20','Normal', 'Received',      ''],
    ].forEach(r => insOrd.run(...r));

    db.prepare("INSERT INTO invoices (invoice_id,customer_name,description,amount,gst_rate,status) VALUES (?,?,?,?,?,?)").run('INV-001','Rahul Store','Banner 6×3 ft',630,18,'Paid');
    db.prepare("INSERT INTO invoices (invoice_id,customer_name,description,amount,gst_rate,status) VALUES (?,?,?,?,?,?)").run('INV-002','Sahara Travels','A4 stickers ×100',500,18,'Paid');

    [['Flex material','sq ft',800,200],['Vinyl (gloss)','sq ft',150,200],['A4 paper (80gsm)','reams',25,10],
     ['Inkjet ink (CMYK set)','litre',3,5],['Lamination roll','rolls',12,5],['Banner eyelets','pcs',500,100],['Foam board','sheets',40,20]
    ].forEach(r => db.prepare('INSERT INTO inventory (name,unit,qty,reorder_level) VALUES (?,?,?,?)').run(...r));

    [['Rahul Sajan','9876543210','Rahul General Store','Manjeri',0,3,2180,'2026-05-10'],
     ['Dr. Anoop','9876543211','City Multi Speciality Clinic','Perinthalmanna',0,2,1062,'2026-05-08'],
     ['Siraj','9876543212','New Bakery & Cafe','Manjeri',0,5,4200,'2026-05-11'],
     ['Rahman','9876543213','Rahman Textiles','Tirur',10,1,2832,'2026-05-09'],
    ].forEach(r => db.prepare('INSERT INTO customers (name,phone,business_name,area,discount_pct,order_count,total_spent,last_order) VALUES (?,?,?,?,?,?,?,?)').run(...r));

    db.prepare('INSERT INTO leave_requests (staff_name,from_date,to_date,reason,status) VALUES (?,?,?,?,?)').run('Babu Thomas','2026-05-11','2026-05-12','Family function','Approved');
    db.prepare('INSERT INTO leave_requests (staff_name,from_date,to_date,reason,status) VALUES (?,?,?,?,?)').run('Suresh Menon','2026-05-20','2026-05-20','Medical appointment','Pending');

    [['2026-05-01','Electricity','Monthly EB bill',4200],
     ['2026-05-03','Materials','Flex roll purchase',8500],
     ['2026-05-07','Transport','Delivery van fuel',1200],
     ['2026-05-09','Maintenance','Printer head cleaning',800],
    ].forEach(r => db.prepare('INSERT INTO expenses (date,category,description,amount) VALUES (?,?,?,?)').run(...r));

    // Machines seed
    [['Wide Format Printer','Epson SC-S60600','EP-001','2024-01-15','2026-03-15','2026-09-15','OK'],
     ['Lamination Machine','Generic A1 Laminator','LAM-001','2024-03-01','2026-02-01','2026-08-01','OK'],
     ['Vinyl Cutter','Roland GS-24','VCT-001','2023-11-01','2026-01-01','2026-07-01','OK'],
    ].forEach(r => db.prepare('INSERT INTO machines (name,model,serial_no,purchase_date,last_service_date,next_service_due,status) VALUES (?,?,?,?,?,?,?)').run(...r));

    // Suppliers seed
    [['Flex Media Traders','9900000001','Flex / Vinyl material','Kozhikode','Main flex supplier'],
     ['Paper World','9900000002','Paper / Cards','Manjeri','A4, A3 papers and card stock'],
     ['Ink Solutions','9900000003','Printer Inks','Tirur','Epson compatible inks'],
    ].forEach(r => db.prepare('INSERT INTO suppliers (name,phone,material_type,address,notes) VALUES (?,?,?,?,?)').run(...r));

    db.prepare("INSERT INTO notifications (to_role,order_ref,order_id,message) VALUES (?,?,?,?)").run('receptionist','ORD-003',3,'ORD-003 (New Bakery) is Ready for pickup');
    db.prepare("INSERT INTO notifications (to_role,order_ref,order_id,message) VALUES (?,?,?,?)").run('design_head','ORD-002',2,'ORD-002 (City Clinic) design complete — ready for review');
    db.prepare("INSERT INTO notifications (to_role,order_ref,order_id,message) VALUES (?,?,?,?)").run('print_dept','ORD-005',5,'ORD-005 (Sahara Travels) approved — ready for print');

    console.log('Seed complete.');
  }

  migrateUserRoles();
  seedSettings();
  if (db.prepare('SELECT COUNT(*) as c FROM rate_card').get().c === 0) seedRateCard();
}

seed();
module.exports = db;
