import { useState, useEffect } from 'react';
import { Recommendation } from '../../types';
import { analyzePreferences } from '../../services/api';
import { useUser } from '../../context/UserContext';
import './RecommendSidebar.css';

interface RecommendSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onActivityClick?: (activityId: string) => void;
}

const typeLabels: Record<string, string> = {
  talk: '演讲',
  workshop: '工作坊',
  social: '社交'
};

export default function RecommendSidebar({
  isOpen = true,
  onClose,
  onActivityClick
}: RecommendSidebarProps) {
  const { userId, bookedActivities } = useUser();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [topTags, setTopTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const result = await analyzePreferences(userId);
      setRecommendations(result.recommendations);
      setTopTags(result.topTags);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookedActivities.length > 0) {
      loadRecommendations();
    }
  }, [userId, bookedActivities.length]);

  const handleItemClick = (activityId: string) => {
    if (onActivityClick) {
      onActivityClick(activityId);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {onClose && (
        <div
          className={`recommend-backdrop ${isOpen ? 'open' : ''}`}
          onClick={onClose}
        />
      )}
      <aside className={`recommend-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="recommend-header">
          <div className="recommend-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3>个性化推荐</h3>
        </div>

        <p className="recommend-subtitle">
          基于您已预约的 {bookedActivities.length} 场活动为您推荐
        </p>

        {topTags.length > 0 && (
          <div className="tags-section">
            <div className="tags-title">热门标签</div>
            <div className="tags-list">
              {topTags.slice(0, 5).map(tag => (
                <span key={tag} className="hot-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div className="tags-title">为您推荐</div>
        {loading ? (
          <div className="loading-container" style={{ padding: '30px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="empty-recommendations">
            {bookedActivities.length === 0
              ? '预约活动后将为您生成个性化推荐'
              : '暂无更多推荐'}
          </div>
        ) : (
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div
                key={rec.activity.id}
                className="recommendation-item"
                onClick={() => handleItemClick(rec.activity.id)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="recommendation-dot" />
                <div className="recommendation-content">
                  <div className="recommendation-title">
                    {rec.activity.title}
                  </div>
                  <div className="recommendation-meta">
                    <span className="recommendation-type">
                      {typeLabels[rec.activity.type]}
                    </span>
                    <span className="recommendation-score">
                      {rec.matchScore}% 匹配
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="refresh-btn" onClick={loadRecommendations}>
          刷新推荐
        </button>
      </aside>
    </>
  );
}
