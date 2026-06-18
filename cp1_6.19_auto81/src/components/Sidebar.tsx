import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Box, BarChart3, Menu, X } from 'lucide-react';
import { useStore } from '@/store';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '大盘' },
  { to: '/orders', icon: ShoppingCart, label: '订单' },
  { to: '/sort', icon: Package, label: '分拣' },
  { to: '/products', icon: Box, label: '商品' },
  { to: '/stats', icon: BarChart3, label: '统计' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const notifications = useStore(state => state.notifications);
  const fetchUnreadCount = useStore(state => state.fetchUnreadCount);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  const renderNav = (onNavigate?: () => void) => (
    <nav style={{ flex: 1, padding: '12px 0' }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`sidebar-nav-item${isActive ? ' active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 24px',
              color: 'white',
              textDecoration: 'none',
              background: isActive ? '#3498db' : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.label === '订单' && unreadCount > 0 && (
              <span className="sidebar-blink" style={{
                marginLeft: 'auto',
                background: '#e74c3c',
                color: 'white',
                borderRadius: 10,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 'bold',
                minWidth: 20,
                textAlign: 'center',
              }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const renderBottom = () => (
    <div style={{
      padding: '20px 24px',
      borderTop: '1px solid #34495e',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        flexShrink: 0,
      }}>
        团
      </div>
      <span style={{ color: 'white', fontSize: 14 }}>团长</span>
    </div>
  );

  const sidebarStyle: React.CSSProperties = {
    width: 240,
    height: '100vh',
    background: '#2c3e50',
    position: 'fixed',
    left: 0,
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  };

  return (
    <>
      <style>{`
        @keyframes sidebar-blink-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .sidebar-blink { animation: sidebar-blink-anim 1.5s ease-in-out infinite; }
        .sidebar-nav-item:hover { background: #34495e !important; }
        .sidebar-nav-item.active:hover { background: #3498db !important; }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar-desktop { display: flex !important; }
          .sidebar-mobile-btn { display: none !important; }
        }
      `}</style>

      <button
        className="sidebar-mobile-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1100,
          background: '#2c3e50',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: 8,
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside className="sidebar-desktop" style={sidebarStyle}>
        <div style={{
          padding: '24px 20px',
          color: 'white',
          fontSize: 20,
          fontWeight: 'bold',
          borderBottom: '1px solid #34495e',
        }}>
          社区团购
        </div>
        {renderNav()}
        {renderBottom()}
      </aside>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }} />
          <aside style={{ ...sidebarStyle, zIndex: 1001 }}>
            <div style={{
              padding: '24px 20px',
              color: 'white',
              fontSize: 20,
              fontWeight: 'bold',
              borderBottom: '1px solid #34495e',
            }}>
              社区团购
            </div>
            {renderNav(() => setMobileOpen(false))}
            {renderBottom()}
          </aside>
        </>
      )}
    </>
  );
}
