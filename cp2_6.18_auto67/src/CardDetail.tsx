import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Card, CATEGORY_COLORS } from './types';
import { cardService } from './services/cardService';

interface CardDetailProps {
  cardId: string;
  onBack: () => void;
  onCardUpdate?: (card: Card) => void;
  onCardDelete?: (cardId: string) => void;
}

const CardDetail: React.FC<CardDetailProps> = ({
  cardId,
  onBack,
  onCardUpdate,
  onCardDelete
}) => {
  const [card, setCard] = useState<Card | null>(null);
  const [relatedCards, setRelatedCards] = useState<Card[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficulty, setEditDifficulty] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCard = async () => {
      setIsLoading(true);
      try {
        const [cardData, relatedData] = await Promise.all([
          cardService.getCard(cardId),
          cardService.getRelatedCards(cardId)
        ]);
        setCard(cardData);
        setRelatedCards(relatedData);
        setEditTitle(cardData.title);
        setEditContent(cardData.content);
        setEditCategory(cardData.category);
        setEditDifficulty(cardData.difficulty);
      } catch (error) {
        console.error('获取卡片详情失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCard();
  }, [cardId]);

  const handleSave = async () => {
    if (!card) return;
    try {
      const updated = await cardService.updateCard(card.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        difficulty: editDifficulty
      });
      setCard(updated);
      setIsEditing(false);
      if (onCardUpdate) onCardUpdate(updated);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!window.confirm('确定要删除这张卡片吗？')) return;
    try {
      await cardService.deleteCard(card.id);
      if (onCardDelete) onCardDelete(card.id);
      onBack();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleCancel = () => {
    if (card) {
      setEditTitle(card.title);
      setEditContent(card.content);
      setEditCategory(card.category);
      setEditDifficulty(card.difficulty);
    }
    setIsEditing(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="star-rating-small">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            fill={star <= rating ? '#f59e0b' : 'none'}
            stroke={star <= rating ? '#f59e0b' : '#d1d5db'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="detail-container">
        <div className="detail-loading">加载中...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="detail-container">
        <div className="detail-error">卡片不存在</div>
        <button className="back-btn" onClick={onBack}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>
        <div className="detail-actions">
          {isEditing ? (
            <>
              <button className="action-btn save-btn" onClick={handleSave}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                保存
              </button>
              <button className="action-btn cancel-btn" onClick={handleCancel}>
                取消
              </button>
            </>
          ) : (
            <>
              <button className="action-btn edit-btn" onClick={() => setIsEditing(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                编辑
              </button>
              <button className="action-btn delete-btn" onClick={handleDelete}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          {isEditing ? (
            <div className="edit-form">
              <input
                type="text"
                className="edit-title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="卡片标题"
              />
              <div className="edit-meta">
                <select
                  className="edit-category-select"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  <option value="前端">前端</option>
                  <option value="后端">后端</option>
                  <option value="工具">工具</option>
                  <option value="踩坑">踩坑</option>
                </select>
                <div className="edit-difficulty">
                  <span>难度：</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="star-edit-btn"
                      onClick={() => setEditDifficulty(star)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={star <= editDifficulty ? '#f59e0b' : 'none'}
                        stroke={star <= editDifficulty ? '#f59e0b' : '#d1d5db'}
                        strokeWidth="2"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              <div className="edit-content-area">
                <div className="edit-textarea-wrap">
                  <label>Markdown 编辑</label>
                  <textarea
                    className="edit-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="支持 Markdown 格式..."
                  />
                </div>
                <div className="edit-preview-wrap">
                  <label>实时预览</label>
                  <div
                    className="markdown-preview"
                    dangerouslySetInnerHTML={{ __html: marked.parse(editContent) as string }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="card-detail-view">
              <div className="detail-meta">
                <span
                  className="detail-category-tag"
                  style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#9ca3af' }}
                >
                  {card.category}
                </span>
                {renderStars(card.difficulty)}
              </div>
              <h1 className="detail-title">{card.title}</h1>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(card.content) as string }}
              />
            </div>
          )}
        </div>

        {relatedCards.length > 0 && (
          <div className="detail-sidebar">
            <h3 className="sidebar-title">同类推荐</h3>
            <div className="related-cards">
              {relatedCards.map((related) => (
                <div
                  key={related.id}
                  className="related-card-item"
                  onClick={() => {
                    setCard(related);
                    setEditTitle(related.title);
                    setEditContent(related.content);
                    setEditCategory(related.category);
                    setEditDifficulty(related.difficulty);
                    setIsEditing(false);
                    window.history.pushState({}, '', `#/card/${related.id}`);
                  }}
                  style={{ borderLeftColor: CATEGORY_COLORS[related.category] || '#9ca3af' }}
                >
                  <h4 className="related-card-title">{related.title}</h4>
                  <div
                    className="related-card-category"
                    style={{ color: CATEGORY_COLORS[related.category] || '#9ca3af' }}
                  >
                    {related.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardDetail;
