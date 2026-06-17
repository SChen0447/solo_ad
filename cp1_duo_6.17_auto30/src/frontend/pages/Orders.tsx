import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

interface Order {
  id: string;
  sku_id: string;
  sku_name: string;
  sku_image: string;
  quantity: number;
  platform: string;
  platform_name: string;
  warehouse_id: string;
  status: string;
  created_at: string;
  tracking_no?: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  per_page: number;
}

const PLATFORM_ICONS: Record<string, string> = {
  official: '🌐',
  taobao: '🛒',
  pinduoduo: '🏷️',
};

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '待处理', color: '#f07b3f', bg: '#fff3e6' },
  allocated: { text: '已分配', color: '#0f4c81', bg: '#e6eef5' },
  shipped: { text: '已发货', color: '#27ae60', bg: '#e8f5e9' },
  returned: { text: '已退货', color: '#e74c3c', bg: '#fdecea' },
};

const BATCH_OPERATIONS = [
  { key: 'allocate', label: '批量分配', color: '#0f4c81' },
  { key: 'ship', label: '批量发货', color: '#27ae60' },
  { key: 'return', label: '批量退货', color: '#e74c3c' },
] as const;

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState(false);
  const [batchResult, setBatchResult] = useState<{ success: number; failed: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const perPage = 10;

  const fetchOrders = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, per_page: perPage };
      if (filterPlatform) params.platform = filterPlatform;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get<OrdersResponse>('/api/orders/', { params });
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterPlatform, filterStatus]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleAction = async (orderId: string, action: string) => {
    setActionLoading(orderId + action);
    try {
      await axios.post(`/api/orders/${orderId}/${action}`);
      fetchOrders(page);
    } catch (err: any) {
      alert(err?.response?.data?.error || '操作失败');
    }
    setActionLoading(null);
  };

  const toggleSelect = (orderId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleBatch = async (operation: string) => {
    if (selected.size === 0) return;
    setBatchProgress(true);
    setBatchResult(null);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = await axios.post('/api/orders/batch', {
        operation,
        order_ids: Array.from(selected),
      });
      setBatchResult({
        success: res.data.success_count,
        failed: res.data.failed_count,
      });
      setSelected(new Set());
      fetchOrders(page);
    } catch { /* ignore */ }
    setTimeout(() => {
      setBatchProgress(false);
      setBatchResult(null);
    }, 3000);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: '#0f4c81', margin: 0 }}>订单处理面板</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filterPlatform}
            onChange={(e) => { setFilterPlatform(e.target.value); }}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13 }}
          >
            <option value="">全部平台</option>
            <option value="official">官网</option>
            <option value="taobao">淘宝</option>
            <option value="pinduoduo">拼多多</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); }}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13 }}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="allocated">已分配</option>
            <option value="shipped">已发货</option>
            <option value="returned">已退货</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: '#666' }}>已选 {selected.size} 个订单</span>
          {BATCH_OPERATIONS.map((op) => (
            <button
              key={op.key}
              onClick={() => handleBatch(op.key)}
              disabled={batchProgress}
              style={{
                background: op.color,
                color: '#fff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 6,
                cursor: batchProgress ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'transform 0.2s',
                opacity: batchProgress ? 0.6 : 1,
              }}
              onMouseDown={(e) => !batchProgress && (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {op.label}
            </button>
          ))}
        </div>
      )}

      {batchProgress && (
        <div style={{
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
            批量操作进行中...
          </div>
          <div style={{
            height: 8,
            background: '#e8ecf1',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #0f4c81, #f07b3f)',
              borderRadius: 4,
              animation: 'progressFill 0.4s ease-out forwards',
            }} />
          </div>
        </div>
      )}

      {batchResult && (
        <div style={{
          background: '#fff',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          fontSize: 13,
          display: 'flex',
          gap: 16,
        }}>
          <span style={{ color: '#27ae60' }}>✓ 成功 {batchResult.success}</span>
          {batchResult.failed > 0 && (
            <span style={{ color: '#e74c3c' }}>✗ 失败 {batchResult.failed}</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: 10,
              padding: 16,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              gap: 16,
            }}>
              <div style={{ width: 56, height: 56, background: '#eee', borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: '#eee', borderRadius: 4, width: `${50 + Math.random() * 30}%`, marginBottom: 8 }} />
                <div style={{ height: 12, background: '#eee', borderRadius: 4, width: `${30 + Math.random() * 20}%` }} />
              </div>
            </div>
          ))
        ) : (
          orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            return (
              <div
                key={order.id}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  padding: 16,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  border: selected.has(order.id) ? '2px solid #0f4c81' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(order.id)}
                  onChange={() => toggleSelect(order.id)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0f4c81' }}
                />
                <img
                  src={order.sku_image}
                  alt={order.sku_name}
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', background: '#f5f5f5' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{order.sku_name}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>x{order.quantity}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#999' }}>
                    <span>{PLATFORM_ICONS[order.platform]} {order.platform_name}</span>
                    <span>·</span>
                    <span>{order.id}</span>
                    <span>·</span>
                    <span>{dayjs(order.created_at).format('MM-DD HH:mm')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 12,
                    color: statusInfo.color,
                    background: statusInfo.bg,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {statusInfo.text}
                  </span>
                  {order.tracking_no && (
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {order.tracking_no}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleAction(order.id, 'allocate')}
                      disabled={actionLoading === order.id + 'allocate'}
                      style={{
                        background: '#0f4c81',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'transform 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      分配库存
                    </button>
                  )}
                  {order.status === 'allocated' && (
                    <button
                      onClick={() => handleAction(order.id, 'ship')}
                      disabled={actionLoading === order.id + 'ship'}
                      style={{
                        background: '#27ae60',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'transform 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      发货
                    </button>
                  )}
                  {(order.status === 'shipped' || order.status === 'allocated') && (
                    <button
                      onClick={() => handleAction(order.id, 'return')}
                      disabled={actionLoading === order.id + 'return'}
                      style={{
                        background: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'transform 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      退货
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        padding: 16,
      }}>
        <button
          onClick={() => fetchOrders(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #d0d5dd',
            background: page <= 1 ? '#f5f5f5' : '#fff',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          上一页
        </button>
        <span style={{ fontSize: 13, color: '#666' }}>
          第 {page} / {totalPages} 页（共 {total} 条）
        </span>
        <button
          onClick={() => fetchOrders(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #d0d5dd',
            background: page >= totalPages ? '#f5f5f5' : '#fff',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          下一页
        </button>
      </div>
    </div>
  );
};

export default Orders;
