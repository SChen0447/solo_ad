import React, { useState, useRef } from 'react';
import { Order } from '../App';

const slideInKeyframes = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const statusConfig = {
  pending: { label: '待发货', color: '#f59e0b', bg: '#fffbeb' },
  shipped: { label: '已发货', color: '#3b82f6', bg: '#eff6ff' },
  delivered: { label: '已签收', color: '#22c55e', bg: '#f0fdf4' },
};

type OrderStatus = 'pending' | 'shipped' | 'delivered';

interface OrderBoardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<any>;
}

export default function OrderBoard({ orders, onUpdateOrder }: OrderBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const dragCounterRef = useRef<Record<string, number>>({ pending: 0, shipped: 0, delivered: 0 });

  const columns: OrderStatus[] = ['pending', 'shipped', 'delivered'];

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedId(orderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', orderId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverColumn(null);
    dragCounterRef.current = { pending: 0, shipped: 0, delivered: 0 };
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragEnterColumn = (e: React.DragEvent, status: OrderStatus) => {
    e.preventDefault();
    dragCounterRef.current[status]++;
    setDragOverColumn(status);
  };

  const handleDragLeaveColumn = (_e: React.DragEvent, status: OrderStatus) => {
    dragCounterRef.current[status]--;
    if (dragCounterRef.current[status] <= 0) {
      dragCounterRef.current[status] = 0;
      if (dragOverColumn === status) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDragOverColumn = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId) {
      await onUpdateOrder(orderId, { status: newStatus });
    }
    setDraggedId(null);
    setDragOverColumn(null);
    dragCounterRef.current = { pending: 0, shipped: 0, delivered: 0 };
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await onUpdateOrder(orderId, { status: newStatus });
  };

  const handleSaveTracking = async (orderId: string) => {
    await onUpdateOrder(orderId, { trackingNumber: trackingInput });
    setEditingTracking(null);
    setTrackingInput('');
  };

  return (
    <>
      <style>{slideInKeyframes}</style>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>订单看板</h2>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {columns.map((status) => {
          const config = statusConfig[status];
          const columnOrders = orders.filter((o) => o.status === status);
          const isOver = dragOverColumn === status;

          return (
            <div
              key={status}
              onDragEnter={(e) => handleDragEnterColumn(e, status)}
              onDragLeave={(e) => handleDragLeaveColumn(e, status)}
              onDragOver={handleDragOverColumn}
              onDrop={(e) => handleDrop(e, status)}
              style={{
                flex: 1,
                minHeight: 300,
                background: isOver ? '#e0f2fe' : '#f9fafb',
                borderRadius: 12,
                border: isOver ? '2px dashed #1e40af' : '1px solid #e5e7eb',
                padding: 14,
                transition: 'all 0.3s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.color }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{config.label}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>
                  {columnOrders.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columnOrders.map((order) => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      width: 320,
                      background: '#fff',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      padding: 14,
                      cursor: 'grab',
                      transition: 'all 0.3s ease-out',
                      animation: 'slideIn 0.3s ease-out',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                      {order.createdAt.slice(0, 10)}
                    </div>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13, marginBottom: 2 }}>
                        {item.productName} x{item.quantity}
                      </div>
                    ))}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>物流:</span>
                      {editingTracking === order.id ? (
                        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                          <input
                            value={trackingInput}
                            onChange={(e) => setTrackingInput(e.target.value)}
                            style={{ flex: 1, padding: '3px 6px', fontSize: 12, borderRadius: 4, border: '1px solid #d1d5db' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTracking(order.id)}
                            style={{ padding: '3px 8px', fontSize: 11, background: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            保存
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{ fontSize: 12, color: order.trackingNumber ? '#1e40af' : '#9ca3af', cursor: 'pointer' }}
                          onClick={() => { setEditingTracking(order.id); setTrackingInput(order.trackingNumber); }}
                        >
                          {order.trackingNumber || '点击填写'}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                      {columns
                        .filter((s) => s !== status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(order.id, s)}
                            style={{
                              padding: '3px 8px',
                              fontSize: 11,
                              border: `1px solid ${statusConfig[s].color}`,
                              borderRadius: 4,
                              background: statusConfig[s].bg,
                              color: statusConfig[s].color,
                              cursor: 'pointer',
                            }}
                          >
                            → {statusConfig[s].label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
