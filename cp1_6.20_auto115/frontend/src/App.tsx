import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TracePage from './pages/TracePage';
import CertPage from './pages/CertPage';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { to: '/', label: '溯源查询' },
    { to: '/cert', label: '产地认证' },
  ];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={styles.logoIcon}>
              <path
                d="M14 2L4 7v14l10 5 10-5V7L14 2z"
                stroke="#6c5ce7"
                strokeWidth="2"
                fill="rgba(108, 92, 231, 0.1)"
              />
              <path
                d="M9 14l3 3 7-7"
                stroke="#00b894"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={styles.logoText}>溯源链</span>
          </div>

          {!isMobile && (
            <nav style={styles.navDesktop}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    ...styles.navLink,
                    color: isActive ? '#6c5ce7' : '#2d3436',
                  })}
                >
                  {({ isActive, isPending }) => (
                    <>
                      <span style={{
                        ...styles.navLinkText,
                        fontWeight: isActive ? 600 : 500,
                      }}>{item.label}</span>
                      <motion.span
                        style={styles.navLinkUnderline}
                        animate={{
                          scaleX: isActive ? 1 : 0,
                          opacity: isActive ? 1 : 0,
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          {isMobile && (
            <button
              style={styles.hamburgerBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="菜单"
            >
              <motion.div
                animate={{ rotate: mobileMenuOpen ? 45 : 0, y: mobileMenuOpen ? 6 : 0 }}
                transition={{ duration: 0.2 }}
                style={styles.hamburgerLine}
              />
              <motion.div
                animate={{ opacity: mobileMenuOpen ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                style={styles.hamburgerLine}
              />
              <motion.div
                animate={{ rotate: mobileMenuOpen ? -45 : 0, y: mobileMenuOpen ? -6 : 0 }}
                transition={{ duration: 0.2 }}
                style={styles.hamburgerLine}
              />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={styles.navMobile}
            >
              {navItems.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    ...styles.navMobileLink,
                    backgroundColor: isActive ? 'rgba(108, 92, 231, 0.08)' : 'transparent',
                    color: isActive ? '#6c5ce7' : '#2d3436',
                    borderLeft: isActive ? '3px solid #6c5ce7' : '3px solid transparent',
                  })}
                >
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    {item.label}
                  </motion.div>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main style={styles.main}>
        <div style={{
          ...styles.content,
          padding: isMobile ? '20px 16px' : '32px 24px',
        }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TracePage isMobile={isMobile} />
                  </motion.div>
                }
              />
              <Route
                path="/cert"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CertPage isMobile={isMobile} />
                  </motion.div>
                }
              />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2024 溯源链 - 农产品溯源与产地认证平台</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
  },
  headerInner: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoIcon: {
    flexShrink: 0,
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#6c5ce7',
    letterSpacing: '1px',
  },
  navDesktop: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    position: 'relative',
    padding: '8px 4px',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },
  navLinkText: {
    position: 'relative',
    zIndex: 1,
  },
  navLinkUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#6c5ce7',
    borderRadius: '1px',
    transformOrigin: 'center',
  },
  hamburgerBtn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '8px',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
  hamburgerLine: {
    width: '22px',
    height: '2px',
    backgroundColor: '#2d3436',
    borderRadius: '1px',
  },
  navMobile: {
    position: 'absolute',
    top: '64px',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  navMobileLink: {
    display: 'block',
    padding: '16px 24px',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease',
  },
  main: {
    flex: 1,
    display: 'flex',
  },
  content: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  footer: {
    padding: '24px',
    textAlign: 'center',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#ffffff',
  },
  footerText: {
    color: '#636e72',
    fontSize: '13px',
  },
};

export default App;
