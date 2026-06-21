import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import EvaluationForm from './EvaluationForm';
import { useApp } from '../App';
import './InstrumentDetail.css';

interface Evaluation {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface Instrument {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: '全新' | '9成新' | '8成新';
  price: number;
  images: string[];
  description: string;
  createdAt: string;
  evaluations: Evaluation[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function InstrumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification, isFavorite, toggleFavorite } = useApp();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageKey, setImageKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchInstrument();
    }
  }, [id]);

  const fetchInstrument = async () => {
    try {
      const res = await fetch(`/api/instruments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInstrument(data);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch instrument:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgRating = instrument && instrument.evaluations.length > 0
    ? Math.round(
        (instrument.evaluations.reduce((sum, e) => sum + e.rating, 0) /
          instrument.evaluations.length) *
          10
      ) / 10
    : 0;

  const switchImage = (index: number) => {
    if (!instrument || index < 0 || index >= instrument.images.length) return;
    setCurrentImageIndex(index);
    setImageKey((prev) => prev + 1);
  };

  const handlePrevImage = () => {
    if (!instrument) return;
    const prevIndex = currentImageIndex === 0 ? instrument.images.length - 1 : currentImageIndex - 1;
    switchImage(prevIndex);
  };

  const handleNextImage = () => {
    if (!instrument) return;
    const nextIndex = currentImageIndex === instrument.images.length - 1 ? 0 : currentImageIndex + 1;
    switchImage(nextIndex);
  };

  const handleEvaluationSubmit = (newEvaluation: Evaluation) => {
    if (!instrument) return;
    const updatedEvaluations = [newEvaluation, ...instrument.evaluations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setInstrument({
      ...instrument,
      evaluations: updatedEvaluations,
    });
    showNotification('success', '评价提交成功！感谢您的反馈。');
  };

  if (loading) {
    return <div className="detail-loading">加载中...</div>;
  }

  if (!instrument) {
    return <div className="detail-loading">乐器不存在</div>;
  }

  const ratingPercentage = (avgRating / 5) * 100;

  return (
    <div className="instrument-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回列表
      </button>

      <div className="detail-content">
        <div className="image-carousel">
          <div className="carousel-container">
            <img
              key={imageKey}
              src={instrument.images[currentImageIndex]}
              alt={`${instrument.name} - 图${currentImageIndex + 1}`}
              className="carousel-image"
            />
            {instrument.images.length > 1 && (
              <>
                <button
                  className="carousel-btn prev"
                  onClick={handlePrevImage}
                  aria-label="上一张"
                >
                  ‹
                </button>
                <button
                  className="carousel-btn next"
                  onClick={handleNextImage}
                  aria-label="下一张"
                >
                  ›
                </button>
              </>
            )}
            {instrument.images.length > 1 && (
              <div className="carousel-dots">
                {instrument.images.map((_, index) => (
                  <button
                    key={index}
                    className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => switchImage(index)}
                    aria-label={`切换到第${index + 1}张图`}
                  />
                ))}
              </div>
            )}
          </div>
          {instrument.images.length > 1 && (
            <div className="thumbnail-list">
              {instrument.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${instrument.name} 缩略图${index + 1}`}
                  className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => switchImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-title-row">
            <h1 className="detail-title">{instrument.name}</h1>
            <button
              className={`detail-fav-btn ${isFavorite(instrument.id) ? 'favorited' : ''}`}
              onClick={() => toggleFavorite(instrument.id)}
              aria-label={isFavorite(instrument.id) ? '取消收藏' : '收藏'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite(instrument.id) ? '#EF4444' : '#D1D5FA'}>
                {isFavorite(instrument.id) ? (
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                ) : (
                  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C5.14 14.24 2 11.39 2 8.5 2 6.5 3.5 5 5.5 5c1.54 0 3.04.99 3.57 2.36h1.87C11.46 5.99 12.96 5 14.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                )}
              </svg>
              <span>{isFavorite(instrument.id) ? '已收藏' : '收藏'}</span>
            </button>
          </div>
          <p className="detail-brand">{instrument.brand} · {instrument.category}</p>
          <p className="detail-price">¥{instrument.price.toLocaleString()}</p>

          <div className="rating-section">
            <div className="rating-score">
              <span className="score-number">{avgRating || '-'}</span>
              <span className="score-label">综合评分</span>
            </div>
            <div className="rating-bar-container">
              <div
                className="rating-bar-fill"
                style={{ width: `${ratingPercentage}%` }}
              />
            </div>
            <div className="rating-count">
              <StarRating rating={avgRating} size={16} />
              <span>共 {instrument.evaluations.length} 条评价</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">成色</span>
              <span className="info-value condition-badge">{instrument.condition}</span>
            </div>
            <div className="info-item">
              <span className="info-label">类别</span>
              <span className="info-value">{instrument.category}</span>
            </div>
            <div className="info-item">
              <span className="info-label">品牌</span>
              <span className="info-value">{instrument.brand}</span>
            </div>
            <div className="info-item">
              <span className="info-label">上架时间</span>
              <span className="info-value">{formatDate(instrument.createdAt)}</span>
            </div>
          </div>

          <div className="description-section">
            <h3 className="section-title">商品描述</h3>
            <p className="description-text">{instrument.description}</p>
          </div>
        </div>
      </div>

      <div className="evaluations-section">
        <h3 className="section-title">用户评价</h3>
        <EvaluationForm
          instrumentId={instrument.id}
          onSubmit={handleEvaluationSubmit}
        />

        <div className="evaluations-list">
          {instrument.evaluations.length === 0 ? (
            <p className="no-evaluations">暂无评价，快来发布第一条评价吧！</p>
          ) : (
            instrument.evaluations.map((evaluation) => (
              <div key={evaluation.id} className="evaluation-item">
                <div className="evaluation-header">
                  <StarRating rating={evaluation.rating} size={18} />
                  <span className="evaluation-date">
                    {formatDate(evaluation.createdAt)}
                  </span>
                </div>
                <p className="evaluation-content">{evaluation.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default InstrumentDetail;
