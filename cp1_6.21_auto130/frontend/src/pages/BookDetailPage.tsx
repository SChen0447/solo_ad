import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, User, BookOpen } from 'lucide-react';
import type { Book, Review } from '../types';
import { booksApi, loansApi } from '../api';
import './BookDetailPage.css';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [isBorrowed, setIsBorrowed] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchBook = async () => {
      try {
        setLoading(true);
        const response = await booksApi.getBook(id);
        setBook(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await booksApi.getReviews(id);
        setReviews(response.data);
      } catch (err) {
        console.error('加载评论失败:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    const checkLoanStatus = async () => {
      try {
        const response = await loansApi.checkLoanStatus(id);
        setIsBorrowed(!!response.data);
      } catch (err) {
        console.error('检查借阅状态失败:', err);
      }
    };

    fetchBook();
    fetchReviews();
    checkLoanStatus();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !comment.trim()) return;

    try {
      setSubmitting(true);
      const response = await booksApi.rateBook(id, rating, comment.trim(), '张小明');
      setBook(response.data.book);
      setReviews([response.data.review, ...reviews]);
      setComment('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBorrow = async () => {
    if (!id || borrowLoading) return;

    try {
      setBorrowLoading(true);
      await loansApi.borrowBook(id);
      setIsBorrowed(true);
      alert('借阅成功！');
    } catch (err) {
      alert(err instanceof Error ? err.message : '借阅失败');
    } finally {
      setBorrowLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className={`star-rating ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${star <= rating ? 'filled' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
          >
            <Star size={interactive ? 28 : 16} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="error-message">
        <p>{error || '图书不存在'}</p>
      </div>
    );
  }

  return (
    <div className="book-detail-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>返回</span>
      </button>

      <div className="book-detail-header">
        <div 
          className="book-detail-cover"
          style={{ background: book.cover_gradient }}
        >
          <span className="book-cover-letter">{book.title.charAt(0)}</span>
        </div>

        <div className="book-detail-info">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">作者：{book.author}</p>
          
          <div className="book-meta">
            <div className="meta-item">
              <BookOpen size={16} />
              <span>{book.review_count} 条评价</span>
            </div>
            <div className="meta-item">
              <Star size={16} fill="#fbbf24" />
              <span>{book.avg_rating.toFixed(1)} 分</span>
            </div>
          </div>

          <p className="book-description">{book.description}</p>

          <div className="book-actions">
            {!isBorrowed ? (
              <button 
                className="borrow-button"
                onClick={handleBorrow}
                disabled={borrowLoading}
              >
                {borrowLoading ? (
                  <>
                    <div className="small-spinner" />
                    <span>借阅中...</span>
                  </>
                ) : (
                  '立即借阅'
                )}
              </button>
            ) : (
              <div className="borrowed-badge">
                <BookOpen size={18} />
                <span>已借阅</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="book-detail-section">
        <h2 className="section-title">发表评论</h2>
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="rating-selector">
            <label>您的评分：</label>
            {renderStars(rating, true, setRating)}
            <span className="rating-label">{rating} 星</span>
          </div>
          
          <textarea
            className="review-textarea"
            placeholder="写下你的阅读感受..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
          />
          
          <div className="form-footer">
            <span className="char-count">{comment.length}/500</span>
            <button 
              type="submit" 
              className="submit-button"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? (
                <>
                  <div className="small-spinner" />
                  <span>提交中...</span>
                </>
              ) : (
                '提交评论'
              )}
            </button>
          </div>

          {submitSuccess && (
            <div className="success-message">评论提交成功！</div>
          )}
        </form>
      </div>

      <div className="book-detail-section">
        <h2 className="section-title">
          读者评论 <span className="section-count">({reviews.length})</span>
        </h2>

        {reviewsLoading ? (
          <div className="loading-container small">
            <div className="spinner" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <p>暂无评论，来做第一个评论的人吧！</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div 
                  className="review-avatar"
                  style={{ background: getAvatarColor(review.user_name) }}
                >
                  {review.user_name.charAt(0)}
                </div>
                <div className="review-content">
                  <div className="review-header">
                    <span className="review-user">{review.user_name}</span>
                    <div className="review-rating">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="review-text">{review.comment}</p>
                  <span className="review-date">
                    {new Date(review.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
