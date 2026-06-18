import { useState, useEffect, useRef } from 'react';
import {
  TopicApi,
  TopicDetailData,
  VoteOptionData,
  CommentData,
} from './TopicApi';

interface TopicDetailProps {
  topicId: string;
  userId: string;
  nickname: string;
  onBack: () => void;
}

const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa',
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
  '#fb7185',
];

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.split('的');
  if (parts.length > 1) {
    return parts[1].slice(0, 2);
  }
  return name.slice(0, 2);
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
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
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <div
        style={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={styles.modalTitle}>{title}</h3>
        <p style={styles.modalMessage}>{message}</p>
        <div style={styles.modalActions}>
          <button onClick={onCancel} style={styles.modalCancelBtn}>
            取消
          </button>
          <button onClick={onConfirm} style={styles.modalConfirmBtn}>
            确认投票
          </button>
        </div>
      </div>
    </div>
  );
}

function VoteOption({
  option,
  selected,
  voted,
  myVote,
  totalVotes,
  onClick,
}: {
  option: VoteOptionData;
  selected: boolean;
  voted: boolean;
  myVote: boolean;
  totalVotes: number;
  onClick: () => void;
}) {
  const isActive = voted ? myVote : selected;
  return (
    <button
      onClick={onClick}
      disabled={voted}
      style={{
        ...styles.voteOption,
        background: isActive ? '#3b82f6' : '#eff6ff',
        borderColor: isActive ? '#3b82f6' : '#3b82f6',
        color: isActive ? '#ffffff' : '#1f2937',
        cursor: voted ? 'default' : 'pointer',
        opacity: voted && !myVote ? 0.7 : 1,
      }}
    >
      <span style={styles.voteOptionText}>{option.text}</span>
      <span
        style={{
          ...styles.voteOptionMeta,
          color: isActive ? '#dbeafe' : '#6b7280',
        }}
      >
        {option.votes}票 ({option.percentage}%)
      </span>
    </button>
  );
}

function CommentItem({ comment }: { comment: CommentData }) {
  const bg = getAvatarColor(comment.nickname + comment.userId);
  return (
    <div style={styles.commentItem}>
      <div
        style={{
          ...styles.commentAvatar,
          background: bg,
        }}
      >
        {getInitials(comment.nickname)}
      </div>
      <div style={styles.commentBody}>
        <div style={styles.commentHeader}>
          <span style={styles.commentNickname}>{comment.nickname}</span>
          <span
            style={styles.commentTime}
            title={formatExactTime(comment.createdAt)}
          >
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p style={styles.commentText}>{comment.text}</p>
      </div>
    </div>
  );
}

