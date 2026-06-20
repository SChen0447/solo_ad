import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import TicketForm from './组件/工单提交模块/TicketForm'
import TicketList from './组件/工单列表模块/TicketList'
import TicketDetail from './组件/工单详情模块/TicketDetail'
import StatsBoard from './组件/数据统计模块/StatsBoard'

const App: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '提交工单', icon: '✏️' },
    { path: '/tickets', label: '工单列表', icon: '📋' },
    { path: '/stats', label: '数据统计', icon: '📊' },
  ]

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <div className="nav-inner" style={styles.navInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🎫</span>
            <span style={styles.logoText}>工单管理系统</span>
          </div>
          <div style={styles.navLinks}>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navLink,
                  ...(location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path))
                    ? styles.navLinkActive
                    : {}),
                }}
              >
                <span style={{ marginRight: 6 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            <Route path="/" element={<TicketForm />} />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/stats" element={<StatsBoard />} />
          </Routes>
        </motion.div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2024 客户反馈工单管理系统</p>
      </footer>

      <style>{`
        input:focus, textarea:focus, select:focus {
          border-color: #2563eb !important;
        }
        .nav-link:hover {
          background-color: #f3f4f6 !important;
        }
        @media (max-width: 768px) {
          .charts-container {
            grid-template-columns: 1fr !important;
          }
          .form-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
          }
          .nav-inner {
            flex-direction: column;
            height: auto !important;
            padding: 12px 24px !important;
            gap: 12px;
          }
          .ticket-item {
            height: auto !important;
            flex-wrap: wrap;
            gap: 8px !important;
          }
          .ticket-item .created-at {
            text-align: left !important;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navInner: {
    maxWidth: 1024,
    margin: '0 auto',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  navLinks: {
    display: 'flex',
    gap: 4,
  },
  navLink: {
    padding: '8px 16px',
    borderRadius: 8,
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  main: {
    flex: 1,
    maxWidth: 1024,
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px',
  },
  footer: {
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 13,
  },
}

export default App
