import { useState, useMemo, useEffect, useRef } from 'react';
import type { Order, OrderStatus, OrderItem } from './types';
import { STATUS_LABELS, ZONE_COLORS } from './types';

interface OrderModuleProps {
  orders: Order[];
  loading: boolean;
  onOrderCreated: () => void;
  onStatusChanged: () => void;
}

const STATUS_FLOW: OrderStatus[] = ['pending_payment', 'paid', 'delivering', 'completed'];
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#F59E0B',
  paid: '#10B981',
  delivering: '#F97316',
  completed: '#6B7280',
};

function TruckIcon() {
  return (
    <span className="truck-icon" style={{ display: 'inline-flex', marginRight: 4, color: '#F97316' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </span>
  );
}

function OrderCard({
  order,
  flash,
  onViewDetail,
  onAdvanceStatus,
}: {
  order: Order;
  flash: boolean;
  onViewDetail: (o: Order) => void;
  onAdvanceStatus: (o: Order) => void;
}) {
  const [clicked, setClicked] = useState(false);
  const pulseColor = ZONE_COLORS[order.zone];

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
    onViewDetail(order);
  };

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdvanceStatus(order);
  };

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  return (
    <div
      className={`card ${flash ? 'status-flash' : ''} ${clicked ? 'clicked' : ''}`}
      style={{
        marginBottom: 12,
        '--pulse-color': pulseColor,
        borderLeft: `4px solid ${STATUS_COLORS[order.status]}`,
      } as React.CSSProperties}
      onClick={handleClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {order.status === 'delivering' && <TruckIcon />}
            <span style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>
              {order.items.map((i) => i.productName).join('、')}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            {order.items.map((i) => `${i.productName} x${i.quantity}`).join('，')}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>
            {order.contactName} · {order.contactPhone}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F97316', marginBottom: 4 }}>
            ¥{order.totalAmount.toFixed(1)}
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: STATUS_COLORS[order.status] + '20',
              color: STATUS_COLORS[order.status],
            }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>
      {nextStatus && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button
            className="btn"
            style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={handleAdvance}
          >
            标记为{STATUS_LABELS[nextStatus]}
          </button>
        </div>
      )}
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>订单详情</h3>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            关闭
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>订单状态</div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              background: STATUS_COLORS[order.status] + '20',
              color: STATUS_COLORS[order.status],
            }}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <span
            style={{
              marginLeft: 8,
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              background: ZONE_COLORS[order.zone],
              color: '#374151',
            }}
          >
            {order.zone}区
          </span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>产品清单</div>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12 }}>
            {order.items.map((item: OrderItem, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < order.items.length - 1 ? '1px solid #E5E7EB' : 'none',
                }}
              >
                <span style={{ color: '#374151', fontSize: 14 }}>
                  {item.productName} × {item.quantity}
                </span>
                <span style={{ color: '#6B7280', fontSize: 14 }}>
                  ¥{(item.unitPrice * item.quantity).toFixed(1)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '2px solid #E5E7EB' }}>
              <span style={{ color: '#1F2937', fontWeight: 600, fontSize: 14 }}>合计</span>
              <span style={{ color: '#F97316', fontWeight: 700, fontSize: 16 }}>¥{order.totalAmount.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>联系人</div>
          <div style={{ fontSize: 14, color: '#374151' }}>{order.contactName}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>联系电话</div>
          <div style={{ fontSize: 14, color: '#374151' }}>{order.contactPhone}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>收货地址</div>
          <div style={{ fontSize: 14, color: '#374151' }}>{order.address}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>下单时间</div>
          <div style={{ fontSize: 14, color: '#374151' }}>
            {new Date(order.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>

        {order.remark && (
          <div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>备注</div>
            <div style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>{order.remark}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewOrderModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [remark, setRemark] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (!productName || !quantity || !unitPrice || !contactName || !contactPhone || !address) {
      alert('请填写完整的订单信息');
      return;
    }
    onSubmit({
      items: [{ productName, quantity: parseInt(quantity), unitPrice: parseFloat(unitPrice) }],
      contactName,
      contactPhone,
      address,
      remark: remark || undefined,
    });
    setProductName('');
    setQuantity('1');
    setUnitPrice('');
    setContactName('');
    setContactPhone('');
    setAddress('');
    setRemark('');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>新增订单</h3>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
            关闭
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>产品名称 *</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="如：有机西红柿"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>数量 *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>单价(元) *</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="如：6.5"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>联系人姓名 *</label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="如：张阿姨"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>联系电话 *</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="如：138****1234"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>收货地址 *</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="如：阳光花园小区3号楼2单元"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            系统将根据地址自动分配配送区域
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>备注</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="选填，配送要求等"
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
            取消
          </button>
          <button onClick={handleSubmit} className="btn" style={{ flex: 1 }}>
            提交订单
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  color: '#374151',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export default function OrderModule({
  orders,
  loading,
  onOrderCreated,
  onStatusChanged,
}: OrderModuleProps) {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [flashingOrderIds, setFlashingOrderIds] = useState<Set<string>>(new Set());
  const prevStatusMapRef = useRef<Map<string, OrderStatus> | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (prevStatusMapRef.current === null) {
      const initialMap = new Map<string, OrderStatus>();
      orders.forEach((o) => initialMap.set(o.id, o.status));
      prevStatusMapRef.current = initialMap;
      return;
    }

    const changedIds: string[] = [];
    const currentMap = new Map<string, OrderStatus>();

    orders.forEach((order) => {
      currentMap.set(order.id, order.status);
      const prevStatus = prevStatusMapRef.current!.get(order.id);
      if (prevStatus !== undefined && prevStatus !== order.status) {
        changedIds.push(order.id);
      }
    });

    prevStatusMapRef.current = currentMap;

    if (changedIds.length === 0) return;

    if (flashTimeoutRef.current !== null) {
      clearTimeout(flashTimeoutRef.current);
    }

    setFlashingOrderIds(new Set(changedIds));

    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashingOrderIds(new Set());
      flashTimeoutRef.current = null;
    }, 400);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {
      pending_payment: [],
      paid: [],
      delivering: [],
      completed: [],
    };
    filteredOrders.forEach((o) => {
      groups[o.status].push(o);
    });
    return groups;
  }, [filteredOrders]);

  const handleAdvanceStatus = async (order: Order) => {
    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
    if (!nextStatus) return;
    await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    onStatusChanged();
  };

  const handleCreateOrder = async (data: any) => {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShowNewModal(false);
    onOrderCreated();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>订单管理</h2>
        <button className="btn" onClick={() => setShowNewModal(true)}>
          + 新增订单
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`filter-tag ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部 ({orders.length})
        </button>
        {STATUS_FLOW.map((s) => (
          <button
            key={s}
            className={`filter-tag ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {STATUS_LABELS[s]} ({orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>加载中...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>暂无订单</div>
      ) : (
        STATUS_FLOW.map((status) => (
          groupedOrders[status].length > 0 && (
            <div key={status} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 4,
                    height: 16,
                    borderRadius: 2,
                    background: STATUS_COLORS[status],
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  {STATUS_LABELS[status]}
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>({groupedOrders[status].length})</span>
              </div>
              {groupedOrders[status].map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  flash={flashingOrderIds.has(order.id)}
                  onViewDetail={setSelectedOrder}
                  onAdvanceStatus={handleAdvanceStatus}
                />
              ))}
            </div>
          )
        ))
      )}

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <NewOrderModal open={showNewModal} onClose={() => setShowNewModal(false)} onSubmit={handleCreateOrder} />
    </div>
  );
}
