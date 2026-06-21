import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import WorksGallery from './WorksGallery';
import type { Work, Order, MaterialRecommendation, ComboItem } from '../shared/types';
import { fetchWorks, fetchOrders, createOrder } from './api/MaterialAPI';
import './styles.css';

type Page = 'works' | 'orders';

interface RecentView {
  work: Work;
  viewedAt: number;
}

interface BookingFormData {
  customerName: string;
  customerPhone: string;
  quantity: number;
}

type ComboAction =
  | { type: 'TOGGLE'; payload: MaterialRecommendation; showNotif: (msg: string) => void }
  | { type: 'BULK_ADD'; payload: MaterialRecommendation[]; showNotif: (msg: string) => void }
  | { type: 'REMOVE'; payload: string }
  | { type: 'UPDATE_QTY'; payload: { packId: string; delta: number } }
  | { type: 'CLEAR'; showNotif: (msg: string) => void }
  | { type: 'RESET' };

function comboReducer(state: ComboItem[], action: ComboAction): ComboItem[] {
  switch (action.type) {
    case 'TOGGLE': {
      const pack = action.payload;
      const existing = state.find((c) => c.packId === pack.id);
      if (existing) {
        return state.filter((c) => c.packId !== pack.id);
      }
      const newItem: ComboItem = {
        packId: pack.id,
        packName: pack.name,
        price: pack.price,
        quantity: 1,
        recommendReason: pack.recommendReason,
      };
      action.showNotif(`已将「${pack.name}」加入搭配清单`);
      return [...state, newItem];
    }
    case 'BULK_ADD': {
      const packs = action.payload;
      const existingIds = new Set(state.map((c) => c.packId));
      const newItems: ComboItem[] = packs
        .filter((p) => !existingIds.has(p.id))
        .map((pack) => ({
          packId: pack.id,
          packName: pack.name,
          price: pack.price,
          quantity: 1,
          recommendReason: pack.recommendReason,
        }));
      if (newItems.length > 0) {
        action.showNotif(`已一键搭配 ${newItems.length} 个材料包`);
      } else {
        action.showNotif('推荐材料包均已在搭配清单中');
      }
      return newItems.length > 0 ? [...state, ...newItems] : state;
    }
    case 'REMOVE':
      return state.filter((c) => c.packId !== action.payload);
    case 'UPDATE_QTY':
      return state.map((c) =>
        c.packId === action.payload.packId
          ? { ...c, quantity: Math.max(1, c.quantity + action.payload.delta) }
          : c
      );
    case 'CLEAR':
      action.showNotif('搭配清单已清空');
      return [];
    case 'RESET':
      return [];
    default:
      return state;
  }
}

