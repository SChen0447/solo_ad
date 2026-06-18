import { useState, useEffect } from 'react';
import {
  TopicApi,
  TopicDetail as TopicDetailType,
  VoteOptionDetail,
  Comment,
  VoteStatus
} from './TopicApi';

interface TopicDetailProps {
  topicId: string;
  onBack: () => void;
  userId: string;
  userName: string;
}

const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635',
  '#34d399', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb7185', '#6366f1', '#14b8a6'
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
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullTime(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  return name.slice(-1);
}

export default function TopicDetail({
  topicId,
  onBack,
  userId,
  userName
}: TopicDetailProps) {
  const [topic, setTopic] = useState<TopicDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({ voted: false, votedOptionId: null });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detail, status] = await Promise.all([
        TopicApi.getTopicDetail(topicId),
        TopicApi.checkVoted(topicId, userId)
      ]);
      setTopic(detail);
      setVoteStatus(status);
      if (status.votedOptionId) {
        setSelectedOptionId(status.votedOptionId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [topicId, userId]);

  const handleOptionClick = (optionId: string) => {
    if (voteStatus.voted) return;
    setSelectedOptionId(optionId);
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedOptionId) return;
    try {
      setVoting(true);
      const result = await TopicApi.vote(topicId, selectedOptionId, userId);
      setTopic(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          options: result.options,
          totalVotes: result.totalVotes,
          participantCount: result.participantCount
        };
      });
      setVoteStatus({ voted: true, votedOptionId: selectedOptionId });
      setShowConfirmModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '投票失败');
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || submittingComment) return;
    try {
      setSubmittingComment(true);
      const result = await TopicApi.addComment(topicId, userName, trimmed);
      setTopic(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [result.comment, ...prev.comments].slice(0, 10)
        };
      });
      setCommentText('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
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
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error || '话题不存在'}</p>
        <button onClick={onBack} style={{
          padding: '8px 20px',
          borderRadius: '8px',
          backgroundColor: '#3b82f6',
          color: '#fff',
          border: 'none',
          cursor: 'pointer'
        }}>返回看板</button>
      </div>
    );
  }

  const selectedOption = topic.options.find(o => o.id === selectedOptionId);

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          color: '#4b5563',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '20px',
          transition: 'all 0.3s ease-out'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.color = '#3b82f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.color = '#4b5563';
        }}
      >
        ← 返回看板
      </button>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '28px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          {topic.title}
        </h2>
        {topic.description && (
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#6b7280',
            lineHeight: 1.6,
            marginBottom: '16px'
          }}>
            {topic.description}
          </p>
        )}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          color: '#9ca3af'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📅</span>
            创建于 {formatFullTime(topic.createdAt)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>👥</span>
            {topic.participantCount} 人参与
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🗳️</span>
            共 {topic.totalVotes} 票
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>💬</span>
            {topic.comments.length} 条评论
          </span>
        </div>
      </div>

      <div className="detail-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 600,
              color: '#1f2937'
            }}>
              🗳️ 投票
            </h3>
            {voteStatus.voted && (
              <span style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                fontWeight: 500
              }}>
                ✓ 已投票
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topic.options.map((opt, idx) => (
              <VoteOptionButton
                key={opt.id}
                option={opt}
                index={idx}
                totalVotes={topic.totalVotes}
                isSelected={selectedOptionId === opt.id}
                isVoted={voteStatus.voted}
                isUserVoted={voteStatus.votedOptionId === opt.id}
                onClick={() => handleOptionClick(opt.id)}
              />
            ))}
          </div>

          {!voteStatus.voted && (
            <p style={{
              marginTop: '16px',
              fontSize: '13px',
              color: '#9ca3af',
              textAlign: 'center',
              marginBottom: 0
            }}>
              点击选项进行投票，每人限投一次
            </p>
          )}
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '600px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 600,
              color: '#1f2937'
            }}>
              💬 评论讨论
            </h3>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              最新 {topic.comments.length} 条
            </span>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            paddingRight: '4px',
            minHeight: '300px'
          }}>
            {topic.comments.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#9ca3af',
                fontSize: '14px'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>💭</div>
                还没有评论，快来发表第一条吧！
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {topic.comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="说点什么..."
              disabled={submittingComment}
              style={{
                flex: 1,
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.3s ease-out',
                backgroundColor: submittingComment ? '#f9fafb' : '#ffffff'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !commentText.trim() || submittingComment ? '#93c5fd' : '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: !commentText.trim() || submittingComment ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {submittingComment ? '发送中' : '发送'}
            </button>
          </form>
        </div>
      </div>

      {showConfirmModal && (
        <div
          onClick={() => !voting && setShowConfirmModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              padding: '28px',
              border: '1px solid #e5e7eb',
              animation: 'modalSlide 0.3s ease-out'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px'
              }}>
                🗳️
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
                确认投票
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>
                您确定要投给「<span style={{ color: '#3b82f6', fontWeight: 500 }}>{selectedOption?.text}</span>」吗？
                <br />
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>投票后不可修改，请谨慎选择</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => !voting && setShowConfirmModal(false)}
                disabled={voting}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: voting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                再想想
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={voting}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: voting ? '#93c5fd' : '#3b82f6',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: voting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3b82f6'; }}
              >
                {voting ? '投票中...' : '确认投票'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalSlide {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .detail-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

interface VoteOptionButtonProps {
  option: VoteOptionDetail;
  index: number;
  totalVotes: number;
  isSelected: boolean;
  isVoted: boolean;
  isUserVoted: boolean;
  onClick: () => void;
}

function VoteOptionButton({
  option,
  index,
  totalVotes,
  isSelected,
  isVoted,
  isUserVoted,
  onClick
}: VoteOptionButtonProps) {
  const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
  const isActive = isUserVoted || (isSelected && !isVoted);
  const showResult = isVoted;

  return (
    <div
      onClick={isVoted ? undefined : onClick}
      style={{
        width: '100%',
        minHeight: '48px',
        borderRadius: '8px',
        border: `1px solid ${isActive ? '#3b82f6' : '#bfdbfe'}`,
        backgroundColor: isActive ? '#3b82f6' : '#eff6ff',
        color: isActive ? '#ffffff' : '#1e40af',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        cursor: isVoted ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        if (!isVoted && !isSelected) {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isVoted && !isSelected) {
          e.currentTarget.style.borderColor = '#bfdbfe';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {showResult && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${percentage}%`,
          backgroundColor: isUserVoted ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.15)',
          transition: 'width 0.5s ease-out'
        }} />
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0
          }}>
            {String.fromCharCode(65 + index)}
          </span>
          <span style={{
            fontWeight: 500,
            fontSize: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {option.text}
            {isUserVoted && (
              <span style={{ marginLeft: '6px', fontSize: '12px' }}>✓</span>
            )}
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: isActive ? 'rgba(255,255,255,0.9)' : '#6b7280',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px'
        }}>
          <span style={{ fontWeight: 600 }}>{option.voteCount}票</span>
          <span style={{ opacity: 0.8 }}>({percentage.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const color = getAvatarColor(comment.userName);
  const initial = getInitial(comment.userName);

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      animation: 'commentIn 0.3s ease-out'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        flexShrink: 0
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151'
          }}>
            {comment.userName}
          </span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div style={{
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: 1.6,
          wordBreak: 'break-word'
        }}>
          {comment.content}
        </div>
      </div>
      <style>{`
        @keyframes commentIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
