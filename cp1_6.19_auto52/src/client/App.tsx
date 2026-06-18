import React, { useState, useEffect, useCallback } from 'react';
import CardWall from './CardWall';
import NewCardModal from './NewCardModal';
import VoteComment from './VoteComment';
import { fetchCards, createCard, voteCard, addComment } from './api';
import type { Card, SortType, Comment } from './types';

const styles = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f7fa;
  color: #4a5568;
  min-height: 100vh;
}

.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  position: relative;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.add-card-btn {
  background-color: #ed8936;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-card-btn:hover {
  background-color: #dd6b20;
  transform: translateY(-1px);
}

.add-card-btn:active {
  transform: translateY(0);
}

.card-wall {
  width: 100%;
}

.sort-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.sort-btn {
  padding: 8px 20px;
  border: 2px solid #e2e8f0;
  background-color: white;
  color: #4a5568;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  border-color: #cbd5e0;
}

.sort-btn.active {
  background-color: #ed8936;
  border-color: #ed8936;
  color: white;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.cards-grid.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.vote-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: #f7fafc;
  color: #ed8936;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  min-width: 32px;
  text-align: center;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 10px;
  margin-right: 40px;
  line-height: 1.4;
}

.card-content {
  font-size: 14px;
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 16px;
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #cbd5e0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 10px;
  border-radius: 6px;
}

.vote-btn:hover:not(.voted):not(:disabled) {
  color: #ed8936;
  background-color: #fffaf0;
}

.vote-btn.voted {
  color: #ed8936;
  cursor: default;
  animation: votePop 0.2s ease;
}

.vote-btn:disabled {
  cursor: not-allowed;
}

@keyframes votePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.vote-icon {
  font-size: 12px;
}

.comment-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #a0aec0;
  font-size: 13px;
}

.comment-icon {
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeInOverlay 0.3s ease;
}

@keyframes fadeInOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: white;
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  color: #a0aec0;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #4a5568;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #2d3748;
  transition: border-color 0.3s ease;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #ed8936;
}

.form-group input:disabled,
.form-group textarea:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.char-count {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #a0aec0;
}

.error-message {
  background-color: #fed7d7;
  color: #c53030;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background-color: #ed8936;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: #dd6b20;
}

.submit-btn:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}

.detail-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 500;
  animation: fadeInOverlay 0.3s ease;
}

.detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 40%;
  height: 100%;
  background-color: white;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  z-index: 600;
  overflow-y: auto;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.detail-panel-header {
  position: sticky;
  top: 0;
  background-color: white;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.detail-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #a0aec0;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s ease;
}

.detail-close-btn:hover {
  color: #4a5568;
}

.detail-panel-body {
  padding: 24px;
}

.detail-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 12px;
  line-height: 1.4;
}

.detail-time {
  font-size: 13px;
  color: #a0aec0;
  margin-bottom: 20px;
}

.detail-content {
  font-size: 15px;
  line-height: 1.8;
  color: #4a5568;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f2f5;
}

.vote-comment-section {
  margin-top: 20px;
}

.vote-section {
  margin-bottom: 24px;
}

.vote-btn-large {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #cbd5e0;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.vote-btn-large:hover:not(.voted):not(:disabled) {
  border-color: #ed8936;
  color: #ed8936;
  background-color: #fffaf0;
}

.vote-btn-large.voted {
  background-color: #fffaf0;
  border-color: #ed8936;
  color: #ed8936;
  cursor: default;
  animation: votePop 0.2s ease;
}

.vote-btn-large:disabled {
  cursor: not-allowed;
}

.vote-icon-large {
  font-size: 14px;
}

.vote-count {
  margin-left: auto;
  background-color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  min-width: 28px;
  text-align: center;
}

.comments-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.comments-list {
  margin-bottom: 24px;
}

.no-comments {
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
  padding: 20px 0;
}

.comment-item {
  padding: 14px 0;
  border-bottom: 1px solid #f7fafc;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: #2d3748;
}

.comment-time {
  font-size: 12px;
  color: #a0aec0;
}

