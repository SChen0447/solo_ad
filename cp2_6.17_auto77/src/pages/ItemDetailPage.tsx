import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import ExchangeModal from '../components/ExchangeModal';

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  desiredTags: string[];
  ownerId: string;
  ownerNickname: string;
  ownerCreditScore: number;
  createdAt: string;
}

interface CreditRecord {
  id: string;
  userId: string;
  partnerNickname: string;
  itemName: string;
  exchangeTime: string;
  scoreChange: number;
}

const getCreditColor = (score: number): string => {
  if (score < 50) return '#d32f2f';
  if (score < 80) return '#f9a825';
  return '#388e3c';
};

const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditRecord[]>([]);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeRequest, setExchangeRequest] = useState<any>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/items/${id}`);
        const result = await res.json();
        if (result.success) {
          setItem(result.data);
        }
      } catch (err) {
        console.error('获取物品详情失败', err);
      }
    };

    if (id) {
      fetchItem();
    }
  }, [id]);

  const handleCreditClick = async () => {
    if (!item) return;

    if (!showCreditHistory) {
      try {
        const res = await fetch(`/api/users/${item.ownerId}/creditHistory`);
        const result = await res.json();
        if (result.success) {
          setCreditHistory(result.data);
        }
      } catch (err) {
        console.error('获取信用历史失败', err);
      }
    }
    setShowCreditHistory(!showCreditHistory);
  };

  const handleInitiateExchange = async () => {
    if (!item) return;

    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromItemId: 'item1',
          toItemId: item.id,
          fromUserId: 'user1',
          toUserId: item.ownerId,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setExchangeRequest({
          id: result.data.id,
          fromItem: {
            id: 'item1',
            title: 'iPhone 12 Pro 手机',
            imageUrl: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400',
          },
          toItem: {
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
          },
          fromUser: {
            id: 'user1',
            nickname: '小明',
            creditScore: 92,
          },
          toUser: {
            id: item.ownerId,
            nickname: item.ownerNickname,
            creditScore: item.ownerCreditScore,
          },
        });
        setShowExchangeModal(true);
      }
    } catch (err) {
      console.error('创建交换请求失败', err);
    }
  };

  const handleConfirmExchange = async (exchangeId: string) => {
    try {
      const res = await fetch(`/api/exchanges/${exchangeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });

      const result = await res.json();
      if (result.success) {
        setShowExchangeModal(false);
        if (item) {
          setItem({
            ...item,
            ownerCreditScore: Math.min(100, item.ownerCreditScore + 5),
          });
        }
        alert('交换成功！双方信用分各+5');
      }
    } catch (err) {
      console.error('确认交换失败', err);
    }
  };

  if (!item) {
    return <div className="app-container">加载中...</div>;
  }

  const circumference = 2 * Math.PI * 22;
  const progress = (item.ownerCreditScore / 100) * circumference;
  const creditColor = getCreditColor(item.ownerCreditScore);

  return (
    <div className="item-detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        返回
      </button>

      <div className="item-detail-container">
        <div className="item-detail-image">
          {imageError || !item.imageUrl ? (
            <div className="item-card-image-placeholder" style={{ height: '100%' }}>
              <Package size={64} />
            </div>
          ) : (
            <img
              src={item.imageUrl}
              alt={item.title}
              onError={() => setImageError(true)}
            />
          )}
        </div>

        <div className="item-detail-info">
          <h1 className="item-detail-title">{item.title}</h1>
          <p className="item-detail-description">{item.description}</p>

          <div className="desired-tags-section">
            <div className="section-label">期望交换</div>
            <div className="desired-tags">
              {item.desiredTags.map((tag, index) => (
                <span key={index} className="desired-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="owner-section">
            <div className="owner-info">
              <div className="owner-avatar">
                {item.ownerNickname.charAt(0)}
              </div>
              <div className="owner-details">
                <div className="owner-nickname">{item.ownerNickname}</div>
                <div
                  className="credit-progress-container"
                  onClick={handleCreditClick}
                  title="点击查看信用历史"
                >
                  <svg className="credit-progress-svg" viewBox="0 0 56 56">
                    <circle className="credit-progress-bg" cx="28" cy="28" r="22" />
                    <circle
                      className="credit-progress-bar"
                      cx="28"
                      cy="28"
                      r="22"
                      stroke={creditColor}
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                    />
                  </svg>
                  <span className="credit-progress-text" style={{ color: creditColor }}>
                    {item.ownerCreditScore}
                  </span>
                </div>
              </div>
            </div>

            {showCreditHistory && (
              <div className="credit-history-panel">
                <div className="credit-history-title">最近交换记录</div>
                {creditHistory.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#888' }}>暂无交换记录</div>
                ) : (
                  <div className="credit-history-list">
                    {creditHistory.map((record, index) => (
                      <div key={record.id} className="credit-history-item">
                        <div className="credit-history-row">
                          <span className="credit-history-partner">与 {record.partnerNickname} 交换</span>
                          <span className={`credit-score-change ${record.scoreChange >= 0 ? 'positive' : 'negative'}`}>
                            {record.scoreChange >= 0 ? '+' : ''}{record.scoreChange}
                          </span>
                        </div>
                        <div className="credit-history-itemname">物品：{record.itemName}</div>
                        <div className="credit-history-time">
                          {new Date(record.exchangeTime).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-primary" onClick={handleInitiateExchange}>
              发起交换
            </button>
          </div>
        </div>
      </div>

      {showExchangeModal && exchangeRequest && (
        <ExchangeModal
          exchangeRequest={exchangeRequest}
          onClose={() => setShowExchangeModal(false)}
          onConfirm={handleConfirmExchange}
        />
      )}
    </div>
  );
};

export default ItemDetailPage;
