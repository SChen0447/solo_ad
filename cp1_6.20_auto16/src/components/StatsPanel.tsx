import React, { useState, useEffect } from 'react';
import type { TravelMemory, MemoryStats } from '@/types';
import '@styles/StatsPanel.css';

interface StatsPanelProps {
  stats: MemoryStats;
  memories: TravelMemory[];
}

export function StatsPanel({ stats, memories }: StatsPanelProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const ratingPercentage = (stats.averageRating / 5) * 100;

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'linear-gradient(90deg, #27ae60, #2ecc71)';
    if (rating >= 3.5) return 'linear-gradient(90deg, #e67e22, #f39c12)';
    if (rating >= 2.5) return 'linear-gradient(90deg, #d35400, #e67e22)';
    return 'linear-gradient(90deg, #c0392b, #e74c3c)';
  };

  const latestMemories = memories
    .slice()
    .sort((a, b) => (b.visitedAt ?? b.createdAt) - (a.visitedAt ?? a.createdAt))
    .slice(0, 5);

  return (
    <div
      className={`stats-panel ${isExpanded ? 'expanded' : 'collapsed'} ${
        isMobile ? 'mobile' : ''
      }`}
    >
      <button
        className="stats-toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? '收起' : isMobile ? '📊' : '统计'}
        <span className={`toggle-arrow ${isExpanded ? 'up' : 'down'}`}>▾</span>
      </button>

      <div className="stats-content">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">📍</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalCount}</span>
              <span className="stat-label">到访地点</span>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">🌏</div>
            <div className="stat-info">
              <span className="stat-value">{stats.countries.length}</span>
              <span className="stat-label">国家</span>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">🏙️</div>
            <div className="stat-info">
              <span className="stat-value">{stats.cities.length}</span>
              <span className="stat-label">城市</span>
            </div>
          </div>
        </div>

        <div className="stats-rating">
          <div className="rating-header">
            <span className="rating-title">平均评分</span>
            <span className="rating-score">
              {stats.averageRating > 0
                ? stats.averageRating.toFixed(1)
                : '—'}
              <span className="rating-total">/5</span>
            </span>
          </div>
          <div className="rating-bar-container">
            <div
              className="rating-bar-fill"
              style={{
                width: stats.averageRating > 0 ? `${ratingPercentage}%` : '0%',
                background: getRatingColor(stats.averageRating),
              }}
            />
          </div>
          <div className="rating-stars">
            {Array.from({ length: 5 }, (_, i) => {
              const fillLevel = stats.averageRating - i;
              let opacity = 0;
              if (fillLevel >= 1) opacity = 1;
              else if (fillLevel > 0) opacity = fillLevel;
              return (
                <span
                  key={i}
                  className="rating-star-display"
                  style={{ opacity }}
                >
                  ★
                </span>
              );
            })}
          </div>
        </div>

        {isExpanded && latestMemories.length > 0 && (
          <div className="stats-recent">
            <h4 className="recent-title">最近旅行</h4>
            <ul className="recent-list">
              {latestMemories.map((m) => (
                <li key={m.id} className="recent-item">
                  <span className="recent-dot" />
                  <span className="recent-name">{m.name}</span>
                  <span className="recent-rating">
                    {'★'.repeat(m.rating)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
