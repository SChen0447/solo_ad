import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Heart, User, MessageCircle } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';
import StarRating from '../components/StarRating';
import type { Item } from '../backend/types';

interface DetailPageProps {
  userId: string;
  userName: string;
}

const DetailPage: React.FC<DetailPageProps> = ({ userId, userName }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [exchangeMessage, setExchangeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      try {
        const response = await fetch(`/api/items/${id}`);
        if (response.ok) {
          const data: Item = await response.json();
          setItem(data);
          setIsLiked(data.likedBy.includes(userId));
          setLikes(data.likes);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('获取物品详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, userId, navigate]);

  const handleLike = async () => {
    if (!item) return;
    try {
      const response = await fetch(`/api/items/${item.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      setIsLiked(data.liked);
      setLikes(data.likes);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleExchange = () => {
    if (item?.userId === userId) {
      alert('不能拾取自己发布的物品哦~');
      return;
    }
    setShowModal(true);
  };

  const handleConfirmExchange = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/items/${item.id}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName,
          message: exchangeMessage || '想要交换你的物品',
        }),
      });
      if (response.ok) {
        alert('交换请求已发送！发布者会收到通知~');
        setShowModal(false);
        setExchangeMessage('');
      }
    } catch (error) {
      console.error('发送交换请求失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!item || userRating === 0) return;
    try {
      await fetch(`/api/items/${item.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName,
          content: `给物品打了 ${userRating} 星`,
        }),
      });
      alert(`感谢您的 ${userRating} 星评价！`);
    } catch (error) {
      console.error('提交评分失败:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return '等待中';
      case 'sent':
        return '已送出';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  };

  const getExchangeTypeText = (type: string) => {
    switch (type) {
      case 'exchange':
        return '可交换';
      case 'gift':
        return '可赠送';
      case 'sell':
        return '可出售';
      default:
        return type;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" style={{ borderTopColor: '#f97316' }} />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <p>物品不存在或已被删除</p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/')}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container detail-container">
      <ImageCarousel images={item.images} autoPlay />

      <div className="detail-content">
        <h1 className="detail-title">{item.name}</h1>

        <div className="detail-meta">
          <div className="detail-meta-item">
            <User size={18} />
            <span>{item.userName}</span>
          </div>
          <div className="detail-meta-item">
            <Eye size={18} />
            <span>{item.views} 次浏览</span>
          </div>
          <div className="detail-meta-item">
            <Heart size={18} />
            <span>{likes} 个赞</span>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">物品状态</div>
          <span className={`status-badge status-${item.status}`}>
            {getStatusText(item.status)}
          </span>
          <span
            className="status-badge"
            style={{
              marginLeft: '8px',
              backgroundColor:
                item.exchangeType === 'exchange'
                  ? '#d1fae5'
                  : item.exchangeType === 'gift'
                  ? '#dbeafe'
                  : '#f3e8ff',
              color:
                item.exchangeType === 'exchange'
                  ? '#065f46'
                  : item.exchangeType === 'gift'
                  ? '#1e40af'
                  : '#6b21a8',
            }}
          >
            {getExchangeTypeText(item.exchangeType)}
          </span>
        </div>

        <div className="detail-section">
          <div className="detail-label">新旧程度</div>
          <StarRating rating={item.condition} readonly size={28} />
        </div>

        <div className="detail-section">
          <div className="detail-label">物品描述</div>
          <p className="detail-description">{item.description}</p>
        </div>

        {item.expectCondition && (
          <div className="detail-section">
            <div className="detail-label">期望交换条件</div>
            <p className="detail-description">{item.expectCondition}</p>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-label">发布时间</div>
          <p className="detail-description">{formatDate(item.createdAt)}</p>
        </div>

        <div className="detail-section">
          <div className="detail-label">给物品评分</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StarRating
              rating={userRating}
              onChange={setUserRating}
              size={28}
            />
            {userRating > 0 && (
              <button className="btn-primary" onClick={handleRatingSubmit}>
                <MessageCircle size={18} />
                提交评分
              </button>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <button
            className={`btn-primary ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            style={{
              background: isLiked
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f97316, #ea580c)',
            }}
          >
            <Heart size={20} fill={isLiked ? 'white' : 'none'} />
            {isLiked ? '已点赞' : '点赞收藏'}
          </button>
          <button
            className="btn-primary"
            onClick={handleExchange}
            disabled={item.status !== 'waiting' || item.userId === userId}
          >
            🍾 拾取漂流瓶
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <img src={item.images[0]} alt={item.name} />
              <h3>确认拾取「{item.name}」</h3>
            </div>
            <div className="form-group">
              <label className="form-label">留言给发布者（可选）</label>
              <textarea
                className="form-textarea"
                placeholder="说点什么，介绍一下你的交换意向..."
                value={exchangeMessage}
                onChange={(e) => setExchangeMessage(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                style={{
                  background: 'white',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                }}
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmExchange}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    发送中...
                  </>
                ) : (
                  '确认发送'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPage;
