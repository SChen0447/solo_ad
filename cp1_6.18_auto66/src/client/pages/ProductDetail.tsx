import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../modules/product/ProductService';
import { ReviewService } from '../modules/review/ReviewService';
import { useAuth } from '../hooks/useAuth';
import { Product, Review, Order } from '../types';
import { StarRating } from '../components/StarRating';

const categoryLabels: Record<string, string> = {
  ebook: '电子书',
  course: '课程码',
  software: '软件激活码',
  other: '其他'
};

const orderStatusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待卖家发货', color: '#f39c12' },
  shipped: { text: '待确认收货', color: '#3498db' },
  completed: { text: '已完成', color: '#27ae60' },
  cancelled: { text: '已取消', color: '#e74c3c' }
};

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [userOrder, setUserOrder] = useState<Order | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const productData = await ProductService.getProductById(id);
      setProduct(productData);

      const reviewsData = await ReviewService.getProductReviews(id);
      setReviews(reviewsData);

      if (isAuthenticated && user) {
        const orders = await ProductService.getMyOrders('buyer');
        const order = orders.find(o => o.productId === id && o.status !== 'cancelled');
        setUserOrder(order || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuy = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }

    if (!product) return;

    if (product.sellerId === user?.id) {
      toast.error('不能购买自己的商品');
      return;
    }

    setBuying(true);
    try {
      const order = await ProductService.buyProduct(product.id, quantity);
      toast.success('购买成功！请等待卖家发货');
      setUserOrder(order);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '购买失败');
    } finally {
      setBuying(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!userOrder) return;

    setConfirmingReceipt(true);
    try {
      await ProductService.confirmOrder(userOrder.id);
      toast.success('确认收货成功！');
      setShowReviewForm(true);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userOrder || !product) return;

    setSubmittingReview(true);
    try {
      await ReviewService.createReview({
        orderId: userOrder.id,
        productId: product.id,
        targetId: product.sellerId,
        rating: reviewRating,
        comment: reviewComment,
        type: 'product'
      });

      toast.success('评价提交成功！');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '评价失败');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getMemberDays = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="loading-screen">加载中...</div>
    );
  }

  if (!product) {
    return (
      <div className="error-page">
        <h1>商品不存在</h1>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{product.title} - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="product-detail-page">
        <div className="product-detail-container">
          <div className="product-detail-grid">
            <div className="product-info-section">
              <div className="product-gallery">
                <span className="product-main-icon">
                  {product.category === 'ebook' ? '📚' :
                   product.category === 'course' ? '🎓' :
                   product.category === 'software' ? '💻' : '📦'}
                </span>
                <div className="product-badges">
                  <span className="badge category-badge">{categoryLabels[product.category]}</span>
                  {product.negotiable && <span className="badge negotiable-badge">可议价</span>}
                </div>
              </div>

              <div className="product-info">
                <h1 className="product-title">{product.title}</h1>
                <div className="product-meta">
                  {product.productRating && (
                    <div className="product-rating">
                      <StarRating rating={parseFloat(product.productRating)} size="small" />
                      <span>{product.productRating} ({product.reviewCount}条评价)</span>
                    </div>
                  )}
                  <span className="product-stock">库存: {product.stock}件</span>
                </div>
                <div className="product-price-large">¥{product.price}</div>
                <div className="product-description">
                  <h3>商品描述</h3>
                  <p>{product.description}</p>
                </div>
              </div>
            </div>

            <div className="seller-info-section">
              <div className="seller-card">
                <h3>卖家信息</h3>
                <div className="seller-profile">
                  <img src={product.seller?.avatar} alt="" className="seller-avatar" />
                  <div className="seller-details">
                    <h4>{product.seller?.username}</h4>
                    <div className="seller-stats">
                      <div className="stat-item">
                        <span className="stat-label">注册时长</span>
                        <span className="stat-value">{getMemberDays(product.seller?.createdAt || '')}天</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">信用评分</span>
                        <span className="stat-value">⭐ {product.seller?.creditScore}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">评价数</span>
                        <span className="stat-value">{product.seller?.reviewCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="purchase-section">
                  {product.sellerId !== user?.id && product.status === 'active' && product.stock > 0 && (
                    <>
                      {!userOrder && (
                        <>
                          <div className="quantity-selector">
                            <label>购买数量</label>
                            <div className="quantity-controls">
                              <button
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                              >
                                -
                              </button>
                              <span>{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                disabled={quantity >= product.stock}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            className="btn btn-primary btn-block btn-large"
                            onClick={handleBuy}
                            disabled={buying}
                          >
                            {buying ? '购买中...' : `立即购买 ¥${(product.price * quantity).toFixed(2)}`}
                          </button>
                        </>
                      )}

                      {userOrder && (
                        <div className="order-status-card">
                          <div
                            className="order-status-badge"
                            style={{ backgroundColor: orderStatusLabels[userOrder.status].color }}
                          >
                            {orderStatusLabels[userOrder.status].text}
                          </div>

                          {userOrder.status === 'shipped' && !showReviewForm && (
                            <button
                              className="btn btn-primary btn-block"
                              onClick={handleConfirmReceipt}
                              disabled={confirmingReceipt}
                            >
                              {confirmingReceipt ? '确认中...' : '确认收货'}
                            </button>
                          )}

                          {userOrder.status === 'completed' && !showReviewForm && !reviews.some(r => r.reviewerId === user?.id) && (
                            <button
                              className="btn btn-primary btn-block"
                              onClick={() => setShowReviewForm(true)}
                            >
                              评价商品
                            </button>
                          )}

                          {userOrder.deliveryInfo && (
                            <div className="delivery-info">
                              <h5>发货信息</h5>
                              <p>{userOrder.deliveryInfo}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {product.sellerId === user?.id && (
                    <div className="seller-actions">
                      <p className="text-muted">这是您发布的商品</p>
                      <button
                        className="btn btn-outline btn-block"
                        onClick={() => navigate('/my-listings')}
                      >
                        管理我的商品
                      </button>
                    </div>
                  )}

                  {product.status !== 'active' && product.sellerId !== user?.id && (
                    <div className="product-unavailable">
                      <p>该商品已下架或售罄</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showReviewForm && (
            <div className="review-form-section">
              <h3>评价商品</h3>
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
                    placeholder="分享您的购买体验..."
                    rows={3}
                    maxLength={50}
                  />
                  <div className="char-count">{reviewComment.length}/50</div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowReviewForm(false)}
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
          )}

          <div className="reviews-section">
            <h3>商品评价 ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <div className="empty-reviews">
                <p>暂无评价</p>
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <img src={review.reviewer?.avatar} alt="" className="reviewer-avatar" />
                      <div className="reviewer-info">
                        <span className="reviewer-name">{review.reviewer?.username}</span>
                        <StarRating rating={review.rating} size="small" />
                      </div>
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="review-comment">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
