import React, { useState, useEffect } from 'react';
import type { LeaderboardItem } from '../types';
import { canvasApi } from '../api/canvasApi';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const result = await canvasApi.getLeaderboard();
        setLeaderboard(result.leaderboard);
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: 24,
        background: 'rgba(255, 252, 245, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: isVisible ? 20 : 12,
        boxShadow: '0 8px 32px rgba(93, 78, 55, 0.12)',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        zIndex: 100,
        minWidth: 200,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        onClick={() => setIsVisible(!isVisible)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          marginBottom: isVisible ? 12 : 0,
        }}
      >
        <span style={{ fontSize: 18 }}>🏆</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#5D4E37',
          }}
        >
          热门排行榜
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8B7355' }}>
          {isVisible ? '收起' : '展开'}
        </span>
      </div>

      {isVisible && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaderboard.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: '#b8a88a',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              暂无数据，快来发布第一条吧！
            </div>
          ) : (
            leaderboard.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(139, 115, 85, 0.05)',
                  animation: 'fadeSlideIn 0.3s ease',
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'both',
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background:
                      index === 0
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                        : index === 1
                        ? 'linear-gradient(135deg, #C0C0C0, #A8A8A8)'
                        : index === 2
                        ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                        : 'rgba(139, 115, 85, 0.2)',
                    color: index < 3 ? '#fff' : '#5D4E37',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {index + 1}
                </span>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: item.color,
                    border: '2px solid #fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: '#5D4E37',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.user_id}
                </span>
                <span style={{ fontSize: 12, color: '#8B7355', fontWeight: 600 }}>
                  ❤️ {item.likes}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
