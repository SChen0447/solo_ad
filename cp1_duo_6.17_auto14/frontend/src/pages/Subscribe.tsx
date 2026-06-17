import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI } from '../utils/api';
import type { Subscription, Delivery } from '../types';
import './Subscribe.scss';

function Subscribe() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSubId, setCancelSubId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    beanId: 1,
    frequency: 'monthly',
    weight: '250g',
    address: '',
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await subscriptionsAPI.getAll();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      setSubscriptions(mockSubscriptions);
    } finally {
      setLoading(false);
    }
  };

  const allDeliveries = subscriptions.flatMap((sub) => sub.deliveries || []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);

  const getDeliveryForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allDeliveries.find((d) => d.date.startsWith(dateStr));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const delivery = getDeliveryForDate(day);
    if (delivery) {
      setSelectedDelivery(delivery);
    }
  };

  const handleCancelSubscription = (subId: number) => {
    setCancelSubId(subId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (cancelSubId) {
      try {
        await subscriptionsAPI.cancel(cancelSubId);
        setSubscriptions((prev) =>
          prev.map((sub) =>
            sub.id === cancelSubId ? { ...sub, status: 'cancelled' } : sub
          )
        );
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
      }
    }
    setShowCancelModal(false);
    setCancelSubId(null);
  };

  const handlePauseSubscription = async (subId: number) => {
    try {
      const sub = subscriptions.find((s) => s.id === subId);
      if (sub) {
        const newStatus = sub.status === 'active' ? 'paused' : 'active';
        await subscriptionsAPI.update(subId, { status: newStatus });
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === subId ? { ...s, status: newStatus } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleReviewDelivery = (delivery: Delivery) => {
    navigate(`/community/new?beanId=${delivery.bean_id}`);
    setSelectedDelivery(null);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="subscribe-page">
      <div className="subscribe-page__header">
        <h1 className="subscribe-page__title">我的订阅</h1>
        <button className="btn btn--primary" onClick={() => setShowSubscribeModal(true)}>
          + 新增订阅
        </button>
      </div>

      <div className="subscribe-page__content">
        <div className="calendar-section">
          <div className="calendar-header">
            <button className="calendar-nav" onClick={prevMonth}>
              ‹
            </button>
            <h2 className="calendar-title">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
            <button className="calendar-nav" onClick={nextMonth}>
              ›
            </button>
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot legend-dot--pending" />
              <span>待配送</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--delivered" />
              <span>已送达</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--in-transit" />
              <span>配送中</span>
            </div>
          </div>

          <div className="calendar-grid">
            {weekDays.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />
            ))}
            {[...Array(days)].map((_, i) => {
              const day = i + 1;
              const delivery = getDeliveryForDate(day);
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

              return (
                <div
                  key={day}
                  className={`calendar-day ${delivery ? 'calendar-day--has-delivery' : ''} ${isToday ? 'calendar-day--today' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <span className="calendar-day__number">{day}</span>
                  {delivery && (
                    <span className={`calendar-day__dot calendar-day__dot--${delivery.status}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="subscriptions-section">
          <h3 className="section-subtitle">当前订阅</h3>
          
          {loading ? (
            <div className="subscription-skeleton">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-card skeleton-card--horizontal">
                  <div className="skeleton-card__image skeleton-card__image--small" />
                  <div className="skeleton-card__lines">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                </div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📦</div>
              <p className="empty-state__text">暂无订阅，开始您的咖啡之旅吧！</p>
              <button className="btn btn--primary" onClick={() => setShowSubscribeModal(true)}>
                立即订阅
              </button>
            </div>
          ) : (
            <div className="subscription-list">
              {subscriptions.map((sub) => (
                <div key={sub.id} className={`subscription-card subscription-card--${sub.status}`}>
                  <div className="subscription-card__header">
                    <div className="subscription-card__bean-info">
                      <h4 className="subscription-card__name">{sub.bean?.name || '精选咖啡豆'}</h4>
                      <span className="subscription-card__origin">{sub.bean?.origin || ''}</span>
                    </div>
                    <span className={`subscription-status subscription-status--${sub.status}`}>
                      {sub.status === 'active' ? '进行中' : sub.status === 'paused' ? '已暂停' : '已取消'}
                    </span>
                  </div>
                  
                  <div className="subscription-card__details">
                    <div className="detail-item">
                      <span className="detail-item__label">配送频率</span>
                      <span className="detail-item__value">{sub.frequency}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-item__label">规格</span>
                      <span className="detail-item__value">{sub.weight}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-item__label">开始日期</span>
                      <span className="detail-item__value">{sub.start_date}</span>
                    </div>
                  </div>

                  <div className="subscription-card__actions">
                    {sub.status !== 'cancelled' && (
                      <>
                        <button
                          className="btn btn--secondary btn--small"
                          onClick={() => handlePauseSubscription(sub.id)}
                        >
                          {sub.status === 'active' ? '暂停' : '恢复'}
                        </button>
                        <button
                          className="btn btn--danger btn--small"
                          onClick={() => handleCancelSubscription(sub.id)}
                        >
                          取消订阅
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDelivery && (
        <div className="modal-overlay" onClick={() => setSelectedDelivery(null)}>
          <div className="modal modal--delivery" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">配送详情</h3>
              <button className="modal__close" onClick={() => setSelectedDelivery(null)}>
                ×
              </button>
            </div>
            <div className="modal__body">
              <div className="delivery-detail">
                <div className="delivery-detail__item">
                  <span className="delivery-detail__label">咖啡豆</span>
                  <span className="delivery-detail__value">{selectedDelivery.bean_name}</span>
                </div>
                <div className="delivery-detail__item">
                  <span className="delivery-detail__label">配送日期</span>
                  <span className="delivery-detail__value">{selectedDelivery.date}</span>
                </div>
                {selectedDelivery.roast_date && (
                  <div className="delivery-detail__item">
                    <span className="delivery-detail__label">烘焙日期</span>
                    <span className="delivery-detail__value">{selectedDelivery.roast_date}</span>
                  </div>
                )}
                {selectedDelivery.tracking_number && (
                  <div className="delivery-detail__item">
                    <span className="delivery-detail__label">物流单号</span>
                    <span className="delivery-detail__value">{selectedDelivery.tracking_number}</span>
                  </div>
                )}
                <div className="delivery-detail__item">
                  <span className="delivery-detail__label">状态</span>
                  <span className={`delivery-status delivery-status--${selectedDelivery.status}`}>
                    {selectedDelivery.status === 'delivered' ? '已送达' : 
                     selectedDelivery.status === 'in_transit' ? '配送中' : '待配送'}
                  </span>
                </div>
              </div>
              {selectedDelivery.status === 'delivered' && (
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => handleReviewDelivery(selectedDelivery)}
                >
                  ✍️ 评价此批次
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__body">
              <div className="confirm-icon">⚠️</div>
              <h3 className="confirm-title">确认取消订阅？</h3>
              <p className="confirm-desc">
                取消后，剩余配送将停止。您可以随时重新订阅。
              </p>
              <div className="confirm-actions">
                <button className="btn btn--secondary" onClick={() => setShowCancelModal(false)}>
                  再想想
                </button>
                <button className="btn btn--danger" onClick={confirmCancel}>
                  确认取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubscribeModal && (
        <div className="modal-overlay" onClick={() => setShowSubscribeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">新建订阅</h3>
              <button className="modal__close" onClick={() => setShowSubscribeModal(false)}>
                ×
              </button>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label">配送频率</label>
                <div className="form-options">
                  {['weekly', 'biweekly', 'monthly'].map((freq) => (
                    <button
                      key={freq}
                      className={`form-option ${newSubscription.frequency === freq ? 'form-option--active' : ''}`}
                      onClick={() => setNewSubscription((prev) => ({ ...prev, frequency: freq }))}
                    >
                      {freq === 'weekly' ? '每周' : freq === 'biweekly' ? '每两周' : '每月'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">规格</label>
                <div className="form-options">
                  {['200g', '500g', '1kg'].map((weight) => (
                    <button
                      key={weight}
                      className={`form-option ${newSubscription.weight === weight ? 'form-option--active' : ''}`}
                      onClick={() => setNewSubscription((prev) => ({ ...prev, weight }))}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">配送地址</label>
                <textarea
                  className="form-textarea"
                  placeholder="请输入详细地址"
                  value={newSubscription.address}
                  onChange={(e) => setNewSubscription((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <button className="btn btn--primary btn--full" onClick={() => setShowSubscribeModal(false)}>
                确认订阅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    user_id: 1,
    bean_id: 1,
    frequency: '每月',
    weight: '250g',
    address: '北京市朝阳区xxx街道xxx号',
    start_date: '2026-01-15',
    status: 'active',
    bean: {
      id: 1,
      name: '耶加雪菲 沃卡',
      origin: '埃塞俄比亚',
      process: '水洗',
      flavor_tags: ['花香', '柑橘', '果酸'],
      avg_rating: 4.7,
      price: 128,
      image: '',
      description: '',
      roast_level: '浅烘',
    },
    deliveries: [
      { id: 1, date: '2026-06-15', status: 'pending', bean_name: '耶加雪菲 沃卡', roast_date: '2026-06-10', tracking_number: 'SF1234567890', bean_id: 1 },
      { id: 2, date: '2026-05-15', status: 'delivered', bean_name: '耶加雪菲 沃卡', roast_date: '2026-05-10', tracking_number: 'SF0987654321', bean_id: 1 },
      { id: 3, date: '2026-04-15', status: 'delivered', bean_name: '耶加雪菲 沃卡', roast_date: '2026-04-10', tracking_number: 'SF1122334455', bean_id: 1 },
    ],
  },
  {
    id: 2,
    user_id: 1,
    bean_id: 3,
    frequency: '每两周',
    weight: '500g',
    address: '北京市朝阳区xxx街道xxx号',
    start_date: '2026-02-01',
    status: 'paused',
    bean: {
      id: 3,
      name: '慧兰 粉波旁',
      origin: '哥伦比亚',
      process: '水洗',
      flavor_tags: ['巧克力', '坚果', '焦糖'],
      avg_rating: 4.5,
      price: 98,
      image: '',
      description: '',
      roast_level: '中烘',
    },
    deliveries: [
      { id: 4, date: '2026-06-10', status: 'delivered', bean_name: '慧兰 粉波旁', roast_date: '2026-06-05', tracking_number: 'YT6677889900', bean_id: 3 },
      { id: 5, date: '2026-06-24', status: 'in_transit', bean_name: '慧兰 粉波旁', roast_date: '2026-06-20', tracking_number: 'YT1122334455', bean_id: 3 },
    ],
  },
];

export default Subscribe;
