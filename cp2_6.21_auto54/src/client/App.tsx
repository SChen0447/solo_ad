import { useState, useEffect, useCallback } from 'react';
import OrderModule from './OrderModule';
import DeliveryModule from './DeliveryModule';
import type { Order, DeliveryTask, Stats } from './types';
import { ZONE_COLORS } from './types';

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalAmount: 0, deliveryRate: 0 });
  const [statsKey, setStatsKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
  }, []);

  const fetchDelivery = useCallback(async () => {
    const res = await fetch('/api/delivery');
    const data = await res.json();
    setDeliveryTasks(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
    setStatsKey((k) => k + 1);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchDelivery(), fetchStats()]);
    setLoading(false);
  }, [fetchOrders, fetchDelivery, fetchStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOrderCreated = useCallback(async () => {
    await fetchOrders();
    await fetchStats();
  }, [fetchOrders, fetchStats]);

  const handleStatusChanged = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchDelivery(), fetchStats()]);
  }, [fetchOrders, fetchDelivery(), fetchStats]);

  const handleDeliveryReordered = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchDelivery()]);
  }, [fetchOrders, fetchDelivery]);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#ffffff',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#F97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>社区农产品团购协作平台</h1>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>订单管理 · 配送调度</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>总订单数</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span key={`orders-${statsKey}`} className="count-animate" style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                {stats.totalOrders}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>单</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>总金额</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span key={`amount-${statsKey}`} className="count-animate" style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                ¥{stats.totalAmount.toFixed(1)}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>元</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>配送完成率</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span key={`rate-${statsKey}`} className="count-animate" style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                {stats.deliveryRate}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>%</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS.A }} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>A区</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS.B }} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>B区</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS.C }} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>C区</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          padding: 20,
          gap: 0,
          minHeight: 'calc(100vh - 160px)',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        }}
      >
        <div style={{ flex: window.innerWidth < 768 ? 'none' : '0 0 55%', paddingRight: window.innerWidth < 768 ? 0 : 20 }}>
          <OrderModule
            orders={orders}
            loading={loading}
            onOrderCreated={handleOrderCreated}
            onStatusChanged={handleStatusChanged}
          />
        </div>
        <div
          style={{
            width: window.innerWidth < 768 ? '100%' : 2,
            height: window.innerWidth < 768 ? 2 : 'auto',
            borderLeft: window.innerWidth < 768 ? 'none' : '2px dashed #E5E7EB',
            borderTop: window.innerWidth < 768 ? '2px dashed #E5E7EB' : 'none',
            margin: window.innerWidth < 768 ? '20px 0' : '0',
          }}
        />
        <div style={{ flex: window.innerWidth < 768 ? 'none' : '1', paddingLeft: window.innerWidth < 768 ? 0 : 20 }}>
          <DeliveryModule
            orders={orders}
            deliveryTasks={deliveryTasks}
            onReordered={handleDeliveryReordered}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
