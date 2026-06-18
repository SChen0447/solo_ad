import React, { useState, useEffect, useCallback } from 'react';
import { fetchTopicDetail, voteTopic, addComment, type Topic } from './TopicApi';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

interface Props {
  topicId: string;
  onBack: () => void;
  userId: string;
  nickname: string;
  avatarColor: string;
}

export default function TopicDetail({ topicId, onBack, userId, nickname, avatarColor }: Props) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [voted, setVoted] = useState(false);
  const [voteError, setVoteError] = useState('');

  const loadTopic = useCallback(async () => {
    try {
      const data = await fetchTopicDetail(topicId);
      setTopic(data);
      if (data.votedUsers.includes(userId)) {
        setVoted(true);
      }
    } catch (err) {
      console.error('Failed to load topic:', err);
    } finally {
      setLoading(false);
    }
  }, [topicId, userId]);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  const handleVoteClick = (optionId: string) => {
    if (voted) return;
    setSelectedOption(optionId);
    setShowConfirm(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedOption) return;
    try {
      setVoteError('');
      const updated = await voteTopic(topicId, selectedOption, userId);
      setTopic(updated);
      setVoted(true);
      setShowConfirm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '投票失败';
      setVoteError(message);
      setShowConfirm(false);
      setTimeout(() => setVoteError(''), 3000);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const newComment = await addComment(topicId, nickname, commentText.trim(), avatarColor);
      if (topic) {
        setTopic({
          ...topic,
          comments: [...topic.comments, newComment],
        });
      }
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
        加载中...
      </div>
    );
  }

  if (!topic) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
        话题不存在
      </div>
    );
  }

  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0);
  const recentComments = [...topic.comments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          fontSize: 14,
          cursor: 'pointer',
          padding: '8px 0',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ← 返回看板
      </button>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        padding: 24,
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
          {topic.title}
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.6 }}>
          {topic.description}
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#9ca3af' }}>
          <span>创建于 {formatRelativeTime(topic.createdAt)}</span>
          <span>{topic.votedUsers.length} 人参与</span>
          <span>{totalVotes} 票</span>
        </div>
      </div>

      {voteError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 16,
          color: '#ef4444',
          fontSize: 14,
        }}>
          {voteError}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 24,
        flexDirection: 'row',
      }} className="detail-columns">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: 20,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: '0 0 16px' }}>
              投票区域
              {voted && (
                <span style={{ fontSize: 13, color: '#22c55e', marginLeft: 8, fontWeight: 400 }}>
                  ✓ 已投票
                </span>
              )}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topic.options.map((option) => {
                const percentage = totalVotes > 0
                  ? ((option.votes / totalVotes) * 100).toFixed(1)
                  : '0.0';
                const isSelected = selectedOption === option.id;
                const isVotedOption = voted && topic.votedUsers.includes(userId);

                return (
                  <div key={option.id}>
                    <button
                      onClick={() => handleVoteClick(option.id)}
                      disabled={voted}
                      style={{
                        width: '100%',
                        height: 48,
                        borderRadius: 8,
                        border: '1px solid #3b82f6',
                        background: isSelected
                          ? '#3b82f6'
                          : voted
                            ? (isVotedOption ? '#eff6ff' : '#f9fafb')
                            : '#eff6ff',
                        color: isSelected ? '#fff' : '#1f2937',
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: voted ? 'default' : 'pointer',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 16px',
                        boxSizing: 'border-box',
                        opacity: voted ? 0.85 : 1,
                      }}
                    >
                      <span>{option.text}</span>
                      <span style={{
                        fontSize: 12,
                        color: isSelected ? '#dbeafe' : '#9ca3af',
                      }}>
                        {option.votes}票 ({percentage}%)
                      </span>
                    </button>
                    {voted && (
                      <div style={{
                        width: '100%',
                        height: 4,
                        background: '#e5e7eb',
                        borderRadius: 2,
                        marginTop: 4,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'linear-gradient(to right, #3b82f6, #93c5fd)',
                          borderRadius: 2,
                          transition: 'width 0.3s ease-out',
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: '0 0 16px' }}>
              评论 ({topic.comments.length})
            </h3>

            <div style={{
              flex: 1,
              maxHeight: 400,
              overflowY: 'auto',
              marginBottom: 16,
            }}>
              {recentComments.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 }}>
                  暂无评论，快来发表第一条评论吧
                </div>
              )}
              {recentComments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: comment.avatarColor,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    {comment.author.charAt(comment.author.length - 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {comment.author}
                      </span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: '#4b5563', margin: '4px 0 0', lineHeight: 1.5 }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="发表评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease-out',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                style={{
                  background: commentText.trim() ? '#3b82f6' : '#e5e7eb',
                  color: commentText.trim() ? '#fff' : '#9ca3af',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.3s ease-out',
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: '0 0 12px' }}>
              确认投票
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              你确定要为「{topic.options.find((o) => o.id === selectedOption)?.text}」投票吗？投票后不可更改。
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmVote}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                确认投票
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .detail-columns {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
