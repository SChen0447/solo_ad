import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore, categoryLabels, categoryColor } from '../dataStore';
import { voteEngine } from '../VoteEngine';

const EMOJIS = ['😀', '😍', '🤔', '👍', '🎉', '🔥', '💡', '❤️', '👏', '🌟', '😊', '🚀'];

const CreativeDetail: React.FC = function CreativeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const getCreativeById = useDataStore((state) => state.getCreativeById);
  const addComment = useDataStore((state) => state.addComment);
  const toggleVote = useDataStore((state) => state.toggleVote);
  const hasVoted = useDataStore((state) => state.hasVoted);
  const currentUserId = useDataStore((state) => state.currentUserId);
  const currentUserName = useDataStore((state) => state.currentUserName);

  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVotingAnimating, setIsVotingAnimating] = useState(false);
  const [interested, setInterested] = useState(false);

  const creative = id ? getCreativeById(id) : undefined;
  const userHasVoted = id ? hasVoted(id, currentUserId) : false;

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [creative?.comments.length]);

  if (!creative) {
    return (
      <div className="detail-container">
        <div className="not-found">
          <h2>创意不存在</h2>
          <button onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  const handleVote = () => {
    setIsVotingAnimating(true);
    toggleVote(creative.id, currentUserId);
    setTimeout(() => setIsVotingAnimating(false), 200);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment({
      creativeId: creative.id,
      userId: currentUserId,
      userName: currentUserName,
      content: commentText.trim(),
    });
    setCommentText('');
  };

  const handleEmojiClick = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleInterested = () => {
    setInterested(!interested);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="detail-container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回
      </button>

      <div className="detail-header">
        <span
          className="category-tag"
          style={{ backgroundColor: categoryColor[creative.category] + '20', color: categoryColor[creative.category] }}
        >
          {categoryLabels[creative.category]}
        </span>
        <h1 className="detail-title">{creative.title}</h1>
        <div className="detail-meta">
          <span>作者：{creative.authorName}</span>
          <span>发布于：{formatTime(creative.createdAt)}</span>
        </div>
      </div>

      <div className="detail-description">
        <p>{creative.description}</p>
      </div>

      <div className="detail-actions">
        <button
          className={`vote-button large ${userHasVoted ? 'voted' : ''} ${isVotingAnimating ? 'animating' : ''}`}
          onClick={handleVote}
        >
          <svg
            className="heart-icon"
            viewBox="0 0 24 24"
            fill={userHasVoted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{voteEngine.formatVoteCount(creative.votes)}</span>
        </button>

        <button
          className={`interested-button ${interested ? 'interested' : ''}`}
          onClick={handleInterested}
        >
          <span className="icon">{interested ? '✓' : '+'}</span>
          {interested ? '已关注' : '我也想做'}
        </button>
      </div>

      <div className="comments-section">
        <h3>💬 评论 ({creative.comments.length})</h3>

        <div className="comments-list">
          {creative.comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{comment.userName}</span>
                  <span className="comment-time">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))}
          {creative.comments.length === 0 && (
            <div className="comments-empty">
              暂无评论，来发表第一条评论吧！
            </div>
          )}
          <div ref={commentsEndRef} />
        </div>

        <form className="comment-form" onSubmit={handleSubmitComment}>
          <div className="emoji-picker-wrapper">
            <button
              type="button"
              className="emoji-toggle"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的想法..."
            className="comment-input"
          />
          <button
            type="submit"
            className="comment-submit"
            disabled={!commentText.trim()}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreativeDetail;
