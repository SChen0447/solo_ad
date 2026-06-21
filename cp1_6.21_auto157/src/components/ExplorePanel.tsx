import React, { useState } from 'react';
import { findRandomRelated } from '../services/cardService';
import type { FlashCardData } from '../services/cardService';

interface ExplorePanelProps {
  cards: FlashCardData[];
}

const ExplorePanel: React.FC<ExplorePanelProps> = ({ cards }) => {
  const [relatedCards, setRelatedCards] = useState<FlashCardData[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const handleRandomExplore = () => {
    setRippleKey(prev => prev + 1);
    if (cards.length < 2) return;
    const result = findRandomRelated(cards);
    setRelatedCards(result);
    setIsExploring(true);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getGradientStyle = (sourceType: 'book' | 'article'): React.CSSProperties => {
    return sourceType === 'book'
      ? { background: 'linear-gradient(135deg, #FB923C, #F472B6)' }
      : { background: 'linear-gradient(135deg, #60A5FA, #A78BFA)' };
  };

  return (
    <div className="explore-section">
      <div className="explore-header">
        <span className="explore-title">🔍 探索模式</span>
        <button
          className="explore-btn"
          onClick={handleRandomExplore}
          key={rippleKey}
        >
          随机关联
        </button>
        {isExploring && (
          <button
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
            onClick={() => {
              setIsExploring(false);
              setRelatedCards([]);
            }}
          >
            关闭
          </button>
        )}
      </div>

      {cards.length < 2 && (
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          padding: '20px 0',
        }}>
          至少需要2条碎片才能探索关联
        </div>
      )}

      {isExploring && relatedCards.length > 0 && (
        <div className="timeline-container">
          <div className="timeline-track">
            {relatedCards.map((card, index) => (
              <div
                key={card.id}
                className="timeline-card-wrapper"
                style={{
                  animation: `slideUp 0.3s ease ${index * 0.1}s both`,
                }}
              >
                <div style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: '#fff',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{
                    ...getGradientStyle(card.sourceType),
                    height: '3px',
                    width: '100%',
                  }} />
                  <div style={{ padding: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.source}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {card.excerpt}
                    </div>
                    {card.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '8px',
                      }}>
                        {card.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              background: '#F3F4F6',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="timeline-time">{formatDate(card.createdAt)}</div>
                {index < relatedCards.length - 1 && (
                  <div className="timeline-arrow-head" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isExploring && relatedCards.length === 0 && cards.length >= 2 && (
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          padding: '20px 0',
          textAlign: 'center',
        }}>
          未找到关联碎片，试试添加更多带标签的碎片
        </div>
      )}
    </div>
  );
};

export default ExplorePanel;
