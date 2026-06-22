import { useState, useEffect, useCallback } from 'react'
import type { Product, Order, TabType } from './types'
import { productApi, orderApi } from './api'
import ProductManager from './ProductManager'
import OrderBoard from './OrderBoard'
import SalesDashboard from './SalesDashboard'

const navItems: Array<{ key: TabType; label: string; icon: string }> = [
  { key: 'dashboard', label: '销售看板', icon: '📊' },
  { key: 'products', label: '商品管理', icon: '📦' },
  { key: 'orders', label: '订单管理', icon: '📋' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isMobile, setIsMobile] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const data = await productApi.getAll()
      setProducts(data)
    } catch (error) {
      console.error('获取商品列表失败:', error)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderApi.getAll()
      setOrders(data)
    } catch (error) {
      console.error('获取订单列表失败:', error)
    }
  }, [])

  const refreshData = useCallback(() => {
    fetchProducts()
    fetchOrders()
  }, [fetchProducts, fetchOrders])

  useEffect(() => {
    fetchProducts()
    fetchOrders()
  }, [fetchProducts, fetchOrders])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts()
      fetchOrders()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchProducts, fetchOrders])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const renderContent = () => {
    const baseDelay = activeTab === 'dashboard' ? 0 : activeTab === 'products' ? 0.2 : 0.4
    
    switch (activeTab) {
      case 'products':
        return (
          <ProductManager
            products={products}
            onProductsChange={refreshData}
            delay={baseDelay}
          />
        )
      case 'orders':
        return (
          <OrderBoard
            orders={orders}
            products={products}
            onOrdersChange={refreshData}
            delay={baseDelay}
          />
        )
      case 'dashboard':
        return (
          <SalesDashboard
            products={products}
            orders={orders}
            delay={baseDelay}
          />
        )
      default:
        return null
    }
  }

  if (isMobile) {
    return (
      <div className="mobile-container" style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
        <nav className="mobile-nav" style={mobileNavStyle}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                ...mobileNavItemStyle,
                ...(activeTab === item.key ? mobileNavItemActiveStyle : {}),
              }}
            >
              <span style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</span>
              <span style={{ fontSize: '12px' }}>{item.label}</span>
            </button>
          ))}
        </nav>
        <main className="mobile-main" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar" style={sidebarStyle}>
        <div className="sidebar-header" style={sidebarHeaderStyle}>
          <span style={{ fontSize: '28px' }}>🎪</span>
          <h1 style={sidebarTitleStyle}>创意市集</h1>
        </div>
        <nav className="sidebar-nav" style={sidebarNavStyle}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className="nav-item"
              onClick={() => setActiveTab(item.key)}
              style={{
                ...navItemStyle,
                ...(activeTab === item.key ? navItemActiveStyle : {}),
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.key && !isMobile) {
                  e.currentTarget.style.background = '#4B5563'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.key && !isMobile) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.transform = 'translateX(0)'
                }
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content" style={mainContentStyle}>
        {renderContent()}
      </main>
    </div>
  )
}

const sidebarStyle: React.CSSProperties = {
  width: '240px',
  background: '#1F2937',
  color: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
}

const sidebarHeaderStyle: React.CSSProperties = {
  padding: '32px 24px',
  borderBottom: '1px solid #374151',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const sidebarTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#FFFFFF',
}

const sidebarNavStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px 0',
}

const navItemStyle: React.CSSProperties = {
  width: '100%',
  height: '56px',
  padding: '0 24px',
  background: 'transparent',
  color: '#D1D5DB',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease-out',
  border: 'none',
  cursor: 'pointer',
}

const navItemActiveStyle: React.CSSProperties = {
  background: '#374151',
  color: '#FFFFFF',
  fontWeight: 600,
}

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  background: '#F9FAFB',
  padding: '24px',
  overflowY: 'auto',
}

const mobileNavStyle: React.CSSProperties = {
  height: '64px',
  background: '#1F2937',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  flexShrink: 0,
}

const mobileNavItemStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  background: 'transparent',
  color: '#9CA3AF',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  fontSize: '12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease-out',
}

const mobileNavItemActiveStyle: React.CSSProperties = {
  color: '#FFFFFF',
  background: '#374151',
}

export default App