function createRipple(e: React.MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  ripple.className = 'ripple';
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case '已提交':
      return 'order-status-tag submitted';
    case '已发货':
      return 'order-status-tag shipped';
    case '已完成':
      return 'order-status-tag completed';
    default:
      return 'order-status-tag submitted';
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('works');
  const [works, setWorks] = useState<Work[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationFading, setNotificationFading] = useState(false);

  const [comboItems, dispatchCombo] = useReducer(comboReducer, []);

  const [bookingModal, setBookingModal] = useState<{
    open: boolean;
    pack: MaterialRecommendation | null;
    isComboCheckout: boolean;
  }>({ open: false, pack: null, isComboCheckout: false });
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    customerName: '',
    customerPhone: '',
    quantity: 1,
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });

  useEffect(() => {
    fetchWorks().then(setWorks).catch(console.error);
    fetchOrders().then(setOrders).catch(console.error);
  }, []);

  const allTags = Array.from(new Set(works.flatMap((w) => w.tags)));
  const comboItemIds = useMemo(() => comboItems.map((c) => c.packId), [comboItems]);
  const comboSummary = useMemo(() => {
    const totalQty = comboItems.reduce((sum, c) => sum + c.quantity, 0);
    const totalPrice = comboItems.reduce((sum, c) => sum + c.price * c.quantity, 0);
    return { totalQty, totalPrice };
  }, [comboItems]);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setNotificationFading(false);
    setTimeout(() => {
      setNotificationFading(true);
      setTimeout(() => setNotification(null), 500);
    }, 5000);
  }, []);

  const recordView = useCallback((work: Work) => {
    setRecentViews((prev) => {
      const filtered = prev.filter((v) => v.work.id !== work.id);
      return [{ work, viewedAt: Date.now() }, ...filtered].slice(0, 5);
    });
  }, []);

  const handleBookMaterial = useCallback((pack: MaterialRecommendation) => {
    setBookingModal({ open: true, pack, isComboCheckout: false });
    setBookingForm({ customerName: '', customerPhone: '', quantity: 1 });
  }, []);

  const handleAddToCombo = useCallback((pack: MaterialRecommendation) => {
    dispatchCombo({ type: 'TOGGLE', payload: pack, showNotif: showNotification });
  }, [showNotification]);

  const handleOneClickCombo = useCallback((packs: MaterialRecommendation[]) => {
    dispatchCombo({ type: 'BULK_ADD', payload: packs, showNotif: showNotification });
  }, [showNotification]);

  const handleRemoveFromCombo = useCallback((packId: string) => {
    dispatchCombo({ type: 'REMOVE', payload: packId });
  }, []);

  const handleUpdateComboQty = useCallback((packId: string, delta: number) => {
    dispatchCombo({ type: 'UPDATE_QTY', payload: { packId, delta } });
  }, []);

  const handleClearCombo = useCallback(() => {
    dispatchCombo({ type: 'CLEAR', showNotif: showNotification });
  }, [showNotification]);

  const handleCheckoutCombo = useCallback(() => {
    if (comboItems.length === 0) return;
    const totalQty = comboSummary.totalQty;
    const totalPrice = comboSummary.totalPrice;
    const firstPack: MaterialRecommendation = {
      id: comboItems[0].packId,
      name: `搭配组合（${comboItems.length}件）`,
      price: totalPrice,
      components: comboItems.map((c) => `${c.packName} x${c.quantity}`),
      tagList: [],
      matchScore: 100,
      recommendReason: `包含${comboItems.length}个材料包，共${totalQty}件`,
    };
    setBookingModal({ open: true, pack: firstPack, isComboCheckout: true });
    setBookingForm({ customerName: '', customerPhone: '', quantity: 1 });
  }, [comboItems, comboSummary]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal.pack || bookingSubmitting) return;

    setBookingSubmitting(true);
    try {
      if (bookingModal.isComboCheckout) {
        const results = await Promise.all(
          comboItems.map((item) =>
            createOrder({
              materialPackId: item.packId,
              quantity: item.quantity,
              customerName: bookingForm.customerName,
              customerPhone: bookingForm.customerPhone,
            })
          )
        );
        setOrders((prev) => [...results, ...prev]);
        dispatchCombo({ type: 'RESET' });
        setBookingModal({ open: false, pack: null, isComboCheckout: false });
        showNotification(`搭配订单已提交，共 ${results.length} 个材料包，预计3个工作日内联系`);
      } else {
        const newOrder = await createOrder({
          materialPackId: bookingModal.pack.id,
          quantity: bookingForm.quantity,
          customerName: bookingForm.customerName,
          customerPhone: bookingForm.customerPhone,
        });
        setOrders((prev) => [newOrder, ...prev]);
        setBookingModal({ open: false, pack: null, isComboCheckout: false });
        showNotification('您的订单已提交，预计3个工作日内联系');
      }
    } catch (err) {
      console.error(err);
      alert('提交失败，请稍后重试');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const toggleFilter = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const bookingTotal = bookingModal.pack
    ? bookingModal.isComboCheckout
      ? comboSummary.totalPrice
      : bookingModal.pack.price * bookingForm.quantity
    : 0;

  return (
    <div>
      {notification && (
        <div className={`notification-bar ${notificationFading ? 'fading' : ''}`}>
          {notification}
        </div>
      )}

      <div className="app-layout">
        <main className="app-main">
          <header className="app-header">
            <div className="app-logo">
              <span style={{ fontSize: 28 }}>👜</span>
              匠心皮具
            </div>
            <nav className="app-nav">
              <button
                className={`nav-btn ${currentPage === 'works' ? 'active' : ''}`}
                onClick={(e) => {
                  createRipple(e);
                  setCurrentPage('works');
                }}
              >
                作品展示
              </button>
              <button
                className={`nav-btn ${currentPage === 'orders' ? 'active' : ''}`}
                onClick={(e) => {
                  createRipple(e);
                  setCurrentPage('orders');
                }}
              >
                我的订单
              </button>
            </nav>
          </header>

          {currentPage === 'works' && (
            <WorksGallery
              works={works}
              selectedWorkId={selectedWorkId}
              onSelectWork={setSelectedWorkId}
              onBookMaterial={handleBookMaterial}
              onRecordView={recordView}
              activeFilters={activeFilters}
              comboItemIds={comboItemIds}
              onAddToCombo={handleAddToCombo}
              onOneClickCombo={handleOneClickCombo}
            />
          )}

          {currentPage === 'orders' && (
            <div className="orders-page" style={{ padding: 0 }}>
              <h1 className="orders-title">我的订单</h1>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
                  暂无订单
                </div>
              ) : (
                <div className="orders-stack">
                  {orders.map((order) => (
                    <div key={order.id} className="order-card">
                      <span className={getStatusClass(order.status)}>
                        {order.status}
                      </span>
                      <div className="order-card-body">
                        <div className="order-pack-name">{order.materialPackName}</div>
                        <div className="order-info">数量：{order.quantity} 件</div>
                        <div className="order-info">
                          金额：<span style={{ color: '#10B981', fontWeight: 700 }}>¥{order.totalPrice}</span>
                        </div>
                        <div className="order-info">下单时间：{formatDate(order.createdAt)}</div>
                        <div className="order-info">客户：{order.customerName}</div>
                      </div>
                      <div className="order-card-footer">
                        <button
                          className="order-detail-btn"
                          onClick={(e) => {
                            createRipple(e);
                            setDetailModal({ open: true, order });
                          }}
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="app-sidebar">
          {comboItems.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">🧺 当前搭配清单</h3>
              <div className="combo__list">
                {comboItems.map((item) => (
                  <div key={item.packId} className="combo__item">
                    <div className="combo__item-header">
                      <div className="combo__item-name">{item.packName}</div>
                      <button
                        className="combo__item-remove"
                        aria-label={`移除${item.packName}`}
                        onClick={() => handleRemoveFromCombo(item.packId)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="combo__item-reason">💡 {item.recommendReason}</div>
                    <div className="combo__item-footer">
                      <div className="combo__item-qty">
                        <button
                          className="combo__qty-btn"
                          aria-label="减少数量"
                          onClick={() => handleUpdateComboQty(item.packId, -1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="combo__qty-value">{item.quantity}</span>
                        <button
                          className="combo__qty-btn"
                          aria-label="增加数量"
                          onClick={() => handleUpdateComboQty(item.packId, 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="combo__item-price">¥{item.price * item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="combo__summary">
                <div className="combo__summary-row">
                  <span>材料包数量</span>
                  <span>{comboItems.length} 种</span>
                </div>
                <div className="combo__summary-row">
                  <span>总件数</span>
                  <span>{comboSummary.totalQty} 件</span>
                </div>
                <div className="combo__summary-total">
                  <span>预估总价</span>
                  <span className="total-price">¥{comboSummary.totalPrice}</span>
                </div>
                <div className="combo__summary-actions">
                  <button
                    className="combo__summary-btn combo__summary-btn--clear"
                    onClick={(e) => {
                      createRipple(e);
                      handleClearCombo();
                    }}
                  >
                    清空
                  </button>
                  <button
                    className="combo__summary-btn combo__summary-btn--checkout"
                    onClick={(e) => {
                      createRipple(e);
                      handleCheckoutCombo();
                    }}
                  >
                    批量预订
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h3 className="sidebar-title">🏷 标签筛选</h3>
            <div className="tag-filter-list">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${activeFilters.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleFilter(tag)}
                >
                  {tag}
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button
                  className="tag-filter-btn"
                  onClick={() => setActiveFilters([])}
                  style={{ borderStyle: 'dashed' }}
                >
                  清除全部
                </button>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">👀 最近浏览</h3>
            {recentViews.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: 14 }}>暂无浏览记录</div>
            ) : (
              <div className="recent-list">
                {recentViews.map((v) => (
                  <div
                    key={v.work.id}
                    className="recent-item"
                    onClick={() => {
                      setCurrentPage('works');
                      setSelectedWorkId(v.work.id);
                    }}
                  >
                    <div className="recent-item-thumb">
                      <img src={v.work.imageUrl} alt={v.work.title} />
                    </div>
                    <div className="recent-item-info">
                      <div className="recent-item-name">{v.work.title}</div>
                      <div className="recent-item-time">{formatTimeAgo(v.viewedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">📖 关于我们</h3>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
              匠心皮具工作室专注手工皮具教学与材料包研发。每一件作品都凝聚匠人之心，每一个材料包都助您开启皮具创作之旅。
            </p>
          </div>
        </aside>
      </div>

      {bookingModal.open && bookingModal.pack && (
        <div className="modal-overlay" onClick={() => setBookingModal({ open: false, pack: null, isComboCheckout: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setBookingModal({ open: false, pack: null, isComboCheckout: false })}
            >
              ×
            </button>
            <h2 className="modal-title">
              {bookingModal.isComboCheckout ? '批量预订搭配清单' : '预订材料包'}
            </h2>
            <div style={{ marginBottom: 16, padding: 16, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{bookingModal.pack.name}</div>
              {bookingModal.isComboCheckout ? (
                <div>
                  <div style={{ color: '#10B981', fontWeight: 700, fontSize: 18 }}>¥{comboSummary.totalPrice}</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
                    共 {comboItems.length} 种材料包 / {comboSummary.totalQty} 件
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280', whiteSpace: 'pre-line' }}>
                    {comboItems.map((c) => `· ${c.packName} x${c.quantity}`).join('\n')}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ color: '#10B981', fontWeight: 700, fontSize: 18 }}>¥{bookingModal.pack.price}/件</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
                    包含：{bookingModal.pack.components.slice(0, 3).join('、')}...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitBooking} className="booking-form">
              {!bookingModal.isComboCheckout && (
                <div className="form-group">
                  <label className="form-label">预订数量</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bookingForm.quantity}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  className="form-input"
                  value={bookingForm.customerName}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder="请输入您的姓名"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">联系电话</label>
                <input
                  type="tel"
                  className="form-input"
                  value={bookingForm.customerPhone}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                  }
                  placeholder="请输入联系电话"
                  required
                />
              </div>
              <div className="form-total">总计：¥{bookingTotal}</div>
              <button
                type="submit"
                className="primary-btn"
                disabled={bookingSubmitting}
                onClick={createRipple}
              >
                {bookingSubmitting ? '提交中...' : bookingModal.isComboCheckout ? '确认批量预订' : '确认预订'}
              </button>
            </form>
          </div>
        </div>
      )}

      {detailModal.open && detailModal.order && (
        <div className="modal-overlay" onClick={() => setDetailModal({ open: false, order: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setDetailModal({ open: false, order: null })}
            >
              ×
            </button>
            <h2 className="modal-title">订单详情</h2>
            <div className="modal-row">
              <span className="modal-row-label">订单编号</span>
              <span className="modal-row-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {detailModal.order.id.slice(0, 13).toUpperCase()}
              </span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">材料包</span>
              <span className="modal-row-value">{detailModal.order.materialPackName}</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">数量</span>
              <span className="modal-row-value">{detailModal.order.quantity} 件</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">总金额</span>
              <span className="modal-row-value" style={{ color: '#10B981' }}>
                ¥{detailModal.order.totalPrice}
              </span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">订单状态</span>
              <span
                className="modal-row-value"
                style={{
                  color:
                    detailModal.order.status === '已完成'
                      ? '#10B981'
                      : detailModal.order.status === '已发货'
                      ? '#3B82F6'
                      : '#6B7280',
                }}
              >
                {detailModal.order.status}
              </span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">客户姓名</span>
              <span className="modal-row-value">{detailModal.order.customerName}</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">联系电话</span>
              <span className="modal-row-value">{detailModal.order.customerPhone}</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">下单时间</span>
              <span className="modal-row-value">{formatDate(detailModal.order.createdAt)}</span>
            </div>
            <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 15, fontWeight: 600 }}>材料包组件</h3>
            <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.8 }}>
              {detailModal.order.materialPackComponents.map((c, i) => (
                <div key={i}>· {c}</div>
              ))}
            </div>
            <button
              className="primary-btn"
              style={{ marginTop: 24 }}
              onClick={() => setDetailModal({ open: false, order: null })}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
