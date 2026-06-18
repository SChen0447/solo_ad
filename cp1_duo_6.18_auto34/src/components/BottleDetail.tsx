import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store';
import type { Bottle } from '../types';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

interface VoteButtonProps {
  type: 'like' | 'dislike';
  count: number;
  active: boolean;
  onClick: () => void;
}

const VoteButton: React.FC<VoteButtonProps> = ({ type, count, active, onClick }) => {
  const [pulse, setPulse] = useState(false);

  const handleClick = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 200);
    onClick();
  };

  const isLike = type === 'like';
  const bgColor = isLike
    ? (active ? '#3b82f6' : 'rgba(59, 130, 246, 0.12)')
    : (active ? '#6b7280' : 'rgba(107, 114, 128, 0.12)');
  const textColor = isLike
    ? (active ? '#fff' : '#3b82f6')
    : (active ? '#fff' : '#6b7280');
  const borderColor = isLike
    ? (active ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)')
    : (active ? '#6b7280' : 'rgba(107, 114, 128, 0.3)');

  return (
    <button
      onClick={handleClick}
      style={{
        flex: 1,
        padding: '12px 20px',
        fontSize: 15,
        fontWeight: 600,
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        color: textColor,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transform: pulse ? 'scale(1.08)' : 'scale(1)'
      }}
      onMouseOver={e => {
        if (!pulse) {
          e.currentTarget.style.transform = 'scale(1.02)';
        }
      }}
      onMouseOut={e => {
        if (!pulse) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <span style={{ fontSize: 18 }}>{isLike ? '👍' : '👎'}</span>
      <span>{isLike ? '点赞' : '踩'}</span>
      <span style={{
        fontSize: 14,
        opacity: 0.85,
        marginLeft: 4
      }}>
        ({count})
      </span>
    </button>
  );
};

const HotBadge: React.FC<{ score: number }> = ({ score }) => {
  if (score < 5) return null;
  let label = '🔥 热门';
  let bg = 'rgba(249, 115, 22, 0.15)';
  let color = '#f97316';
  if (score >= 20) {
    label = '🔥🔥🔥 爆火';
    bg = 'rgba(239, 68, 68, 0.15)';
    color = '#ef4444';
  } else if (score >= 10) {
    label = '🔥🔥 超热';
    bg = 'rgba(251, 146, 60, 0.15)';
    color = '#fb923c';
  }
  return (
    <span style={{
      fontSize: 12,
      padding: '3px 10px',
      borderRadius: 999,
      background: bg,
      color: color,
      fontWeight: 600,
      marginLeft: 10
    }}>
      {label}
    </span>
  );
};

export const BottleDetail: React.FC = () => {
  const { bottles, selectedId, vote } = useStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const bottle: Bottle | undefined = useMemo(() => {
    return bottles.find(b => b.id === selectedId);
  }, [bottles, selectedId]);

  const isLiked = useMemo(() => {
    return bottle?.likeUsers.some(u => u.id === 'current-user') ?? false;
  }, [bottle]);

  const sortedLikeUsers = useMemo(() => {
    if (!bottle) return [];
    return [...bottle.likeUsers].sort(() => Math.random() - 0.5);
  }, [bottle]);

  if (!bottle) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🍾</div>
          <div style={{ fontSize: 15, marginBottom: 6 }}>从左侧选择一个漂流瓶</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>看看大海漂来了什么好点子</div>
        </div>
      </div>
    );
  }

  const hotScore = bottle.likes - bottle.dislikes;

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: 28,
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        div::-webkit-scrollbar { width: 6px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
      `}</style>
      <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }} key={bottle.id}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24
        }}>
          <div style={{
            fontSize: 52,
            lineHeight: 1,
            flexShrink: 0,
            padding: 12,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {bottle.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 10
            }}>
              <h1 style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#1f2937',
                margin: 0,
                lineHeight: 1.3
              }}>
                {bottle.title}
              </h1>
              <HotBadge score={hotScore} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: 13,
              color: '#6b7280'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: 'rgba(96, 165, 250, 0.1)',
                borderRadius: 999,
                color: '#3b82f6'
              }}>
                <span>✍️</span>
                {bottle.authorName}
              </span>
              <span>🕐 {formatRelativeTime(bottle.createdAt)}</span>
              <span>
                热度: <strong style={{ color: '#f59e0b' }}>#{bottles
                  .slice()
                  .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes))
                  .findIndex(b => b.id === bottle.id) + 1}</strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{
          padding: 24,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 28
        }}>
          <p style={{
            fontSize: 16,
            color: '#4b5563',
            lineHeight: 1.8,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {bottle.content || '（暂无详细描述）'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 28
        }}>
          <VoteButton
            type="like"
            count={bottle.likes}
            active={isLiked}
            onClick={() => vote(bottle.id, 'like')}
          />
          <VoteButton
            type="dislike"
            count={bottle.dislikes}
            active={false}
            onClick={() => vote(bottle.id, 'dislike')}
          />
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14
          }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>💙</span>
              点赞的小伙伴
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '2px 8px',
                borderRadius: 999
              }}>
                {bottle.likes}人
              </span>
            </h3>
          </div>

          {sortedLikeUsers.length === 0 ? (
            <div style={{
              padding: 32,
              textAlign: 'center',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              color: '#6b7280',
              fontSize: 14
            }}>
              还没有小伙伴点赞，来做第一个吧！✨
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8
            }}>
              {sortedLikeUsers.map((user, idx) => (
                <span
                  key={`${user.id}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: '1px solid rgba(59, 130, 246, 0.1)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#bfdbfe';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                >
                  <span style={{ fontSize: 14 }}>
                    {user.id === 'current-user' ? '🙋' : '🧑'}
                  </span>
                  {user.nickname}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
