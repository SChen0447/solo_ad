import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Order } from '../../types';
import { useStore, packagingStyles } from '../store/Store';

const statusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
};

const statusColors: Record<string, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  completed: 'status-completed',
};

const AdminOrdersPage: React.FC = () => {
  const { dispatch } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const mockOrders: Order[] = [
    {
      id: 1,
      orderNo: 'FL202401001',
      flowers: [
      { id: 1, instanceId: '1', name: '红玫瑰', category: '玫瑰', price: 8, stock: 50, image: '🌹', description: '', color: '#FF4444', position: { x: 0, y: 0 }, rotation: 0, scale: 1 },
    ],
      packaging: 'pink',
      totalPrice: 18,
      status: 'pending',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: 2,
      orderNo: 'FL202401002',
      flowers: [
      { id: 1, instanceId: '2', name: '红玫瑰', category: '玫瑰', price: 8, stock: 50, image: '🌹', description: '', color: '#FF4444', position: { x: 0, y: 0 }, rotation: 0, scale: 1 },
      { id: 5, instanceId: '3', name: '白色满天星', category: '满天星', price: 5, stock: 100, image: '✨', description: '', color: '#F0F0F0', position: { x: 0, y: 0 }, rotation: 0, scale: 1 },
    ],
      packaging: 'kraft',
      totalPrice: 31,
      status: 'confirmed',
      createdAt: '2024-01-14T15:20:00Z',
    },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<Order[]>('/api/admin/orders');
        setOrders(response.data);
      } catch (error) {
        setOrders(mockOrders);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const updateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      await axios.put(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = selectedStatus === 'all' || order.status === selectedStatus;
    const dateMatch = !selectedDate || order.createdAt.startsWith(selectedDate);
    return statusMatch && dateMatch;
  });

  const getFlowerSummary = (flowers: Order['flowers']) => {
    const counts = flowers.reduce((acc, f) => {
      acc[f.name] = (acc[f.name] || 0);
      acc[f.name]++;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .map(([name, count]) => `${name}×${count}`)
      .join('、');
  };

  const handleBack = () => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'editor' });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
      <button className="back-btn" onClick={handleBack}>← 返回首页</button>
      <h2>订单管理后台</h2>
    </div>

    <div className="admin-filters">
      <div className="filter-group">
        <label>状态筛选</label>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
          <option value="completed">已完成</option>
        </select>
      </div>
      <div className="filter-group">
        <label>日期筛选</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>
    </div>

    {isLoading ? (
      <div className="loading">加载中...</div>
    ) : (
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">暂无订单</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <span className="order-no">{order.orderNo}</span>
                  <span className={`order-status ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>
                <div className="order-date">
                  {new Date(order.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="order-body">
                <div className="order-flowers">
                  <span className="label">花材:</span>
                  <span className="value">{getFlowerSummary(order.flowers)}</span>
                </div>
                <div className="order-packaging">
                  <span className="label">包装:</span>
                  <span className="value">
                    {packagingStyles.find(p => p.id === order.packaging)?.name}
                  </span>
                </div>
                <div className="order-price">
                  <span className="label">金额:</span>
                  <span className="value price">¥{order.totalPrice}</span>
                </div>
              </div>
              {order.status !== 'completed' && (
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <button
                      className="btn-confirm"
                      onClick={() => updateOrderStatus(order.id!, 'confirmed')}>
                      确认订单
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      className="btn-complete"
                      onClick={() => updateOrderStatus(order.id!, 'completed')}>
                      完成订单
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )}
    </div>
  );
};

export default AdminOrdersPage;
