import { useState, useEffect, useCallback, useRef } from 'react';
import OrderModule from './OrderModule';
import DeliveryModule from './DeliveryModule';
import type { Order, DeliveryTask, Stats } from './types';
import { ZONE_COLORS } from './types';

function AnimatedNumber({
  value,
  duration = 500,
  formatter,
}: {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = performance.now();

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (startValue === endValue) {
      prevValueRef.current = endValue;
      return;
    }

    const animate = (currentTime: number) => {
      if (!isMountedRef.current) return;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [value, duration]);

  const display = formatter ? formatter(displayValue) : Math.round(displayValue).toString();
  return <span className="count-animate">{display}</span>;
}

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalAmount: 0, deliveryRate: 0 });
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
  }, [fetchOrders, fetchDelivery, fetchStats]);

  const handleDeliveryReordered = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchDelivery()]);
  }, [fetchOrders, fetchDelivery]);

  return (
    <div className="app-container">
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
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
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140, boxShadow: 'inset 0 0 0 1px #F3F4F6' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>总订单数</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                <AnimatedNumber value={stats.totalOrders} />
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>单</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140, boxShadow: 'inset 0 0 0 1px #F3F4F6' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>总金额</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                ¥<AnimatedNumber value={stats.totalAmount} duration={500} formatter={(v) => v.toFixed(1)} />
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>元</span>
            </div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, minWidth: 140, boxShadow: 'inset 0 0 0 1px #F3F4F6' }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>配送完成率</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>
                <AnimatedNumber value={stats.deliveryRate} />
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

      <div className="main-layout">
        <div className="order-section">
          <OrderModule
            orders={orders}
            loading={loading}
            onOrderCreated={handleOrderCreated}
            onStatusChanged={handleStatusChanged}
          />
        </div>
        <div className="divider" />
        <div className="delivery-section">
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
