import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { Package, ClipboardList, BarChart3, Store } from 'lucide-react';
import ProductManager from './ProductManager';
import OrderBoard from './OrderBoard';
import SalesDashboard from './SalesDashboard';

const navItems = [
  { path: '/products', label: '商品管理', icon: Package },
  { path: '/orders', label: '订单管理', icon: ClipboardList },
  { path: '/dashboard', label: '销售看板', icon: BarChart3 },
];

export default function App() {
  const location = useLocation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <Store size={28} color="#FFFFFF" />
          <span style={styles.logoText}>创意市集</span>
        </div>
        <nav style={styles.nav}>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {}),
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.2s ease-out ${0.1 + idx * 0.1}s`,
                }}
              >
                <Icon size={20} />
                <span style={styles.navText}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <aside style={styles.mobileTopBar}>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                ...styles.mobileNavItem,
                ...(active ? styles.mobileNavActive : {}),
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 11, marginTop: 2 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </aside>

      <main
        style={{
          ...styles.main,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.4s ease-out 0.3s',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/orders" element={<OrderBoard />} />
          <Route path="/dashboard" element={<SalesDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#1F2937',
    padding: '24px 0',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
  },
  mobileTopBar: {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  mobileNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9CA3AF',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'all 0.2s',
  },
  mobileNavActive: {
    color: '#FFFFFF',
    backgroundColor: '#374151',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 24px 32px',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 56,
    padding: '0 24px',
    color: '#9CA3AF',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    position: 'relative',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 15,
  },
  navItemActive: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
  },
  navText: {
    fontSize: 15,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    marginLeft: 240,
    padding: 24,
    minHeight: '100vh',
    marginTop: 0,
  },
};

const mediaQuery = window.matchMedia('(max-width: 768px)');
if (mediaQuery.matches) {
  (styles.sidebar as any).display = 'none';
  (styles.mobileTopBar as any).display = 'flex';
  (styles.main as any).marginLeft = 0;
  (styles.main as any).marginTop = 64;
}
mediaQuery.addEventListener('change', (e) => {
  if (e.matches) {
    document.dispatchEvent(new CustomEvent('responsive-change'));
  } else {
    document.dispatchEvent(new CustomEvent('responsive-change'));
  }
});
