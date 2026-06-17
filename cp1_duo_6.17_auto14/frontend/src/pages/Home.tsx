import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { beansAPI } from '../utils/api';
import BeanCard from '../components/BeanCard';
import type { Bean } from '../types';
import './Home.scss';

function Home() {
  const [recommendations, setRecommendations] = useState<Bean[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    loadRecommendations();
    
    const refreshInterval = setInterval(() => {
      loadRecommendations();
    }, 3600000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (!loading && recommendations.length > 0) {
      const timer = setTimeout(() => {
        setShowRecommendations(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, recommendations]);

  const loadRecommendations = async () => {
    try {
      const data = await beansAPI.getRecommendations();
      setRecommendations(data.beans || []);
      setReason(data.reason || '');
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setRecommendations(mockRecommendations);
      setReason('基于当季热门咖啡豆推荐');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-section__content">
          <h1 className="hero-section__title">
            探索咖啡的
            <br />
            <span className="hero-section__title-highlight">风味之旅</span>
          </h1>
          <p className="hero-section__subtitle">
            每月精选世界各地精品咖啡豆，开启您的专属味觉冒险
          </p>
          <div className="hero-section__actions">
            <Link to="/explore" className="btn btn--primary">
              开始探索
            </Link>
            <Link to="/subscribe" className="btn btn--secondary">
              了解订阅
            </Link>
          </div>
        </div>
        <div className="hero-section__image">
          <div className="hero-section__coffee-icon">☕</div>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <div className="feature-card__icon">🌍</div>
          <h3 className="feature-card__title">全球精选</h3>
          <p className="feature-card__desc">严选来自埃塞俄比亚、哥伦比亚、巴拿马等十大产区的精品咖啡豆</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">📅</div>
          <h3 className="feature-card__title">按月配送</h3>
          <p className="feature-card__desc">灵活的订阅计划，每周/双周/每月新鲜配送，随时可暂停</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">👥</div>
          <h3 className="feature-card__title">风味社区</h3>
          <p className="feature-card__desc">与咖啡爱好者分享品鉴笔记，发现更多风味可能</p>
        </div>
      </section>

      <section className="recommendations-section">
        <div className="section-header">
          <h2 className="section-header__title">为你推荐</h2>
          <p className="section-header__subtitle">{reason}</p>
        </div>

        {loading ? (
          <div className="recommendations-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-card__image" />
                <div className="skeleton-card__lines">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="recommendations-grid">
            {showRecommendations && recommendations.map((bean, index) => (
              <div
                key={bean.id}
                className="recommendation-item"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <BeanCard bean={bean} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="cta-section">
        <div className="cta-section__content">
          <h2 className="cta-section__title">加入 Bean Voyage 社区</h2>
          <p className="cta-section__desc">
            与成千上万的咖啡爱好者一起，探索、分享、成长
          </p>
          <Link to="/community" className="btn btn--primary btn--large">
            进入社区
          </Link>
        </div>
      </section>
    </div>
  );
}

const mockRecommendations: Bean[] = [
  {
    id: 1,
    name: '耶加雪菲 沃卡',
    origin: '埃塞俄比亚',
    process: '水洗',
    flavor_tags: ['花香', '柑橘', '果酸'],
    avg_rating: 4.7,
    price: 128,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    description: '',
    roast_level: '浅烘',
  },
  {
    id: 2,
    name: '瑰夏 翡翠庄园',
    origin: '巴拿马',
    process: '水洗',
    flavor_tags: ['花香', '果酸', '焦糖'],
    avg_rating: 4.9,
    price: 298,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
    description: '',
    roast_level: '浅烘',
  },
  {
    id: 3,
    name: '慧兰 粉波旁',
    origin: '哥伦比亚',
    process: '水洗',
    flavor_tags: ['巧克力', '坚果', '焦糖'],
    avg_rating: 4.5,
    price: 98,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    description: '',
    roast_level: '中烘',
  },
  {
    id: 4,
    name: '西达摩 花魁',
    origin: '埃塞俄比亚',
    process: '日晒',
    flavor_tags: ['花香', '浆果', '果酸'],
    avg_rating: 4.6,
    price: 118,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
    description: '',
    roast_level: '浅烘',
  },
];

export default Home;
