import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { Calendar, Package, Boxes, BarChart3, Music } from 'lucide-react';
import CalendarPage from './pages/CalendarPage';
import EquipmentPage from './pages/EquipmentPage';
import InventoryPage from './pages/InventoryPage';
import StatsPanel from './pages/StatsPanel';

const navItems = [
  { path: '/calendar', label: '乐队日历', icon: Calendar },
  { path: '/equipment', label: '设备清单', icon: Package },
  { path: '/inventory', label: '库存管理', icon: Boxes },
  { path: '/stats', label: '数据统计', icon: BarChart3 },
];

export default function App() {
  const location = useLocation();
  const [transitionKey, setTransitionKey] = useState(location.pathname);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setTransitionKey(location.pathname);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav
        style={{
          width: isMobile ? '100%' : '220px',
          background: 'var(--bg-nav)',
          position: isMobile ? 'fixed' : 'fixed',
          top: 0,
          left: 0,
          height: isMobile ? 'auto' : '100vh',
          zIndex: 100,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          padding: isMobile ? '8px 12px' : '20px 0',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'center',
            gap: '8px',
            padding: isMobile ? '8px 12px' : '16px 20px 32px',
            flexShrink: 0,
          }}
        >
          <Music size={isMobile ? 20 : 28} color="#4ECDC4" />
          <span
            style={{
              fontSize: isMobile ? '15px' : '17px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.5px',
              display: isMobile ? 'none' : 'block',
            }}
          >
            巡演管理器
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            flex: 1,
            gap: isMobile ? '4px' : '4px',
            overflowX: isMobile ? 'auto' : 'visible',
          }}
        >
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '6px' : '8px',
                padding: isMobile ? '10px 14px' : '16px 12px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-nav-hover)' : 'transparent',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontSize: isMobile ? '13px' : '13px',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive && !isMobile ? '4px solid var(--accent-3)' : '4px solid transparent',
                boxShadow: isActive && !isMobile
                  ? '0 0 12px rgba(69,183,209,0.5), inset 0 0 20px rgba(83,52,131,0.3)'
                  : 'none',
              })}
              onMouseEnter={(e) => {
                if (!(e.currentTarget.style.background === 'var(--bg-nav-hover)' &&
                      e.currentTarget.getAttribute('aria-current'))) {
                  e.currentTarget.style.background = 'rgba(83, 52, 131, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={isMobile ? 18 : 22} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : '220px',
          paddingTop: isMobile ? '72px' : '0',
          paddingRight: !isMobile && location.pathname !== '/stats' ? '340px' : '20px',
          padding: isMobile ? '72px 12px 24px' : undefined,
          paddingLeft: isMobile ? '12px' : '32px',
          paddingTopDesktop: '32px',
          paddingTop: isMobile ? '72px' : '32px',
          paddingBottom: '40px',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        <div
          key={transitionKey}
          style={{
            animation: 'slideInLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          <Routes location={location}>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/stats" element={
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#fff' }}>
                  数据统计中心
                </h2>
                <StatsPanel standalone />
              </div>
            } />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </div>
      </main>

      {!isMobile && location.pathname !== '/stats' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '320px',
            height: '100vh',
            padding: '20px 16px',
            zIndex: 50,
            overflowY: 'auto',
          }}
        >
          <StatsPanel />
        </div>
      )}
    </div>
  );
}
