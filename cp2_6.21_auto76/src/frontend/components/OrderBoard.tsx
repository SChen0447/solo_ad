import { useState } from 'react';
import type { Order, OrderStatus } from '../../common/types';

interface OrderBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCreateOrder: (orderData: { customer: string; product: string; quantity: number; amount: number; deadline: string }) => void;
}

const statusColumns: { status: OrderStatus; title: string; color: string }[] = [
  { status: 'pending', title: '待处理', color: '#F59E0B' },
  { status: 'processing', title: '生产中', color: '#6366F1' },
  { status: 'shipping', title: '待发货', color: '#3B82F6' },
  { status: 'completed', title: '已完成', color: '#10B981' },
];

const nextStatusMap: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing'],
  processing: ['shipping', 'pending'],
  shipping: ['completed', 'processing'],
  completed: ['shipping'],
};

const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  processing: '生产中',
  shipping: '待发货',
  completed: '已完成',
};

function NewOrderModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    customer: '',
    product: '',
    quantity: 1,
    amount: 0,
    deadline: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer || !formData.product || !formData.deadline) return;
    onSubmit(formData);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000070',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: 480,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#1E293B' }}>新建订单</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>
              客户名称
            </label>
            <input
              type="text"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              placeholder="请输入客户名称"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>
              产品名称
            </label>
            <input
              type="text"
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              placeholder="请输入产品名称"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>
                数量
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>
                金额 (元)
              </label>
              <input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>
              截止日期
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                color: '#475569',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fff';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                color: '#fff',
                background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              创建订单
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (newStatus: OrderStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const nextStatuses = nextStatusMap[order.status] || [];

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsOpen(false);
      }}
      style={{
        width: 250,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #E2E8F0',
        padding: 12,
        cursor: 'pointer',
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : '#CBD5E1 0 2px 4px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
        {order.customer}
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>{order.product}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#6366F1' }}>¥{order.amount}</span>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>x{order.quantity}</span>
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
        截止: {new Date(order.deadline).toLocaleDateString('zh-CN')}
      </div>

      {isOpen && nextStatuses.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 0', fontSize: 12, color: '#94A3B8', paddingLeft: 12 }}>
            更改状态
          </div>
          {nextStatuses.map((status) => (
            <div
              key={status}
              onClick={() => {
                onStatusChange(status);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                fontSize: 13,
                color: '#475569',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
              }}
            >
              → {statusLabels[status]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderBoard({ orders, onStatusChange, onCreateOrder }: OrderBoardProps) {
  const [showModal, setShowModal] = useState(false);

  const getOrdersByStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1E293B', margin: 0 }}>订单看板</h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: 160,
            height: 48,
            borderRadius: 24,
            border: 'none',
            background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.2s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建订单
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
        {statusColumns.map((col) => {
          const columnOrders = getOrdersByStatus(col.status);

          return (
            <div
              key={col.status}
              style={{
                width: 280,
                flexShrink: 0,
                background: '#F1F5F9',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 160px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: col.color,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{col.title}</span>
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    borderRadius: 11,
                    background: col.color,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {columnOrders.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                {columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => onStatusChange(order.id, status)}
                  />
                ))}
                {columnOrders.length === 0 && (
                  <div
                    style={{
                      padding: '30px 0',
                      textAlign: 'center',
                      color: '#94A3B8',
                      fontSize: 13,
                    }}
                  >
                    暂无订单
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <NewOrderModal
          onClose={() => setShowModal(false)}
          onSubmit={onCreateOrder}
        />
      )}
    </div>
  );
}

export default OrderBoard;
