import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { initials } from '../utils';
import api from '../api';

import Dashboard           from './Dashboard';
import Orders              from './Orders';
import Billing             from './Billing';
import Inventory           from './Inventory';
import Staff               from './Staff';
import Attendance          from './Attendance';
import Payroll             from './Payroll';
import Customers           from './Customers';
import Finance             from './Finance';
import RateCard            from './RateCard';
import ReceptionistConsole from './ReceptionistConsole';
import DesignHeadConsole   from './DesignHeadConsole';
import DesignerConsole     from './DesignerConsole';
import PrintConsole        from './PrintConsole';
import CashRegister        from './CashRegister';
import Suppliers           from './Suppliers';
import Machines            from './Machines';
import Reports             from './Reports';
import Settings            from './Settings';
import StaffConsole        from './StaffConsole';
import HR                  from './HR';

const NAV = {
  owner: [
    { id: 'dashboard',  label: 'Overview',    icon: 'dashboard',             section: 'MAIN' },
    { id: 'orders',     label: 'All Orders',  icon: 'receipt_long' },
    { id: 'billing',    label: 'Billing',     icon: 'account_balance_wallet' },
    { id: 'ratecard',   label: 'Rate Card',   icon: 'price_change' },
    { id: 'inventory',  label: 'Inventory',   icon: 'inventory_2' },
    { id: 'staff',      label: 'Staff',       icon: 'badge',                 section: 'PEOPLE' },
    { id: 'attendance', label: 'Attendance',  icon: 'event_available' },
    { id: 'payroll',    label: 'Payroll',     icon: 'payments' },
    { id: 'customers',  label: 'Customers',     icon: 'groups',                section: 'BUSINESS' },
    { id: 'finance',    label: 'Finance',       icon: 'bar_chart' },
    { id: 'suppliers',  label: 'Suppliers',     icon: 'local_shipping' },
    { id: 'machines',   label: 'Machines',      icon: 'precision_manufacturing' },
    { id: 'cash',       label: 'Cash Register', icon: 'point_of_sale',         section: 'OPERATIONS' },
    { id: 'reports',    label: 'Reports',       icon: 'analytics' },
    { id: 'hr',        label: 'HR',            icon: 'groups' },
    { id: 'settings',  label: 'Settings',      icon: 'settings' },
  ],
  receptionist: [
    { id: 'receptionist', label: 'Order Desk',    icon: 'point_of_sale',  section: 'RECEPTION' },
    { id: 'cash',         label: 'Cash Register', icon: 'account_balance_wallet' },
    { id: 'myprofile',    label: 'My Profile',    icon: 'person',         section: 'ME' },
  ],
  design_head: [
    { id: 'designhead', label: 'Design Console', icon: 'design_services', section: 'DESIGN' },
    { id: 'myprofile',  label: 'My Profile',     icon: 'person',          section: 'ME' },
  ],
  designer: [
    { id: 'designer',  label: 'My Jobs',    icon: 'brush',  section: 'DESIGN' },
    { id: 'myprofile', label: 'My Profile', icon: 'person', section: 'ME' },
  ],
  print_dept: [
    { id: 'print',     label: 'Print Queue', icon: 'print',  section: 'PRODUCTION' },
    { id: 'myprofile', label: 'My Profile',  icon: 'person', section: 'ME' },
  ],
  staff: [
    { id: 'myprofile', label: 'My Profile', icon: 'person', section: 'ME' },
  ],
};

const DEFAULT_PAGE = {
  owner: 'dashboard', receptionist: 'receptionist',
  design_head: 'designhead', designer: 'designer',
  print_dept: 'print', staff: 'myprofile',
};

const PAGES = {
  dashboard: Dashboard, orders: Orders, billing: Billing, ratecard: RateCard,
  inventory: Inventory, staff: Staff, attendance: Attendance, payroll: Payroll,
  customers: Customers, finance: Finance,
  receptionist: ReceptionistConsole, designhead: DesignHeadConsole,
  designer: DesignerConsole, print: PrintConsole,
  cash: CashRegister, suppliers: Suppliers, machines: Machines,
  reports: Reports, settings: Settings,
  myprofile: StaffConsole, hr: HR,
};

