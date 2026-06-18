import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TimeEntry from './components/TimeEntry';
import MemberDetail from './components/MemberDetail';

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f3f4f6'
};

const navStyle: React.CSSProperties = {
  height: 64,
  backgroundColor: '#fff',
  borderBottom: '1px solid #e5e7eb',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
};

const logoStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#1f2937',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 10
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8
};

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  color: isActive ? '#fff' : '#6b7280',
  backgroundColor: isActive ? '#3b82f6' : 'transparent',
  transition: 'all 0.2s ease'
});

function NavBar() {
  const location = useLocation();

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>
        <span style={{ fontSize: 22 }}>📊</span>
        工时仪表板
      </Link>
      <div style={navLinksStyle}>
        <Link
          to="/"
          style={navLinkStyle(location.pathname === '/' || location.pathname.startsWith('/members'))}
        >
          概览仪表板
        </Link>
        <Link
          to="/time-entry"
          style={navLinkStyle(location.pathname === '/time-entry')}
        >
          工时录入
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={appStyle}>
        <NavBar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/time-entry" element={<TimeEntry />} />
          <Route path="/members/:id" element={<MemberDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
