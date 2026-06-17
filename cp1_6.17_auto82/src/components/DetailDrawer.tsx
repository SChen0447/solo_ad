import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Proposal, Comment, User } from '../dataFetcher';

interface DetailDrawerProps {
  isOpen: boolean;
  proposal: Proposal | null;
  currentUser: User | null;
  onClose: () => void;
  onAddComment: (proposalId: string, comment: Comment) => void;
}

const MAX_COMMENT_LENGTH = 200;
const WARNING_THRESHOLD = 160;

export default function DetailDrawer({
  isOpen,
  proposal,
  currentUser,
  onClose,
  onAddComment,
}: DetailDrawerProps) {
  const [commentText, setCommentText] = useState('');

  const charCount = commentText.length;
  const progress = Math.min((charCount / MAX_COMMENT_LENGTH) * 100, 100);
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;
  const isWarning = charCount >= WARNING_THRESHOLD && !isOverLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || !currentUser || commentText.trim() === '' || isOverLimit)
      return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: commentText.trim(),
      createdAt: Date.now(),
    };

    onAddComment(proposal.id, newComment);
    setCommentText('');
  };

  const sortedComments = proposal
    ? [...proposal.comments].sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <AnimatePresence>
      {isOpen && proposal && (
        <>
          <motion.div
            className="drawer-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className="detail-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="drawer-header">
              <div>
                <span className="card-category-badge">{proposal.category}</span>
                <h2 className="drawer-title">{proposal.title}</h2>
                <div className="card-creator drawer-creator">
                  <div
                    className="avatar"
                    style={{ backgroundColor: proposal.creator.avatar }}
                  >
                    {proposal.creator.name.charAt(0)}
                  </div>
                  <span className="creator-name">
                    {proposal.creator.name} 发起
                  </span>
                </div>
              </div>
              <button className="close-btn" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h3 className="section-title">
                  <i className="fas fa-file-alt"></i> 提案详情
                </h3>
                <p className="drawer-description">{proposal.description}</p>
              </section>

              <section className="drawer-section">
                <h3 className="section-title">
                  <i className="fas fa-comments"></i> 评论 (
                  {sortedComments.length})
                </h3>

                <form className="comment-form" onSubmit={handleSubmit}>
                  <textarea
                    className="comment-input"
                    placeholder="写下你的想法..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="progress-container">
                    <div
                      className={`progress-bar ${
                        isOverLimit
                          ? 'danger'
                          : isWarning
                          ? 'warning'
                          : 'normal'
                      }`}
                    >
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span
                      className={`char-count ${
                        isOverLimit
                          ? 'danger'
                          : isWarning
                          ? 'warning'
                          : 'normal'
                      }`}
                    >
                      {charCount}/{MAX_COMMENT_LENGTH}
                    </span>
                  </div>
                  {isOverLimit && (
                    <div className="error-tip">
                      <i className="fas fa-exclamation-circle"></i> 评论内容超过200字限制
                    </div>
                  )}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={
                      commentText.trim() === '' ||
                      isOverLimit ||
                      !currentUser
                    }
                  >
                    <i className="fas fa-paper-plane"></i> 发表评论
                  </button>
                </form>

                <div className="comments-list">
                  {sortedComments.length === 0 ? (
                    <div className="empty-comments">
                      <i className="fas fa-comment-slash"></i>
                      <p>暂无评论，快来抢沙发！</p>
                    </div>
                  ) : (
                    sortedComments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        className="comment-item"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className="avatar comment-avatar"
                          style={{ backgroundColor: comment.userAvatar }}
                        >
                          {comment.userName.charAt(0)}
                        </div>
                        <div className="comment-content">
                          <div className="comment-meta">
                            <span className="comment-user">
                              {comment.userName}
                            </span>
                            <span className="comment-time">
                              {new Date(
                                comment.createdAt
                              ).toLocaleDateString('zh-CN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="comment-text">{comment.content}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
