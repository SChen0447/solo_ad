import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../modules/product/ProductService';
import { ReviewService } from '../modules/review/ReviewService';
import { Order, Review } from '../types';
import { StarRating } from '../components/StarRating';

type TabType = 'buyer' | 'seller';

const orderStatusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待发货', color: '#f39c12' },
  shipped: { text: '待收货', color: '#3498db' },
  completed: { text: '已完成', color: '#27ae60' },
  cancelled: { text: '已取消', color: '#e74c3c' }
};

export const Orders = () => {
  const [activeTab, setActiveTab] = useState<TabType>('buyer');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userReviews, setUserReviews] = useState<Map<string, Review>>(new Map());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await ProductService.getMyOrders(activeTab);
      setOrders(ordersData);

      const reviewsMap = new Map<string, Review>();
      for (const order of ordersData) {
        if (order.status === 'completed') {
          try {
            if (activeTab === 'seller') {
              const reviews = await ReviewService.getUserReviews(order.sellerId);
              const review = reviews.find(r => r.orderId === order.id && r.type === 'buyer');
              if (review) {
                reviewsMap.set(order.id, review);
              }
            } else {
              const reviews = await ReviewService.getProductReviews(order.productId);
              const review = reviews.find(r => r.orderId === order.id);
              if (review) {
                reviewsMap.set(order.id, review);
              }
            }
          } catch {
            // ignore
          }
        }
      }
      setUserReviews(reviewsMap);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleShip = async (orderId: string) => {
    if (!deliveryInfo.trim()) {
      toast.error('请输入发货信息');
      return;
    }

    setShippingOrderId(orderId);
    try {
      await ProductService.shipOrder(orderId, deliveryInfo.trim());
      toast.success('发货成功！');
      setDeliveryInfo('');
      setShippingOrderId(null);
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发货失败');
      setShippingOrderId(null);
    }
  };

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      await ProductService.confirmOrder(orderId);
      toast.success('确认收货成功！');
      setConfirmingId(null);
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
      setConfirmingId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewingOrder) return;

    setSubmittingReview(true);
    try {
      const reviewType = activeTab === 'seller' ? 'buyer' : 'product';
      const targetId = activeTab === 'seller' ? reviewingOrder.buyerId! : reviewingOrder.sellerId;

      await ReviewService.createReview({
        orderId: reviewingOrder.id,
        productId: reviewingOrder.productId,
        targetId,
        rating: reviewRating,
        comment: reviewComment,
        type: reviewType as 'product' | 'buyer' | 'seller'
      });

      toast.success('评价提交成功！');
      setReviewingOrder(null);
      setReviewRating(5);
      setReviewComment('');
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '评价失败');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredOrders = orders.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      <Helmet>
        <title>订单管理 - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="orders-page">
        <div className="page-header">
          <h1>订单管理</h1>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveTab('buyer')}
          >
            🛒 我购买的
          </button>
          <button
            className={`tab-btn ${activeTab === 'seller' ? 'active' : ''}`}
            onClick={() => setActiveTab('seller')}
          >
            📦 我卖出的
          </button>
        </div>

        {loading ? (
          <div className="loading-screen">加载中...</div>
        ) : (
          <>
            {filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>暂无订单</h3>
                <p>
                  {activeTab === 'buyer'
                    ? '去逛逛发现心仪的商品吧'
                    : '发布商品开始您的销售之旅'}
                </p>
                <Link to="/" className="btn btn-primary">
                  {activeTab === 'buyer' ? '去购物' : '发布商品'}
                </Link>
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <span className="order-id">订单号: {order.id.slice(0, 8)}...</span>
                        <span className="order-date">
                          {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className="order-status"
                        style={{ backgroundColor: orderStatusLabels[order.status].color }}
                      >
                        {orderStatusLabels[order.status].text}
                      </span>
                    </div>

                    <div className="order-content">
                      <Link to={`/product/${order.productId}`} className="order-product">
                        <span className="order-product-icon">
                          {order.product?.title.includes('电子书') ? '📚' :
                           order.product?.title.includes('课程') ? '🎓' :
                           order.product?.title.includes('软件') ? '💻' : '📦'}
                        </span>
                        <div className="order-product-info">
                          <h4>{order.product?.title}</h4>
                          <p>数量: {order.quantity}</p>
                        </div>
                        <span className="order-price">¥{order.price}</span>
                      </Link>

                      <div className="order-parties">
                        {activeTab === 'buyer' && order.seller && (
                          <div className="party-info">
                            <span className="party-label">卖家:</span>
                            <img src={order.seller.avatar} alt="" className="party-avatar" />
                            <span>{order.seller.username}</span>
                          </div>
                        )}
                        {activeTab === 'seller' && order.buyer && (
                          <div className="party-info">
                            <span className="party-label">买家:</span>
                            <img src={order.buyer.avatar} alt="" className="party-avatar" />
                            <span>{order.buyer.username}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.deliveryInfo && (
                      <div className="delivery-info-section">
                        <h5>📨 发货信息</h5>
                        <p>{order.deliveryInfo}</p>
                      </div>
                    )}

                    {userReviews.get(order.id) && (
                      <div className="review-section">
                        <h5>⭐ 评价</h5>
                        <div className="review-content">
                          <StarRating rating={userReviews.get(order.id)!.rating} size="small" />
                          {userReviews.get(order.id)!.comment && (
                            <p>{userReviews.get(order.id)!.comment}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="order-actions">
                      {activeTab === 'seller' && order.status === 'pending' && (
                        <div className="ship-form">
                          <textarea
                            placeholder="请输入发货信息（如激活码、下载链接等）..."
                            value={shippingOrderId === order.id ? deliveryInfo : ''}
                            onChange={(e) => setDeliveryInfo(e.target.value)}
                            rows={2}
                            disabled={shippingOrderId === order.id}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => handleShip(order.id)}
                            disabled={shippingOrderId === order.id}
                          >
                            {shippingOrderId === order.id ? '处理中...' : '确认发货'}
                          </button>
                        </div>
                      )}

                      {activeTab === 'buyer' && order.status === 'shipped' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleConfirm(order.id)}
                          disabled={confirmingId === order.id}
                        >
                          {confirmingId === order.id ? '确认中...' : '确认收货'}
                        </button>
                      )}

                      {order.status === 'completed' && !userReviews.get(order.id) && (
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setReviewingOrder(order);
                            setReviewRating(5);
                            setReviewComment('');
                          }}
                        >
                          {activeTab === 'seller' ? '评价买家' : '评价商品'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {reviewingOrder && (
          <div className="modal-overlay" onClick={() => setReviewingOrder(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{activeTab === 'seller' ? '评价买家' : '评价商品'}</h2>
              <form onSubmit={handleSubmitReview}>
                <div className="form-group">
                  <label>评分</label>
                  <StarRating
                    rating={reviewRating}
                    onRatingChange={setReviewRating}
                    interactive
                    size="large"
                  />
                </div>
                <div className="form-group">
                  <label>评价内容（最多50字）</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="分享您的交易体验..."
                    rows={3}
                    maxLength={50}
                  />
                  <div className="char-count">{reviewComment.length}/50</div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setReviewingOrder(null)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingReview}
                  >
                    {submittingReview ? '提交中...' : '提交评价'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
