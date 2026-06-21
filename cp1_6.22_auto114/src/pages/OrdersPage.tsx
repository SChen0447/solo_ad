import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../api/orders';
import OrderStatus from '../components/OrderStatus';
import RippleButton from '../components/RippleButton';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (error) {
      showToast('加载订单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceive = async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, 'completed');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'completed' } : o
        )
      );
      showToast('已确认收货！');
    } catch (error) {
      showToast('操作失败，请稍后重试', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('确定要取消这个订单吗？')) return;

    try {
      setUpdatingId(orderId);
      await cancelOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast('订单已取消');
    } catch (error) {
      showToast('取消失败，请稍后重试', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getCustomSummary = (order: Order): string => {
    const parts = [];
    if (order.size) parts.push(order.size);
    if (order.color) parts.push(order.color);
    if (order.engraving) parts.push(`刻字:${order.engraving}`);
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="orders-container">
          <h1 className="page-title">我的订单</h1>
          <div className="order-list">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr auto',
                  gap: '20px',
                  alignItems: 'center',
                }}
              >
                <Skeleton width={80} height={80} style={{ borderRadius: '8px' }} />
                <div>
                  <Skeleton height={20} style={{ marginBottom: '8px' }} />
                  <Skeleton width="60%" height={16} style={{ marginBottom: '12px' }} />
                  <Skeleton width="80%" height={40} />
                </div>
                <Skeleton width={80} height={36} style={{ borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="orders-container">
        <h1 className="page-title">我的订单 ({orders.length})</h1>

        {orders.length > 0 ? (
          <div className="order-list">
            {orders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="order-item-image">
                  <img src={order.workImage} alt={order.workTitle} />
                </div>
                <div className="order-item-info">
                  <h3 className="order-item-title">{order.workTitle}</h3>
                  <p className="order-item-custom">{getCustomSummary(order)}</p>
                  <p className="order-item-price">¥{order.price}</p>
                  <OrderStatus order={order} />
                </div>
                <div className="order-item-actions">
                  {order.status === 'pending' && (
                    <RippleButton
                      className="btn btn-danger"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={updatingId === order.id}
                    >
                      {updatingId === order.id ? '处理中...' : '取消订单'}
                    </RippleButton>
                  )}
                  {order.status === 'shipped' && (
                    <RippleButton
                      className="btn btn-primary"
                      onClick={() => handleConfirmReceive(order.id)}
                      disabled={updatingId === order.id}
                    >
                      {updatingId === order.id ? '处理中...' : '确认收货'}
                    </RippleButton>
                  )}
                  {order.status === 'completed' && (
                    <span style={{ color: '#38a169', fontWeight: '500' }}>已完成 ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>暂无订单</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              去首页挑选您喜欢的作品吧
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
