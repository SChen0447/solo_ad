import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Drink {
  id: number;
  name: string;
  price: number;
  category: string;
  image_color: string;
}

interface Recommendation {
  drinkIds: number[];
  drinkNames: string[];
  confidence: number;
  support: number;
  reason: string;
}

interface RecommendationPageProps {
  customerId: string;
}

function Recommendation({ customerId }: RecommendationPageProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculationTime, setCalculationTime] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drinksRes, recRes] = await Promise.all([
        fetch('/api/drinks'),
        fetch(`/api/recommendations/${customerId}`),
      ]);

      if (drinksRes.ok) {
        const drinksData = await drinksRes.json();
        setDrinks(drinksData);
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations);
        setCalculationTime(recData.calculationTime);
      }
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDrinkById = (id: number) => {
    return drinks.find((d) => d.id === id);
  };

  const handleRecommendationClick = () => {
    navigate('/menu');
  };

  if (loading) {
    return (
      <div className="recommendation-loading">
        <div className="loading-spinner"></div>
        <p>正在为您生成专属推荐...</p>
        <style>{`
          .recommendation-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid #F5DEB3;
            border-top-color: #8B4513;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .recommendation-loading p {
            color: #8B4513;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="recommendation-page">
      <div className="page-header">
        <h2>为你推荐</h2>
        <p>基于您的口味偏好，智能推荐最佳搭配</p>
      </div>

      <div className="recommendation-scroll">
        {recommendations.map((rec, index) => {
          const drink1 = getDrinkById(rec.drinkIds[0]);
          const drink2 = getDrinkById(rec.drinkIds[1]);

          return (
            <div
              key={index}
              className="rec-card"
              onClick={handleRecommendationClick}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="rec-badge">TOP {index + 1}</div>
              <div className="rec-drinks">
                <div
                  className="rec-drink-img"
                  style={{
                    background: drink1?.image_color || '#8B4513',
                  }}
                >
                  <span className="rec-emoji">☕</span>
                </div>
                <div className="rec-plus">+</div>
                <div
                  className="rec-drink-img"
                  style={{
                    background: drink2?.image_color || '#F5DEB3',
                  }}
                >
                  <span className="rec-emoji">🥐</span>
                </div>
              </div>
              <div className="rec-names">
                {rec.drinkNames.join(' + ')}
              </div>
              <div className="rec-reason">{rec.reason}</div>
              <div className="rec-meta">
                <span className="confidence">
                  置信度 {Math.round(rec.confidence * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="recommendation-info">
        <div className="info-card">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <h4>智能推荐算法</h4>
            <p>
              基于Apriori关联规则算法，分析近30天的点单数据，
              为您推荐最常搭配的饮品组合
            </p>
            {calculationTime > 0 && (
              <span className="calc-time">
                计算耗时: {calculationTime}ms
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="popular-section">
        <h3>人气饮品</h3>
        <div className="popular-list">
          {drinks.slice(0, 5).map((drink, index) => (
            <div key={drink.id} className="popular-item">
              <span className="popular-rank">{index + 1}</span>
              <div
                className="popular-img"
                style={{ background: drink.image_color }}
              >
                <span>☕</span>
              </div>
              <div className="popular-info">
                <span className="popular-name">{drink.name}</span>
                <span className="popular-price">¥{drink.price.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .recommendation-page {
          animation: fadeInUp 0.3s ease;
          padding-bottom: 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .page-header h2 {
          color: #8B4513;
          font-size: 24px;
          margin-bottom: 6px;
        }

        .page-header p {
          color: #A0522D;
          font-size: 13px;
          opacity: 0.8;
        }

        .recommendation-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 8px 4px 20px;
          margin: 0 -20px 24px;
          padding-left: 20px;
          padding-right: 20px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
        }

        .rec-card {
          flex-shrink: 0;
          width: 260px;
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(139, 69, 19, 0.12);
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          scroll-snap-align: start;
          animation: fadeInUp 0.5s ease backwards;
        }

        .rec-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(139, 69, 19, 0.2);
        }

        .rec-badge {
          position: absolute;
          top: -10px;
          left: 20px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #fff;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(255, 165, 0, 0.4);
        }

        .rec-drinks {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 16px 0;
        }

        .rec-drink-img {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .rec-emoji {
          font-size: 36px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .rec-plus {
          font-size: 20px;
          color: #8B4513;
          font-weight: 700;
        }

        .rec-names {
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: #5D3A1A;
          margin-bottom: 8px;
        }

        .rec-reason {
          text-align: center;
          font-size: 13px;
          color: #A0522D;
          line-height: 1.5;
          margin-bottom: 12px;
          min-height: 40px;
        }

        .rec-meta {
          display: flex;
          justify-content: center;
        }

        .confidence {
          display: inline-block;
          background: rgba(139, 69, 19, 0.1);
          color: #8B4513;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .recommendation-info {
          margin-bottom: 28px;
        }

        .info-card {
          display: flex;
          gap: 16px;
          background: rgba(255, 255, 255, 0.6);
          padding: 20px;
          border-radius: 12px;
        }

        .info-icon {
          font-size: 36px;
          flex-shrink: 0;
        }

        .info-content h4 {
          color: #8B4513;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .info-content p {
          color: #5D3A1A;
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .calc-time {
          font-size: 11px;
          color: #A0522D;
          opacity: 0.7;
        }

        .popular-section {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.08);
        }

        .popular-section h3 {
          color: #8B4513;
          font-size: 18px;
          margin-bottom: 16px;
        }

        .popular-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .popular-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
        }

        .popular-item:hover {
          background: rgba(139, 69, 19, 0.05);
        }

        .popular-rank {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5DEB3;
          color: #8B4513;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
        }

        .popular-item:first-child .popular-rank {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #fff;
        }

        .popular-item:nth-child(2) .popular-rank {
          background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
          color: #fff;
        }

        .popular-item:nth-child(3) .popular-rank {
          background: linear-gradient(135deg, #CD7F32, #8B4513);
          color: #fff;
        }

        .popular-img {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .popular-info {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .popular-name {
          font-size: 15px;
          color: #5D3A1A;
          font-weight: 500;
        }

        .popular-price {
          font-size: 15px;
          color: #8B4513;
          font-weight: 700;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 768px) {
          .recommendation-scroll {
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}

export default Recommendation;
