import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import CalendarPage from './pages/CalendarPage';
import EquipmentPage from './pages/EquipmentPage';
import InventoryPage from './pages/InventoryPage';
import StatsPanel from './pages/StatsPanel';

const navItems = [
  { path: '/', label: '乐队日历', icon: '📅' },
  { path: '/equipment', label: '设备清单', icon: '🎸' },
  { path: '/inventory', label: '库存管理', icon: '📦' },
  { path: '/stats', label: '统计', icon: '📊' }
];

const App: React.FC = () => {
  const location = useLocation();
  const [animateKey, setAnimateKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [location.pathname]);

  const navStyles: React.CSSProperties = isMobile ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '60px',
    backgroundColor: '#0f3460',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 0,
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  } : {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '220px',
    backgroundColor: '#0f3460',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    zIndex: 1000,
    boxShadow: '2px 0 10px rgba(0,0,0,0.3)'
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => isMobile ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    textDecoration: 'none',
    color: '#e0e0e0',
    fontSize: '12px',
    transition: 'background-color 0.2s ease',
    backgroundColor: isActive ? '#533483' : 'transparent',
    borderLeft: 'none',
    borderTop: isActive ? '4px solid #a855f7' : '4px solid transparent',
    boxShadow: isActive ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none',
    height: '100%',
    borderRadius: 0
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 10px',
    margin: '5px 10px',
    textDecoration: 'none',
    color: '#e0e0e0',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    backgroundColor: isActive ? '#533483' : 'transparent',
    borderLeft: isActive ? '4px solid #a855f7' : '4px solid transparent',
    boxShadow: isActive ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none',
    borderRadius: '6px',
    position: 'relative'
  };

  const iconStyle: React.CSSProperties = isMobile ? {
    fontSize: '20px',
    marginBottom: '4px'
  } : {
    fontSize: '28px',
    marginBottom: '8px'
  };

  const mainContentStyle: React.CSSProperties = isMobile ? {
    marginLeft: 0,
    marginTop: '60px',
    padding: '20px',
    backgroundColor: '#1a1a2e',
    minHeight: '100vh',
    color: '#e0e0e0'
  } : {
    marginLeft: '220px',
    marginRight: '340px',
    padding: '30px',
    backgroundColor: '#1a1a2e',
    minHeight: '100vh',
    color: '#e0e0e0'
  };

  const statsPanelStyle: React.CSSProperties = isMobile ? {
    display: 'none'
  } : {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '320px',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(5px)',
    borderRadius: '12px 0 0 12px',
    zIndex: 999,
    overflowY: 'auto'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={navStyles}>
        {!isMobile && (
          <div style={{ padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎵</div>
            <h1 style={{ fontSize: '18px', color: '#e0e0e0', fontWeight: 'bold' }}>乐队管理器</h1>
          </div>
        )}
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => navItemStyle(isActive)}
          >
            <span style={iconStyle}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main style={mainContentStyle}>
        <div key={animateKey} className="slide-in" style={{ height: '100%' }}>
          <Routes>
            <Route path="/" element={<CalendarPage isMobile={isMobile} />} />
            <Route path="/equipment" element={<EquipmentPage isMobile={isMobile} />} />
            <Route path="/inventory" element={<InventoryPage isMobile={isMobile} />} />
            <Route path="/stats" element={<StatsPanel fullPage={true} />} />
          </Routes>
        </div>
      </main>

      {!isMobile && (
        <aside style={statsPanelStyle}>
          <StatsPanel fullPage={false} />
        </aside>
      )}
    </div>
  );
};

export default App;
