import { useState, useEffect } from 'react';
import { TopicApi, TopicListItem } from './TopicApi';

interface TopicBoardProps {
  onTopicClick: (topicId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function TopicBoard({ onTopicClick }: TopicBoardProps) {
  const [topics, setTopics] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await TopicApi.getTopics();
      setTopics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const getVotePercentage = (topic: TopicListItem): number => {
    if (topic.participantCount === 0) return 0;
    const maxParticipants = 50;
    return Math.min(100, (topic.participantCount / maxParticipants) * 100);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>加载话题中...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 20px'
      }}>
        <p style={{ color: '#ef4444', fontSize: '16px', marginBottom: '16px' }}>
          {error}
        </p>
        <button
          onClick={loadTopics}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1f2937',
          margin: 0,
          marginBottom: '6px'
        }}>
          话题看板
        </h2>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '14px'
        }}>
          共 {topics.length} 个话题 · 点击卡片查看详情并参与投票
        </p>
      </div>

      {topics.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
            还没有话题，快去发起第一个吧！
          </p>
        </div>
      ) : (
        <div className="board-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 320px)',
          gap: '20px',
          justifyContent: 'start'
        }}>
          {topics.map((topic, index) => {
            const percentage = getVotePercentage(topic);
            return (
              <div
                key={topic.id}
                onClick={() => onTopicClick(topic.id)}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '180px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  padding: '18px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `cardFadeIn 0.5s ease ${index * 0.05}s both`
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1f2937',
                    margin: 0,
                    marginBottom: '10px',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {topic.title}
                  </h3>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '14px',
                    color: '#9ca3af',
                    marginBottom: 'auto'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🗳️</span>
                      {topic.optionCount}个选项
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>👥</span>
                      {topic.totalVotes}票
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💬</span>
                      {topic.commentsCount}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      参与度 {topic.participantCount} 人
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {formatRelativeTime(topic.createdAt)}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>

                <style>{`
                  @keyframes cardFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .board-grid {
            grid-template-columns: 1fr !important;
          }
          .board-grid > div {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