const PAGE_TITLES = {
  dashboard: 'Operations Overview', orders: 'Order Management', billing: 'Billing & GST',
  ratecard: 'Rate Card', inventory: 'Inventory & Stock', staff: 'Staff Directory',
  attendance: 'Attendance', payroll: 'Payroll', customers: 'Customers', finance: 'Finance & Accounts',
  receptionist: 'Reception Desk', designhead: 'Design Head Console',
  designer: 'My Design Jobs', print: 'Print Department',
  cash: 'Cash Register', suppliers: 'Suppliers & Purchases',
  machines: 'Machines & Maintenance', reports: 'Reports',
  settings: 'Settings', myprofile: 'My Profile', hr: 'HR Management',
};

const ROLE_LABEL = {
  owner: 'Owner', receptionist: 'Receptionist', design_head: 'Design Head',
  designer: 'Designer', print_dept: 'Print Dept', staff: 'Staff',
};

function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchCount = () => api.get('/notifications/count').then(r => setCount(r.data.count)).catch(() => {});
  const fetchNotifs = () => api.get('/notifications').then(r => setNotifs(r.data)).catch(() => {});

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = () => { setOpen(o => !o); fetchNotifs(); };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setCount(0);
    setNotifs(n => n.map(x => ({ ...x, read: 1 })));
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={openPanel} className="relative p-sm hover:bg-surface-container-low rounded-full transition-colors">
        <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-xs">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-xs w-80 bg-surface border border-outline-variant rounded-xl shadow-modal z-50 overflow-hidden">
          <div className="flex items-center justify-between p-sm border-b border-outline-variant">
            <span className="text-label-md text-on-surface font-semibold">Notifications</span>
            {count > 0 && <button onClick={markAllRead} className="text-label-sm text-primary-container hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant text-center p-lg">All caught up!</p>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`p-sm border-b border-outline-variant/50 flex gap-sm ${n.read ? '' : 'bg-primary-container/5'}`}>
                  <span className={`material-symbols-outlined mt-xs ${n.read ? 'text-outline' : 'text-primary-container'}`} style={{ fontSize: 16 }}>
                    {n.read ? 'notifications' : 'notifications_active'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-sm text-on-surface">{n.message}</p>
                    <p className="text-label-sm text-on-surface-variant mt-xs">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const role = user.role || 'staff';
  const nav = NAV[role] || NAV.staff;
  const defaultPage = DEFAULT_PAGE[role] || 'dashboard';
  const [page, setPage] = useState(defaultPage);

  const PageComp = PAGES[page] || Dashboard;
  const userInitials = initials(user.staff_name || user.username);
  const roleLabel = ROLE_LABEL[role] || role;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-sidebar bg-inverse-surface shadow-nav flex flex-col z-50">
        {/* Logo */}
        <div className="px-md pt-lg pb-xl border-b border-white/10">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim text-2xl">local_printshop</span>
            <div>
              <p className="text-white font-bold text-headline-sm leading-tight">KarekatOS</p>
              <p className="text-primary-fixed-dim text-label-sm tracking-widest uppercase">Operations</p>
            </div>
          </div>
          <div className="mt-sm">
            <span className="chip chip-gray text-[10px] tracking-widest uppercase">{roleLabel} Console</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-sm overflow-y-auto">
          {nav.map(item => (
            <div key={item.id}>
              {item.section && (
                <p className="px-md pt-md pb-xs text-[10px] font-semibold tracking-[0.12em] text-outline-variant/60 uppercase">
                  {item.section}
                </p>
              )}
              <button
                className={`nav-item${page === item.id ? ' active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-label-md tracking-widest">{item.label}</span>
              </button>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-md py-lg border-t border-white/10">
          <div className="flex items-center gap-sm mb-sm">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-label-md font-semibold truncate">{user.staff_name || user.username}</p>
              <p className="text-outline-variant text-label-sm">{roleLabel}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-xs px-sm py-xs rounded-lg text-outline-variant hover:bg-white/5 hover:text-white transition-colors text-label-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 right-0 h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-lg z-40" style={{ left: 260 }}>
        <h2 className="text-headline-sm text-on-surface font-semibold">{PAGE_TITLES[page] || page}</h2>
        <div className="flex items-center gap-sm">
          <NotificationBell />
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs">
            {userInitials}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col gap-lg p-lg pt-[88px]" style={{ marginLeft: 260 }}>
        <PageComp />
      </main>
    </div>
  );
}
