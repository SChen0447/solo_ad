import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Merchant from './pages/Merchant'
import Customer from './pages/Customer'
import Redemption from './pages/Redemption'
import { useAppStore } from './store'
import { merchantApi } from './api'

function App() {
  const { errorMessage, setErrorMessage, setMerchants } = useAppStore()

  useEffect(() => {
    merchantApi.getAll().then(setMerchants).catch(console.error)
  }, [])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, setErrorMessage])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {errorMessage && <div className="error-toast">{errorMessage}</div>}
      <nav
        style={{
          height: 56,
          background: '#1a237e',
          color: '#ffffff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(26, 35, 126, 0.25)',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            marginRight: 40,
            letterSpacing: 0.5,
          }}
        >
          🎫 优惠券管理系统
        </div>
        <NavLink to="/merchant" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          🏪 商家端
        </NavLink>
        <NavLink to="/customer" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          🛒 顾客端
        </NavLink>
        <NavLink to="/redemption" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          ✅ 核销端
        </NavLink>
      </nav>

      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/merchant" replace />} />
          <Route path="/merchant" element={<Merchant />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/redemption" element={<Redemption />} />
          <Route path="*" element={<Navigate to="/merchant" replace />} />
        </Routes>
      </main>

      <footer
        style={{
        padding: '24px',
        textAlign: 'center',
        fontSize: 13,
        color: '#90a4ae',
        background: '#ffffff',
        borderTop: '1px solid #eceff1',
      }}
      >
        优惠券分发与核销追踪系统 © 2026
      </footer>
    </div>
  )
}

export default App
