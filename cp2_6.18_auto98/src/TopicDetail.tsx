import { useState, useEffect, useCallback } from 'react';
import { TopicApi, Topic, VoteOption, Comment } from './TopicApi';

interface TopicDetailProps {
  topicId: string;
  userId: string;
  nickname: string;
  onBack: () => void;
}

const colorPalette = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};

const formatExactTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getRandomColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

const getTotalVotes = (options: VoteOption[]): number => {
  return options.reduce((sum, opt) => sum + opt.votes, 0);
};

function TopicDetail({ topicId, userId, nickname, onBack }: TopicDetailProps) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showVoteConfirm, setShowVoteConfirm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteError, setVoteError] = useState('');

  const fetchTopic = useCallback(async () => {
    try {
      const data = await TopicApi.getTopic(topicId);
      setTopic(data);
      setHasVoted(data.voters.includes(userId));
    } catch (error) {
      console.error('Failed to fetch topic:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId, userId]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handleOptionClick = (optionId: string) => {
    if (hasVoted) return;
    setSelectedOption(optionId);
    setShowVoteConfirm(true);
    setVoteError('');
  };

  const handleConfirmVote = async () => {
    if (!selectedOption || !topic) return;
    
    setIsVoting(true);
    try {
      await TopicApi.vote(topicId, selectedOption, userId);
      setShowVoteConfirm(false);
      setSelectedOption(null);
      setHasVoted(true);
      fetchTopic();
    } catch (error: any) {
      setVoteError(error.message || '投票失败');
      if (error.message === 'User has already voted') {
        setHasVoted(true);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleCancelVote = () => {
    setShowVoteConfirm(false);
    setSelectedOption(null);
    setVoteError('');
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !topic) return;
    
    setIsSubmittingComment(true);
    try {
      await TopicApi.addComment(topicId, commentText.trim(), nickname);
      setCommentText('');
      fetchTopic();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
        加载中...
      </div>
    );
  }

  if (!topic) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
        话题不存在
      </div>
    );
  }

  const totalVotes = getTotalVotes(topic.options);
  const recentComments = [...topic.comments].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  const participantCount = topic.voters.length;

  return (
    <div className="fade-in">
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
          {topic.title}
        </h1>
        <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '16px', lineHeight: '1.7' }}>
          {topic.description}
        </p>
        <div style={{
          display: 'flex',
          gap: '24px',
          fontSize: '13px',
          color: '#6b7280',
          flexWrap: 'wrap',
        }}>
          <span>创建于 {formatExactTime(topic.createdAt)}</span>
          <span>已有 {participantCount} 人参与投票</span>
          <span>{topic.comments.length} 条评论</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
          }}>
            投票选项
            {hasVoted && (
              <span style={{
                fontSize: '13px',
                fontWeight: 'normal',
                color: '#10b981',
                marginLeft: '12px',
              }}>
                （您已投票）
              </span>
            )}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topic.options.map((option) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100).toFixed(1) : '0';
              const isSelected = selectedOption === option.id;
              
              return (
                <div key={option.id}>
                  <button
                    onClick={() => handleOptionClick(option.id)}
                    disabled={hasVoted}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#3b82f6' : '#eff6ff',
                      color: isSelected ? '#ffffff' : '#1f2937',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#3b82f6'}`,
                      padding: '0 16px',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s ease',
                      cursor: hasVoted ? 'not-allowed' : 'pointer',
                      opacity: hasVoted && !isSelected ? 0.7 : 1,
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
                    <span style={{ fontWeight: '500' }}>{option.text}</span>
                    <span style={{
                      fontSize: '12px',
                      color: isSelected ? '#bfdbfe' : '#6b7280',
                    }}>
                      {option.votes}票 · {percentage}%
                    </span>
                  </button>
                  {totalVotes > 0 && (
                    <div style={{
                      marginTop: '6px',
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: '#f3f4f6',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease-out',
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'center',
          }}>
            总投票数：{totalVotes} 票
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '500px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
          }}>
            评论区
            <span style={{
              fontSize: '13px',
              fontWeight: 'normal',
              color: '#6b7280',
              marginLeft: '8px',
            }}>
              （最近10条）
            </span>
          </h2>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '400px',
          }}>
            {recentComments.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#9ca3af',
                padding: '40px 20px',
                fontSize: '14px',
              }}>
                暂无评论，快来发表第一条评论吧！
              </div>
            ) : (
              recentComments.map((comment) => (
                <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: getRandomColor(comment.author),
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}>
                    {comment.author.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}>
                        {comment.author}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                      }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: '#4b5563',
                      lineHeight: '1.6',
                      wordBreak: 'break-word',
                    }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="发表评论..."
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                padding: '0 12px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={isSubmittingComment || !commentText.trim()}
              style={{
                padding: '0 20px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease',
                opacity: (isSubmittingComment || !commentText.trim()) ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmittingComment && commentText.trim()) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              {isSubmittingComment ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>

      {showVoteConfirm && (
        <div style={{
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
        }} onClick={handleCancelVote}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '12px',
            }}>
              确认投票
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
            }}>
              您确定要投票给
              <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                「{topic.options.find(o => o.id === selectedOption)?.text}」
              </span>
              吗？每个话题只能投票一次。
            </p>
            {voteError && (
              <p style={{
                fontSize: '13px',
                color: '#ef4444',
                marginBottom: '16px',
                padding: '10px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
              }}>
                {voteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelVote}
                disabled={isVoting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={isVoting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease',
                  opacity: isVoting ? 0.5 : 1,
                }}
              >
                {isVoting ? '投票中...' : '确认投票'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TopicDetail;