export default function TopicDetail({
  topicId,
  userId,
  nickname,
  onBack,
}: TopicDetailProps) {
  const [topic, setTopic] = useState<TopicDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [voting, setVoting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [voteFlashMsg, setVoteFlashMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [topicData, voteStatus] = await Promise.all([
        TopicApi.getTopic(topicId),
        TopicApi.getVoteStatus(topicId, userId),
      ]);
      setTopic(topicData);
      setHasVoted(voteStatus.hasVoted);
      setVotedOption(voteStatus.optionId);
    } catch (err: any) {
      setError(err.message || '加载话题详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [topicId, userId]);

  const handleOptionClick = (optionId: string) => {
    if (hasVoted || voting) return;
    setSelectedOption(optionId);
    const option = topic?.options.find((o) => o.id === optionId);
    if (option) {
      setShowConfirm(true);
    }
  };

  const handleConfirmVote = async () => {
    if (!selectedOption) return;
    setShowConfirm(false);
    setVoting(true);
    try {
      const result: any = await TopicApi.vote(topicId, {
        userId,
        optionId: selectedOption,
      });
      if (result.success) {
        setTopic({
          ...(topic as TopicDetailData),
          options: result.options,
          totalVotes: result.totalVotes,
          participants: result.participants,
        });
        setHasVoted(true);
        setVotedOption(selectedOption);
        setVoteFlashMsg('投票成功！');
        setTimeout(() => setVoteFlashMsg(''), 2000);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('已经投过票')) {
        const voteStatus = await TopicApi.getVoteStatus(topicId, userId);
        setHasVoted(voteStatus.hasVoted);
        setVotedOption(voteStatus.optionId);
        await loadData();
      } else {
        setVoteFlashMsg(err.message || '投票失败');
        setTimeout(() => setVoteFlashMsg(''), 2500);
      }
    } finally {
      setVoting(false);
      setSelectedOption(null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      const result = await TopicApi.addComment(topicId, {
        userId,
        nickname,
        text,
      });
      if (topic) {
        const allComments = [...topic.comments, result.comment];
        const recentComments = allComments
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 10);
        setTopic({
          ...topic,
          comments: recentComments,
        });
      }
      setCommentText('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return <div style={styles.statusText}>加载中...</div>;
  }
  if (error || !topic) {
    return (
      <div>
        <button onClick={onBack} style={styles.backBtn}>
          ← 返回看板
        </button>
        <div style={styles.errorBox}>
          {error || '话题不存在'}
          <button onClick={loadData} style={styles.retryBtn}>
            重试
          </button>
        </div>
      </div>
    );
  }

  const totalVotes = topic.totalVotes;

  return (
    <div>
      <button onClick={onBack} style={styles.backBtn}>
        ← 返回看板
      </button>

      <div style={styles.detailHeader}>
        <h1 style={styles.detailTitle}>{topic.title}</h1>
        {topic.description && (
          <p style={styles.detailDescription}>{topic.description}</p>
        )}
        <div style={styles.detailMeta}>
          <span style={styles.metaBadge}>
            👥 {topic.participants} 人参与
          </span>
          <span style={styles.metaBadge}>
            🗳️ {totalVotes} 票
          </span>
          <span style={styles.metaBadge}>
            📅 {formatRelativeTime(topic.createdAt)}创建
          </span>
          {hasVoted && (
            <span style={{ ...styles.metaBadge, background: '#d1fae5', color: '#065f46' }}>
              ✓ 已投票
            </span>
          )}
        </div>
      </div>

      {voteFlashMsg && (
        <div style={styles.flashMsg}>{voteFlashMsg}</div>
      )}

      <div className="detail-layout" style={styles.detailLayout}>
        <div style={styles.voteSection}>
          <h2 style={styles.sectionHeaderText}>
            {hasVoted ? '投票结果' : '投票选项'}
          </h2>
          <div style={styles.voteOptions}>
            {topic.options.map((option) => (
              <VoteOption
                key={option.id}
                option={option}
                selected={selectedOption === option.id}
                voted={hasVoted}
                myVote={votedOption === option.id}
                totalVotes={totalVotes}
                onClick={() => handleOptionClick(option.id)}
              />
            ))}
          </div>
          {!hasVoted && !selectedOption && (
            <p style={styles.voteHint}>
              💡 点击选项进行投票
            </p>
          )}
          {!hasVoted && selectedOption && !showConfirm && (
            <p style={styles.voteHint}>
              再次点击确认投票，或选择其他选项
            </p>
          )}
        </div>

        <div style={styles.commentSection}>
          <h2 style={styles.sectionHeaderText}>
            评论 <span style={styles.commentCountBadge}>{topic.comments.length > 0 ? '最新 ' + topic.comments.length + ' 条' : '暂无评论'}</span>
          </h2>
          <div style={styles.commentList}>
            {topic.comments.length === 0 ? (
              <div style={styles.emptyComments}>
                还没有评论，快来发表第一条吧！
              </div>
            ) : (
              topic.comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
          <form onSubmit={handleSubmitComment} style={styles.commentForm}>
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`以「${nickname}」的身份发表评论...`}
              maxLength={500}
              style={{
                ...styles.commentInput,
                borderColor: commentText ? '#3b82f6' : '#d1d5db',
              }}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              style={{
                ...styles.commentSubmitBtn,
                opacity: !commentText.trim() || submittingComment ? 0.5 : 1,
              }}
            >
              {submittingComment ? '发送中...' : '发送'}
            </button>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="确认投票"
        message={`确认选择「${
          topic.options.find((o) => o.id === selectedOption)?.text || ''
        }」吗？每个用户只能投一次票哦。`}
        onConfirm={handleConfirmVote}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedOption(null);
        }}
      />

      <style>{`
        @media (max-width: 768px) {
          .detail-layout {
            grid-template-columns: 1fr !important;
          }
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statusText: {
    textAlign: 'center',
    padding: 48,
    color: '#9ca3af',
    fontSize: 14,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 16,
    color: '#dc2626',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  detailHeader: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: 24,
    marginBottom: 24,
  },
  detailTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1.3,
  },
  detailDescription: {
    margin: '12px 0 16px 0',
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 1.6,
  },
  detailMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaBadge: {
    background: '#eff6ff',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: 16,
    fontSize: 13,
    fontWeight: 500,
  },
  flashMsg: {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#065f46',
    color: '#ffffff',
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    zIndex: 200,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  detailLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 24,
  },
  voteSection: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: 24,
  },
  sectionHeaderText: {
    margin: 0,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
  },
  voteOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  voteOption: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    border: '1px solid #3b82f6',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 15,
    fontWeight: 500,
    transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  voteOptionText: {
    fontWeight: 600,
  },
  voteOptionMeta: {
    fontSize: 13,
    fontWeight: 500,
  },
  voteHint: {
    marginTop: 12,
    marginBottom: 0,
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  commentSection: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 400,
  },
  commentCountBadge: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: 400,
  },
  commentList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
    maxHeight: 420,
    overflowY: 'auto',
  },
  emptyComments: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: 14,
    border: '1px dashed #e5e7eb',
    borderRadius: 8,
    minHeight: 200,
  },
  commentItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
    border: '1px solid #f3f4f6',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  commentNickname: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  commentTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentText: {
    margin: 0,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  commentForm: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    fontSize: 14,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
  },
  commentSubmitBtn: {
    height: 40,
    padding: '0 20px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 28,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalTitle: {
    margin: 0,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
  },
  modalMessage: {
    margin: 0,
    marginBottom: 24,
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#374151',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
