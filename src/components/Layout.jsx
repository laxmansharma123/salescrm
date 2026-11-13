import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, Globe, PhoneCall, Plus, LogOut, Menu, ScanLine } from 'lucide-react';
import { api, getUser, clearSession } from '../api';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'All Leads', icon: Users, end: true },
  { to: '/leads/google', label: 'Google Ads Leads', icon: Megaphone },
  { to: '/leads/website', label: 'Website Leads', icon: Globe },
  { to: '/leads/manual', label: 'Manual Leads', icon: PhoneCall },
  { to: '/leads/cards', label: 'Scan Cards', icon: ScanLine },
];

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await api('logout.php');
    } catch {
      /* ignore */
    }
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <div className="brand-name">Stewols Bansal</div>
            <div className="brand-sub">Sales CRM</div>
          </div>
        </div>

        <button className="btn btn-accent add-lead-btn" onClick={() => { setOpen(false); navigate('/leads/new'); }}>
          <Plus size={18} /> Add Lead
        </button>

        <nav className="nav">
          <div className="nav-heading">Menu</div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{(user?.name || '?').charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Sales'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="topbar-title">Lead Management</div>
          <div className="topbar-user">{user?.email}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}