.comment-content {
  font-size: 14px;
  line-height: 1.6;
  color: #4a5568;
}

.comment-form {
  border-top: 1px solid #f0f2f5;
  padding-top: 20px;
}

.comment-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #2d3748;
  resize: vertical;
  transition: border-color 0.3s ease;
  margin-bottom: 10px;
}

.comment-input:focus {
  outline: none;
  border-color: #ed8936;
}

.comment-input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.comment-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-submit-btn {
  padding: 8px 20px;
  background-color: #ed8936;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-submit-btn:hover:not(:disabled) {
  background-color: #dd6b20;
}

.comment-submit-btn:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #a0aec0;
  font-size: 16px;
}

@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .detail-panel {
    width: 60%;
  }
}

@media (max-width: 640px) {
  .app {
    padding: 16px;
  }
  
  .app-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .app-title {
    font-size: 22px;
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .detail-panel {
    width: 100%;
  }
  
  .modal-content {
    padding: 24px 20px;
    margin: 16px;
  }
}
`;

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [votedCards, setVotedCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchCards();
      setCards(data);
    } catch (error) {
      console.error('加载卡片失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const sortedCards = [...cards].sort((a, b) => {
    if (sortType === 'hot') {
      return b.votes - a.votes;
    }
    return b.createdAt - a.createdAt;
  });

  const handleSortChange = (sort: SortType) => {
    if (sort !== sortType) {
      setIsAnimating(true);
      setSortType(sort);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
  };

  const handleCloseDetail = () => {
    setSelectedCard(null);
  };

  const handleVote = useCallback(async (cardId: string) => {
    if (votedCards.has(cardId)) return;

    try {
      const result = await voteCard(cardId);
      setVotedCards(new Set([...votedCards, cardId]));
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === cardId ? { ...card, votes: result.votes } : card
        )
      );
      if (selectedCard?.id === cardId) {
        setSelectedCard({ ...selectedCard, votes: result.votes });
      }
    } catch (error) {
      console.error('投票失败:', error);
    }
  }, [votedCards, selectedCard]);

  const handleCreateCard = async (title: string, content: string) => {
    const newCard = await createCard(title, content);
    setCards((prevCards) => [newCard, ...prevCards]);
  };

  const handleAddComment = async (cardId: string, content: string): Promise<Comment> => {
    const newComment = await addComment(cardId, content);
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? { ...card, comments: [...card.comments, newComment] }
          : card
      )
    );
    if (selectedCard?.id === cardId) {
      setSelectedCard({
        ...selectedCard,
        comments: [...selectedCard.comments, newComment],
      });
    }
    return newComment;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">匿名心声墙</h1>
          <button className="add-card-btn" onClick={() => setIsModalOpen(true)}>
            + 发布心声
          </button>
        </header>

        {isLoading ? (
          <div className="loading">加载中...</div>
        ) : (
          <CardWall
            cards={sortedCards}
            sortType={sortType}
            onSortChange={handleSortChange}
            onCardClick={handleCardClick}
            onVote={handleVote}
            votedCards={votedCards}
            isAnimating={isAnimating}
          />
        )}

        <NewCardModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateCard}
        />

        {selectedCard && (
          <>
            <div className="detail-panel-overlay" onClick={handleCloseDetail} />
            <div className="detail-panel">
              <div className="detail-panel-header">
                <h2 className="detail-title" style={{ marginBottom: 0, fontSize: '18px' }}>
                  详情
                </h2>
                <button className="detail-close-btn" onClick={handleCloseDetail}>
                  ×
                </button>
              </div>
              <div className="detail-panel-body">
                <h2 className="detail-title">{selectedCard.title}</h2>
                <p className="detail-time">
                  {new Date(selectedCard.createdAt).toLocaleString('zh-CN')}
                </p>
                <p className="detail-content">{selectedCard.content}</p>
                <VoteComment
                  card={selectedCard}
                  onVote={handleVote}
                  onAddComment={handleAddComment}
                  hasVoted={votedCards.has(selectedCard.id)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default App;
