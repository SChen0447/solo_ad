import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import OrderForm from './modules/orders/OrderForm'
import OrderList from './modules/orders/OrderList'
import OrderDetail from './modules/orders/OrderDetail'
import InventoryTable from './modules/inventory/InventoryTable'
import Dashboard from './modules/dashboard/Dashboard'

type TabKey = 'orders' | 'inventory' | 'dashboard'

const tabs: { key: TabKey; label: string; path: string }[] = [
  { key: 'orders', label: '订单管理', path: '/orders' },
  { key: 'inventory', label: '库存管理', path: '/inventory' },
  { key: 'dashboard', label: '统计看板', path: '/dashboard' }
]

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = tabs.find((t) => location.pathname.startsWith(t.path))?.key || 'orders'

  const handleTabClick = (key: TabKey) => {
    const tab = tabs.find((t) => t.key === key)
    if (tab) navigate(tab.path)
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="logo">
          <span className="logo-icon">🧁</span>
          <span className="logo-text">甜蜜烘焙</span>
        </div>
        <div className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

function OrderFormPage() {
  const navigate = useNavigate()
  return <OrderForm onBack={() => navigate('/orders')} />
}

function OrderListPage() {
  const navigate = useNavigate()
  return <OrderList onNewOrder={() => navigate('/orders/new')} />
}

export default function App() {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/new" element={<OrderFormPage />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/inventory" element={<InventoryTable />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
