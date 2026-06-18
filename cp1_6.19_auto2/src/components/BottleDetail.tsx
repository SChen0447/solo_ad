import React, { useState, useCallback } from 'react';
import { useStore } from '../store';

export default function BottleDetail() {
  const {
    cards,
    selectedCardId,
    isMobile,
    showDetail,
    likeCard,
    dislikeCard,
    selectCard,
    setShowDetail
  } = useStore();

  const [animatingLike, setAnimatingLike] = useState(false);
  const [animatingDislike, setAnimatingDislike] = useState(false);

  const selectedCard = cards.find(card => card.id === selectedCardId);

  const handleLike = useCallback(() => {
    if (!selectedCardId) return;
    setAnimatingLike(true);
    likeCard(selectedCardId);
    setTimeout(() => setAnimatingLike(false), 200);
  }, [selectedCardId, likeCard]);

  const handleDislike = useCallback(() => {
    if (!selectedCardId) return;
    setAnimatingDislike(true);
    dislikeCard(selectedCardId);
    setTimeout(() => setAnimatingDislike(false), 200);
  }, [selectedCardId, dislikeCard]);

  const handleClose = useCallback(() => {
    if (isMobile) {
      setShowDetail(false);
    }
    selectCard(null);
  }, [isMobile, selectCard, setShowDetail]);

  if (!selectedCard) {
    return (
      <div className="bottle-detail empty">
        <div className="empty-state">
          <div className="empty-emoji">🌊</div>
          <p>点击左侧漂流瓶查看详情</p>
          <p className="empty-hint">每一个灵感都值得被看见</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bottle-detail ${isMobile && showDetail ? 'drawer-enter' : ''}`}
    >
      {isMobile && (
        <button className="close-btn" onClick={handleClose}>
          ✕
        </button>
      )}
      <div className="detail-header">
        <span className="detail-emoji">{selectedCard.emoji}</span>
        <h2 className="detail-title">{selectedCard.title}</h2>
      </div>
      <div className="detail-content">
        <p>{selectedCard.content}</p>
      </div>
      <div className="detail-actions">
        <button
          className={`action-btn like-btn ${animatingLike ? 'pulse' : ''}`}
          onClick={handleLike}
        >
          <span className="btn-icon">👍</span>
          <span className="btn-text">点赞</span>
          <span className="btn-count">{selectedCard.likes}</span>
        </button>
        <button
          className={`action-btn dislike-btn ${animatingDislike ? 'pulse' : ''}`}
          onClick={handleDislike}
        >
          <span className="btn-icon">👎</span>
          <span className="btn-text">踩</span>
          <span className="btn-count">{selectedCard.dislikes}</span>
        </button>
      </div>
      <div className="likers-section">
        <h4 className="likers-title">
          点赞者 ({selectedCard.likedBy.length})
        </h4>
        <div className="likers-list">
          {selectedCard.likedBy.length > 0 ? (
            selectedCard.likedBy.map(user => (
              <span key={user.id} className="liker-tag">
                {user.nickname}
              </span>
            ))
          ) : (
            <span className="no-likers">还没有人点赞，快来第一个点赞吧！</span>
          )}
        </div>
      </div>
    </div>
  );
}
