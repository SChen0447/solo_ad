import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TimeEntry from './components/TimeEntry';
import MemberDetail from './components/MemberDetail';

function NavBar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#1f2937',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          <Users size={24} color="#3b82f6" />
          <span>工时绩效仪表板</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <NavLink
            to="/"
            active={isActive('/')}
            icon={<LayoutDashboard size={18} />}
            label="仪表板"
          />
          <NavLink
            to="/time-entry"
            active={isActive('/time-entry')}
            icon={<Clock size={18} />}
            label="工时录入"
          />
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}

function NavLink({ to, active, icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'all 0.2s ease-out',
        background: active ? 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%)' : 'transparent',
        color: active ? '#1f2937' : '#6b7280',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = '#f3f4f6';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
        }
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <NavBar />
        <main
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '32px 24px',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/time-entry" element={<TimeEntry />} />
            <Route path="/members/:id" element={<MemberDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
