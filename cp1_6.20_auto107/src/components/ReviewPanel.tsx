import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Paragraph, Comment, OnlineUser } from '../types';
import {
  fetchTranslations,
  fetchComments,
  submitComment,
  updateReviewStatus,
} from '../api/translationApi';
import { useSocket } from '../hooks/useSocket';

interface ReviewPanelProps {
  userId: string;
  userName: string;
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const STATUS_CONFIG = {
  pending: { label: '未校对', color: '#6c757d' },
  reviewed: { label: '已校对', color: '#28a745' },
  disputed: { label: '有异议', color: '#dc3545' },
} as const;

const getRandomColor = (): string => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const userAvatarColor = getRandomColor();

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ userId, userName }) => {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('docId');

  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [commentsMap, setCommentsMap] = useState<Map<number, Comment[]>>(new Map());
  const [commentInputs, setCommentInputs] = useState<Map<number, string>>(new Map());
  const [expandedParagraphs, setExpandedParagraphs] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleNewComment = useCallback((data: { doc_id: string; comment: Comment }) => {
    if (data.doc_id === docId) {
      setCommentsMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.comment.paragraph_index) || [];
        newMap.set(data.comment.paragraph_index, [...existing, data.comment]);
        return newMap;
      });
    }
  }, [docId]);

  const handleReviewStatusUpdated = useCallback(
    (data: { doc_id: string; paragraph_index: number; status: string }) => {
      if (data.doc_id === docId) {
        setParagraphs((prev) =>
          prev.map((p) =>
            p.index === data.paragraph_index
              ? { ...p, review_status: status as 'pending' | 'reviewed' | 'disputed' }
              : p
          )
        );
      }
    },
    [docId]
  );

  const { connect, disconnect, getOnlineUsers } = useSocket(docId ?? undefined, {
    onNewComment: handleNewComment,
    onReviewStatusUpdated: handleReviewStatusUpdated,
    onOnlineUsersList: (users) => setOnlineUsers(users),
    onUserJoined: (_, allUsers) => setOnlineUsers(allUsers),
    onUserLeft: (_, allUsers) => setOnlineUsers(allUsers),
  });

  useEffect(() => {
    if (!docId) return;

    const loadData = async () => {
      try {
        const [translationsRes, commentsRes] = await Promise.all([
          fetchTranslations(docId),
          fetchComments(docId),
        ]);

        setParagraphs(translationsRes.paragraphs);

        const newCommentsMap = new Map<number, Comment[]>();
        commentsRes.comments.forEach((comment) => {
          const existing = newCommentsMap.get(comment.paragraph_index) || [];
          newCommentsMap.set(comment.paragraph_index, [...existing, comment]);
        });
        setCommentsMap(newCommentsMap);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [docId]);

  useEffect(() => {
    if (docId && userId && userName) {
      connect(userId, userName);
    }
    return () => {
      disconnect();
    };
  }, [docId, userId, userName, connect, disconnect]);

  useEffect(() => {
    if (docId) {
      getOnlineUsers();
    }
  }, [docId, getOnlineUsers]);

  const handleCommentInputChange = (paragraphIndex: number, value: string) => {
    setCommentInputs((prev) => {
      const newMap = new Map(prev);
      newMap.set(paragraphIndex, value);
      return newMap;
    });
  };

  const handleSubmitComment = async (paragraphIndex: number) => {
    if (!docId) return;

    const content = commentInputs.get(paragraphIndex)?.trim();
    if (!content) return;

    try {
      const newComment = await submitComment(
        docId,
        paragraphIndex,
        content,
        userName,
        userId
      );

      setCommentsMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(paragraphIndex) || [];
        newMap.set(paragraphIndex, [...existing, newComment]);
        return newMap;
      });

      setCommentInputs((prev) => {
        const newMap = new Map(prev);
        newMap.set(paragraphIndex, '');
        return newMap;
      });
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    paragraphIndex: number
  ) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment(paragraphIndex);
    }
  };

  const handleStatusChange = async (
    paragraphIndex: number,
    status: 'pending' | 'reviewed' | 'disputed'
  ) => {
    if (!docId) return;

    try {
      await updateReviewStatus(docId, paragraphIndex, status);
      setParagraphs((prev) =>
        prev.map((p) =>
          p.index === paragraphIndex ? { ...p, review_status: status } : p
        )
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const toggleParagraphExpanded = (paragraphIndex: number) => {
    setExpandedParagraphs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paragraphIndex)) {
        newSet.delete(paragraphIndex);
      } else {
        newSet.add(paragraphIndex);
      }
      return newSet;
    });
  };

  const copyShareLink = async () => {
    if (!docId) return;

    const url = `${window.location.origin}${window.location.pathname}?docId=${docId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const sortedParagraphs = useMemo(() => {
    return [...paragraphs].sort((a, b) => a.index - b.index);
  }, [paragraphs]);

  if (!docId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        缺少文档ID参数
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 20px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              共 {sortedParagraphs.length} 段
            </span>
            <span style={{ fontSize: '14px', color: '#666' }}>
              已校对: {sortedParagraphs.filter((p) => p.review_status === 'reviewed').length}
            </span>
            <span style={{ fontSize: '14px', color: '#dc3545' }}>
              有异议: {sortedParagraphs.filter((p) => p.review_status === 'disputed').length}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>在线用户:</span>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {onlineUsers.slice(0, 5).map((user) => (
                <motion.div
                  key={user.user_id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  title={user.user_name}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: user.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: '2px solid #fff',
                    marginLeft: '-4px',
                  }}
                >
                  {user.user_name.charAt(0)}
                </motion.div>
              ))}
              {onlineUsers.length > 5 && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '11px',
                    marginLeft: '-4px',
                    border: '2px solid #fff',
                  }}
                >
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyShareLink}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #007bff',
              borderRadius: '6px',
              backgroundColor: copySuccess ? '#28a745' : '#fff',
              color: copySuccess ? '#fff' : '#007bff',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copySuccess ? '已复制!' : '共享链接'}
          </motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sortedParagraphs.map((paragraph, index) => {
          const paragraphComments = commentsMap.get(paragraph.index) || [];
          const isExpanded = expandedParagraphs.has(paragraph.index);
          const statusConfig = STATUS_CONFIG[paragraph.review_status];

          return (
            <motion.div
              key={paragraph.index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              style={{
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#333',
                        background: '#f8f9fa',
                        padding: '4px 10px',
                        borderRadius: '4px',
                      }}
                    >
                      第 {paragraph.index + 1} 段
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: `${statusConfig.color}20`,
                        color: statusConfig.color,
                        fontWeight: 500,
                      }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStatusChange(paragraph.index, 'pending')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: `1px solid ${paragraph.review_status === 'pending' ? '#6c757d' : '#dee2e6'}`,
                        borderRadius: '4px',
                        backgroundColor:
                          paragraph.review_status === 'pending' ? '#6c757d' : '#fff',
                        color: paragraph.review_status === 'pending' ? '#fff' : '#6c757d',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      未校对
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStatusChange(paragraph.index, 'reviewed')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: `1px solid ${paragraph.review_status === 'reviewed' ? '#28a745' : '#dee2e6'}`,
                        borderRadius: '4px',
                        backgroundColor:
                          paragraph.review_status === 'reviewed' ? '#28a745' : '#fff',
                        color: paragraph.review_status === 'reviewed' ? '#fff' : '#28a745',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      已校对
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStatusChange(paragraph.index, 'disputed')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: `1px solid ${paragraph.review_status === 'disputed' ? '#dc3545' : '#dee2e6'}`,
                        borderRadius: '4px',
                        backgroundColor:
                          paragraph.review_status === 'disputed' ? '#dc3545' : '#fff',
                        color: paragraph.review_status === 'disputed' ? '#fff' : '#dc3545',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      有异议
                    </motion.button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginBottom: '8px',
                        fontWeight: 500,
                      }}
                    >
                      原文
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.8,
                        color: '#333',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        minHeight: '60px',
                      }}
                    >
                      {paragraph.original}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#007bff',
                        marginBottom: '8px',
                        fontWeight: 500,
                      }}
                    >
                      译文
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.8,
                        color: '#333',
                        padding: '12px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '6px',
                        minHeight: '60px',
                      }}
                    >
                      {paragraph.translation}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e9ecef',
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleParagraphExpanded(paragraph.index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                      评论 ({paragraphComments.length})
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      ▼
                    </motion.span>
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '0 20px 20px',
                        backgroundColor: '#fafbfc',
                        borderTop: '1px solid #e9ecef',
                      }}
                    >
                      {paragraphComments.length > 0 && (
                        <div style={{ marginBottom: '16px', paddingTop: '16px' }}>
                          <div
                            style={{
                              position: 'relative',
                              paddingLeft: '20px',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left: '17px',
                                top: '0',
                                bottom: '0',
                                width: '2px',
                                backgroundColor: '#e9ecef',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <AnimatePresence>
                                {paragraphComments.map((comment, commentIndex) => (
                                  <motion.div
                                    key={comment.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: commentIndex * 0.05,
                                    }}
                                    whileHover={{ y: -2 }}
                                    style={{
                                      display: 'flex',
                                      gap: '12px',
                                      position: 'relative',
                                      transition: 'transform 0.2s',
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: '-20px',
                                        top: '16px',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: comment.avatar_color,
                                        border: '2px solid #fff',
                                        boxShadow: '0 0 0 2px #e9ecef',
                                      }}
                                    />
                                    <div
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        backgroundColor: comment.avatar_color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {comment.user_name.charAt(0)}
                                    </div>
                                    <div
                                      style={{
                                        flex: 1,
                                        background: '#fff',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          marginBottom: '6px',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#333',
                                          }}
                                        >
                                          {comment.user_name}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#999' }}>
                                          {formatTime(comment.created_at)}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '14px',
                                          lineHeight: 1.6,
                                          color: '#555',
                                        }}
                                      >
                                        {comment.content}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          paddingTop: paragraphComments.length > 0 ? '16px' : '0',
                          borderTop: paragraphComments.length > 0 ? '1px solid #e9ecef' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: userAvatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {userName.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <textarea
                            value={commentInputs.get(paragraph.index) || ''}
                            onChange={(e) =>
                              handleCommentInputChange(paragraph.index, e.target.value)
                            }
                            onKeyDown={(e) => handleKeyDown(e, paragraph.index)}
                            placeholder="输入评论... (Ctrl+Enter 提交)"
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              padding: '10px 12px',
                              fontSize: '14px',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              resize: 'vertical',
                              outline: 'none',
                              fontFamily: 'inherit',
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#007bff';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#dee2e6';
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '8px',
                            }}
                          >
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              按 Ctrl+Enter 快速提交
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSubmitComment(paragraph.index)}
                              disabled={!commentInputs.get(paragraph.index)?.trim()}
                              style={{
                                padding: '8px 20px',
                                fontSize: '14px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: commentInputs.get(paragraph.index)?.trim()
                                  ? '#007bff'
                                  : '#dee2e6',
                                color: commentInputs.get(paragraph.index)?.trim()
                                  ? '#fff'
                                  : '#999',
                                cursor: commentInputs.get(paragraph.index)?.trim()
                                  ? 'pointer'
                                  : 'not-allowed',
                                transition: 'all 0.2s',
                              }}
                            >
                              提交
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewPanel;
