import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Search,
  Menu,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ReminderBell from './ReminderBell';

interface LayoutProps {
  children: ReactNode;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      if (width < 640) {
        setSidebarOpen(false);
      } else if (width >= 1024) {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems: MenuItem[] = [
    { icon: <LayoutDashboard size={20} />, label: '仪表盘', path: '/dashboard' },
    { icon: <BookOpen size={20} />, label: '我的计划', path: '/dashboard' },
    { icon: <BarChart3 size={20} />, label: '统计', path: '/stats' },
    { icon: <Settings size={20} />, label: '设置', path: '/settings' },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarVariants = {
    open: { width: isTablet ? 64 : 240, transition: { duration: 0.2 } },
    closed: { width: 0, transition: { duration: 0.2 } },
    mobile: { x: 0, transition: { duration: 0.2 } },
    mobileClosed: { x: '-100%', transition: { duration: 0.2 } },
  };

  return (
    <div className="app-layout">
      <AnimatePresence>
        {isMobile ? (
          <>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="sidebar-overlay"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            <motion.aside
              initial="mobileClosed"
              animate={mobileMenuOpen ? 'mobile' : 'mobileClosed'}
              variants={sidebarVariants}
              className="sidebar sidebar-mobile"
            >
              <div className="sidebar-header">
                <div className="logo">
                  <GraduationCap size={24} className="logo-icon" />
                  <span className="logo-text">LearnFlow</span>
                </div>
              </div>
              <nav className="sidebar-nav">
                {menuItems.map((item) => (
                  <motion.div
                    key={item.path}
                    whileHover={{ backgroundColor: 'rgba(30, 41, 59, 1)' }}
                    onClick={() => handleMenuClick(item.path)}
                    className={`nav-item ${
                      location.pathname === item.path ? 'active' : ''
                    }`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </motion.div>
                ))}
              </nav>
            </motion.aside>
          </>
        ) : (
          <motion.aside
            animate={sidebarOpen ? 'open' : 'closed'}
            variants={sidebarVariants}
            className="sidebar"
          >
            <div className="sidebar-header">
              <div className="logo">
                <GraduationCap size={24} className="logo-icon" />
                {sidebarOpen && !isTablet && (
                  <span className="logo-text">LearnFlow</span>
                )}
              </div>
            </div>
            <nav className="sidebar-nav">
              {menuItems.map((item) => (
                <motion.div
                  key={item.path}
                  whileHover={{ backgroundColor: 'rgba(30, 41, 59, 1)' }}
                  onClick={() => handleMenuClick(item.path)}
                  className={`nav-item ${
                    location.pathname === item.path ? 'active' : ''
                  }`}
                  title={item.label}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && !isTablet && (
                    <span className="nav-label">{item.label}</span>
                  )}
                </motion.div>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            {isMobile ? (
              <button 
                className="menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu size={20} />
              </button>
            ) : (
              <button 
                className="menu-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={20} />
              </button>
            )}
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="topbar-right">
            <ReminderBell />
            <div className="user-menu">
              <div className="user-avatar">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <button 
                className="logout-btn"
                onClick={handleLogout}
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
