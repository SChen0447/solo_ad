import React, { useState, useEffect } from 'react';
import { Recommendation } from '../types';

interface RecommendListProps {
  recommendations: Recommendation[];
  onSelect: (dest: Recommendation) => void;
  selectedId: string | null;
}

const RecommendList: React.FC<RecommendListProps> = ({
  recommendations,
  onSelect,
  selectedId,
}) => {
  const [animateItems, setAnimateItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAnimateItems(new Set());
    const timers: NodeJS.Timeout[] = [];
    
    recommendations.forEach((rec, index) => {
      const timer = setTimeout(() => {
        setAnimateItems((prev) => new Set(prev).add(rec.id));
      }, 100 + index * 150);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [recommendations]);

  const getProgressColor = (score: number): string => {
    if (score >= 80) return 'var(--accent-gold)';
    if (score >= 60) return 'var(--accent-blue)';
    return 'var(--accent-light)';
  };

  if (recommendations.length === 0) {
    return (
      <div className="recommend-list">
        <h3 className="section-title">推荐目的地</h3>
        <div className="recommend-empty">
          <span className="empty-icon">✈️</span>
          <p>搜索城市后获取旅行推荐</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-list">
      <h3 className="section-title">
        推荐目的地 <span className="title-count">{recommendations.length}</span>
      </h3>
      <div className="recommend-cards">
        {recommendations.map((rec, index) => (
          <div
            key={rec.id}
            className={`recommend-card glass-effect ${
              selectedId === rec.id ? 'selected' : ''
            } ${animateItems.has(rec.id) ? 'visible' : ''}`}
            onClick={() => onSelect(rec)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="recommend-header">
              <div>
                <h4 className="recommend-name">{rec.name}</h4>
                <p className="recommend-country">{rec.country}</p>
              </div>
              <div className="recommend-weather-icon">
                {rec.weatherTypes.includes('sunny') && '☀️'}
                {rec.weatherTypes.includes('rainy') && '🌧️'}
                {rec.weatherTypes.includes('snowy') && '❄️'}
              </div>
            </div>

            <p className="recommend-reason">{rec.reason}</p>

            <div className="match-score-container">
              <div className="match-score-header">
                <span className="match-label">匹配度</span>
                <span className="match-value">{rec.matchScore}%</span>
              </div>
              <div className="match-progress-bar">
                <div
                  className="match-progress-fill"
                  style={{
                    width: animateItems.has(rec.id) ? `${rec.matchScore}%` : '0%',
                    background: `linear-gradient(90deg, var(--accent-blue), ${getProgressColor(rec.matchScore)})`,
                  }}
                />
              </div>
            </div>

            <div className="recommend-activities-preview">
              {rec.activities.slice(0, 3).map((activity, i) => (
                <span key={i} className="activity-tag">
                  {activity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendList;
