import { useState } from 'react';
import type { Order, OrderItem, OrderStatus } from '@/types';
import './styles/OrderList.css';

interface OrderListProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: '#F59E0B' },
  confirmed: { label: '已确认', color: '#10B981' },
  rejected: { label: '已驳回', color: '#EF4444' },
  returned: { label: '已归还', color: '#3B82F6' },
};

function OrderList({ orders, onOrderUpdated }: OrderListProps) {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');
  const otherOrders = filteredOrders.filter((o) => o.status !== 'pending');

  const handleApprove = async (orderId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        onOrderUpdated();
      }
    } catch (err) {
      console.error('审核失败:', err);
    }
  };

  const openReturnModal = (order: Order) => {
    setReturnModalOrder(order);
    setCheckedItems(new Set(order.items.map((i) => i.itemId)));
  };

  const closeReturnModal = () => {
    setReturnModalOrder(null);
    setCheckedItems(new Set());
  };

  const toggleItemCheck = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleReturnSubmit = async () => {
    if (!returnModalOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${returnModalOrder.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnedItemIds: Array.from(checkedItems),
        }),
      });
      if (res.ok) {
        onOrderUpdated();
        closeReturnModal();
      }
    } catch (err) {
      console.error('归还失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderOrderCard = (order: Order) => {
    const statusInfo = STATUS_MAP[order.status];

    return (
      <div
        key={order.id}
        className="order-card fade-in"
        style={{ borderBottom: `2px solid ${statusInfo.color}` }}
      >
        <div className="card-header">
          <span className="order-status" style={{ backgroundColor: statusInfo.color }}>
            {statusInfo.label}
          </span>
          <span className="order-date">{formatDate(order.createdAt)}</span>
        </div>

        <div className="card-body">
          <h4 className="customer-name">{order.customerName}</h4>
          <p className="customer-phone">{order.customerPhone}</p>

          <div className="order-items-info">
            {order.items.map((item: OrderItem) => (
              <div key={item.itemId} className="order-item-info">
                <span className="item-name">{item.itemName}</span>
                <span className="item-qty">×{item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <span>租赁天数</span>
              <span>{order.rentalDays} 天</span>
            </div>
            <div className="summary-row total">
              <span>总价</span>
              <span>¥{order.totalPrice}</span>
            </div>
          </div>
        </div>

        <div className="card-footer">
          {order.status === 'pending' && (
            <>
              <button
                className="btn btn-reject"
                onClick={() => handleApprove(order.id, false)}
              >
                驳回
              </button>
              <button
                className="btn btn-approve"
                onClick={() => handleApprove(order.id, true)}
              >
                通过
              </button>
            </>
          )}
          {order.status === 'confirmed' && (
            <button
              className="btn btn-return"
              onClick={() => openReturnModal(order)}
            >
              归还验收
            </button>
          )}
          {order.status === 'returned' && (
            <span className="returned-note">已完成归还</span>
          )}
          {order.status === 'rejected' && (
            <span className="rejected-note">订单已驳回</span>
          )}
        </div>
      </div>
    );
  };

  const filterOptions: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'confirmed', label: '已确认' },
    { key: 'rejected', label: '已驳回' },
    { key: 'returned', label: '已归还' },
  ];

  return (
    <div className="order-list-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">订单管理</h1>
          <p className="page-subtitle">审核订单、管理租赁状态</p>
        </div>
        <div className="filter-tabs">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              className={`filter-tab ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {pendingOrders.length > 0 && filter === 'pending' && (
        <div className="order-section">
          <h2 className="section-title">待审核订单 ({pendingOrders.length})</h2>
          <div className="orders-grid">
            {pendingOrders.map(renderOrderCard)}
          </div>
        </div>
      )}

      {(filter === 'all' || filter !== 'pending') && (
        <div className="order-section">
          <h2 className="section-title">
            {filter === 'all' ? '所有订单' : STATUS_MAP[filter as OrderStatus].label}订单
            ({filteredOrders.length})
          </h2>
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <p>暂无订单数据</p>
            </div>
          ) : (
            <div className="orders-grid">
              {filteredOrders.map(renderOrderCard)}
            </div>
          )}
        </div>
      )}

      {returnModalOrder && (
        <div className="modal-overlay" onClick={closeReturnModal}>
          <div className="modal-content scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">归还验收</h3>
            <p className="modal-subtitle">
              订单号：{returnModalOrder.id.slice(0, 8)}...
            </p>

            <div className="return-items-list">
              <p className="return-hint">勾选正常归还的物品，未勾选视为损坏待维修</p>
              {returnModalOrder.items.map((item: OrderItem) => (
                <label key={item.itemId} className="return-item-checkbox">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.itemId)}
                    onChange={() => toggleItemCheck(item.itemId)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="item-text">
                    <span className="item-name-text">{item.itemName}</span>
                    <span className="item-qty-text">×{item.quantity}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-cancel"
                onClick={closeReturnModal}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="btn btn-confirm"
                onClick={handleReturnSubmit}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认归还'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderList;
