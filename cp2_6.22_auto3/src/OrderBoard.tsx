import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Package, Filter } from 'lucide-react';
import { api } from './api';
import type { Order, OrderStatus } from './types';

const STATUS_FLOW: OrderStatus[] = ['pending', 'paid', 'shipping', 'completed'];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: '#F59E0B' },
  paid: { label: '已支付', color: '#3B82F6' },
  shipping: { label: '发货中', color: '#8B5CF6' },
  completed: { label: '已完成', color: '#10B981' },
};

type FilterKey = 'all' | OrderStatus;

export default function OrderBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loaded, setLoaded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(loadOrders, 3000);
    return () => clearInterval(id);
  }, []);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filter !== 'all') {
      list = list.filter((o) => o.status === filter);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, filter]);

  const cycleStatus = async (order: Order) => {
    if (updatingId) return;
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const nextIdx = (currentIdx + 1) % STATUS_FLOW.length;
    const nextStatus = STATUS_FLOW[nextIdx];
    setUpdatingId(order.id);
    try {
      await api.updateOrderStatus(order.id, nextStatus);
      loadOrders();
    } catch (e: any) {
      alert(e.message || '状态更新失败');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>订单管理</h1>
          <p style={styles.subtitle}>查看和处理所有订单，点击状态标签可流转状态</p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterIcon}>
          <Filter size={16} color="#6B7280" />
        </div>
        {(['all', ...STATUS_FLOW] as FilterKey[]).map((k) => {
          const active = filter === k;
          const label = k === 'all' ? '全部' : STATUS_CONFIG[k as OrderStatus].label;
          const color = k === 'all' ? '#6366F1' : STATUS_CONFIG[k as OrderStatus].color;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                ...styles.filterBtn,
                backgroundColor: active ? color : 'transparent',
                color: active ? '#FFFFFF' : '#374151',
                borderColor: active ? color : '#E5E7EB',
              }}
            >
              {label}
              <span style={{ ...styles.filterCount, color: active ? 'rgba(255,255,255,0.85)' : '#9CA3AF' }}>
                {k === 'all' ? orders.length : orders.filter((o) => o.status === k).length}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={styles.empty}>加载中...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={styles.empty}>
          <ClipboardList size={48} color="#D1D5DB" />
          <p style={{ marginTop: 16, color: '#6B7280' }}>暂无订单</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredOrders.map((o, idx) => {
            const cfg = STATUS_CONFIG[o.status];
            return (
              <div
                key={o.id}
                style={{
                  ...styles.row,
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.35s ease-out ${0.05 * idx}s`,
                }}
              >
                <div style={styles.rowLeft}>
                  {o.productImageUrl ? (
                    <img src={o.productImageUrl} alt={o.productName} style={styles.thumb} />
                  ) : (
                    <div style={{ ...styles.thumb, ...styles.thumbFallback }}>
                      <Package size={18} color="#9CA3AF" />
                    </div>
                  )}
                  <div style={styles.rowInfo}>
                    <div style={styles.rowName}>{o.productName}</div>
                    <div style={styles.rowMeta}>
                      <span>数量 x{o.quantity}</span>
                      <span style={{ margin: '0 8px', color: '#E5E7EB' }}>·</span>
                      <span>{formatTime(o.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div style={styles.rowRight}>
                  <div style={styles.rowPrice}>¥{o.totalPrice.toFixed(2)}</div>
                  <button
                    onClick={() => cycleStatus(o)}
                    disabled={updatingId === o.id}
                    style={{
                      ...styles.statusTag,
                      backgroundColor: cfg.color,
                      transition: 'background-color 0.4s ease',
                      opacity: updatingId === o.id ? 0.6 : 1,
                    }}
                  >
                    {cfg.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterBar: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E7EB',
  },
  filterIcon: {
    marginRight: 4,
    display: 'flex',
    alignItems: 'center',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
  },
  filterCount: {
    fontSize: 11,
    fontWeight: 500,
    padding: '1px 6px',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 80,
    padding: '0 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E7EB',
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
    transition: 'all 0.2s',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    backgroundColor: '#F3F4F6',
  },
  thumbFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1F2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: {
    fontSize: 13,
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  rowPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  statusTag: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E7EB',
    color: '#6B7280',
  },
};
