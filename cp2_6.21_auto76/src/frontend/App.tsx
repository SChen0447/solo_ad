import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import type { Order, Material, WorkOrder, Shipment, TrendData } from '../common/types';
import Dashboard from './components/Dashboard';
import OrderBoard from './components/OrderBoard';
import MaterialPanel from './components/MaterialPanel';
import ShipmentTimeline from './components/ShipmentTimeline';

const navItems = [
  { path: '/', label: '仪表盘', icon: 'dashboard' },
  { path: '/orders', label: '订单管理', icon: 'orders' },
  { path: '/materials', label: '物料库存', icon: 'materials' },
  { path: '/shipments', label: '发货计划', icon: 'shipments' },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case 'orders':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      );
    case 'materials':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'shipments':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
    default:
      return null;
  }
}

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const location = useLocation();

  const fetchAllData = async () => {
    try {
      const [ordersRes, materialsRes, workOrdersRes, shipmentsRes, trendsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/materials'),
        fetch('/api/workorders'),
        fetch('/api/shipments'),
        fetch('/api/trends'),
      ]);

      const [ordersData, materialsData, workOrdersData, shipmentsData, trendsData] = await Promise.all([
        ordersRes.json(),
        materialsRes.json(),
        workOrdersRes.json(),
        shipmentsRes.json(),
        trendsRes.json(),
      ]);

      setOrders(ordersData);
      setMaterials(materialsData);
      setWorkOrders(workOrdersData);
      setShipments(shipmentsData);
      setTrends(trendsData);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('更新订单状态失败:', error);
    }
  };

  const handleCreateOrder = async (orderData: { customer: string; product: string; quantity: number; amount: number; deadline: string }) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('创建订单失败:', error);
    }
  };

  const handlePurchase = async (materialId: string) => {
    try {
      const res = await fetch(`/api/materials/${materialId}/purchase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('补货失败:', error);
    }
  };

  const handleShipmentComplete = async (shipmentId: string) => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/complete`, {
        method: 'PUT',
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('确认发货失败:', error);
    }
  };

  const todayOrders = orders.filter((o) => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  }).length;

  const pendingWorkOrders = workOrders.filter((w) => w.status === 'waiting' || w.status === 'inProgress').length;

  const lowStockCount = materials.filter((m) => m.currentStock < m.safetyStock).length;

  const pendingShipments = shipments.filter((s) => !s.completed).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside
        style={{
          width: 240,
          backgroundColor: '#1E293B',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #334155' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#fff' }}>手工坊管理系统</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0 0' }}>Workshop Management</p>
        </div>
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showAlert = item.icon === 'materials' && lowStockCount > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px 12px 16px',
                  color: '#fff',
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'background-color 0.2s ease-out',
                  backgroundColor: isActive ? '#334155' : 'transparent',
                })}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#334155';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '10%',
                      width: 4,
                      height: '80%',
                      background: '#6366F1',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <div style={{ position: 'relative' }}>
                  <Icon name={item.icon} size={20} />
                  {showAlert && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        color: '#EF4444',
                        width: 12,
                        height: 12,
                      }}
                    >
                      <Icon name="alert" size={12} />
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', fontSize: 12, color: '#64748B' }}>
          v1.0.0
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#F8F9FA', padding: 24 }}>
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                todayOrders={todayOrders}
                pendingWorkOrders={pendingWorkOrders}
                lowStockCount={lowStockCount}
                pendingShipments={pendingShipments}
                workOrders={workOrders}
                orders={orders}
                trends={trends}
              />
            }
          />
          <Route
            path="/orders"
            element={<OrderBoard orders={orders} onStatusChange={handleStatusChange} onCreateOrder={handleCreateOrder} />}
          />
          <Route
            path="/materials"
            element={<MaterialPanel materials={materials} onPurchase={handlePurchase} />}
          />
          <Route
            path="/shipments"
            element={<ShipmentTimeline shipments={shipments} onComplete={handleShipmentComplete} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
