import { useState, useEffect } from 'react';
import { TopicApi, TopicDetail as TopicDetailType, VoteOption, Comment } from './TopicApi';

interface TopicDetailProps {
  topicId: string;
  nickname: string;
  onBack: () => void;
}

const colorPalette = [
  '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

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
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

function formatExactTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAvatarColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

function getAvatarInitial(nickname: string): string {
  const match = nickname.match(/[\u4e00-\u9fa5]/g);
  if (match && match.length > 0) {
    return match[match.length - 1];
  }
  return nickname.charAt(0).toUpperCase();
}

export default function TopicDetail({ topicId, nickname, onBack }: TopicDetailProps) {
  const [topic, setTopic] = useState<TopicDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const data = await TopicApi.getTopicDetail(topicId);
      setTopic(data);
      setHasVoted(data.voters.includes(nickname));
    } catch (err) {
      console.error('获取话题详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopic();
  }, [topicId, nickname]);

  const handleVoteClick = (optionId: string) => {
    if (hasVoted) return;
    setSelectedOption(optionId);
    setShowConfirmModal(true);
  };

  const confirmVote = async () => {
    if (!selectedOption || !topic) return;
    try {
      setSubmittingVote(true);
      setError('');
      const updated = await TopicApi.vote(topicId, selectedOption, nickname);
      setTopic(updated);
      setHasVoted(true);
      setShowConfirmModal(false);
      setSelectedOption(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票失败');
    } finally {
      setSubmittingVote(false);
    }
  };

  const submitComment = async () => {
    if (!commentInput.trim()) return;
    try {
      setSubmittingComment(true);
      await TopicApi.addComment(topicId, commentInput.trim(), nickname);
      setCommentInput('');
      fetchTopic();
    } catch (err) {
      console.error('评论失败', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
        加载中...
      </div>
    );
  }

  if (!topic) {
    return (
      <div>
        <button
          onClick={onBack}
          style={{
            marginBottom: 20,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: 14,
            color: '#374151',
          }}
        >
          ← 返回看板
        </button>
        <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
          话题不存在
        </div>
      </div>
    );
  }

  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0);
  const recentComments = [...topic.comments].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  const participants = new Set([...topic.voters, ...topic.comments.map((c) => c.nickname)]).size;
  const selectedOptionData = topic.options.find((o) => o.id === selectedOption);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <button
        onClick={onBack}
        style={{
          marginBottom: 20,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          fontSize: 14,
          color: '#374151',
          transition: 'all 0.3s ease-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
        }}
      >
        ← 返回看板
      </button>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: 8,
          }}
        >
          {topic.title}
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
          {topic.description}
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#9ca3af' }}>
          <span>创建于 {formatExactTime(topic.createdAt)}</span>
          <span>·</span>
          <span>{participants}人参与</span>
          <span>·</span>
          <span>{topic.comments.length}条评论</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
              投票 {hasVoted && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 400 }}>（您已投票）</span>}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topic.options.map((option) => {
                const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                const isSelected = selectedOption === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleVoteClick(option.id)}
                    disabled={hasVoted}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? '#3b82f6' : '#3b82f6'}`,
                      backgroundColor: isSelected ? '#3b82f6' : '#eff6ff',
                      color: isSelected ? '#ffffff' : '#1f2937',
                      padding: '0 16px',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: hasVoted ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: hasVoted ? 0.8 : 1,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!hasVoted && !isSelected) {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasVoted && !isSelected) {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }
                    }}
                  >
                    <span>{option.text}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: isSelected ? '#dbeafe' : '#9ca3af',
                        fontWeight: 400,
                      }}
                    >
                      {option.votes}票 · {percent}%
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              共 {totalVotes} 票
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 24,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
              评论区
            </h2>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginBottom: 16,
                maxHeight: 400,
                minHeight: 200,
              }}
            >
              {recentComments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
                  暂无评论，来说点什么吧~
                </div>
              ) : (
                recentComments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(comment.nickname),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {getAvatarInitial(comment.nickname)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                          {comment.nickname}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          {formatRelativeTime(comment.timestamp)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: '#4b5563',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入评论，按回车发送"
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
              <button
                onClick={submitComment}
                disabled={!commentInput.trim() || submittingComment}
                style={{
                  padding: '0 20px',
                  height: 40,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: commentInput.trim() ? '#3b82f6' : '#9ca3af',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: commentInput.trim() && !submittingComment ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s ease',
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div
          onClick={() => {
            setShowConfirmModal(false);
            setSelectedOption(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 28,
              width: 360,
              maxWidth: '90%',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>
              确认投票
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
              您确定要投票给 <strong style={{ color: '#3b82f6' }}>{selectedOptionData?.text}</strong> 吗？
              <br />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>投票后将无法更改</span>
            </p>
            {error && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedOption(null);
                  setError('');
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmVote}
                disabled={submittingVote}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submittingVote ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {submittingVote ? '提交中...' : '确认投票'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="flex-direction: row"] {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
