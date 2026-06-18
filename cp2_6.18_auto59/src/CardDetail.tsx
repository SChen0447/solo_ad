import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { Card, CATEGORY_COLORS } from './types';
import { cardService } from './services/cardService';
import './CardDetail.css';

interface CardDetailProps {
  cardId: string;
  allCards: Card[];
  onBack: () => void;
  onDelete: (cardId: string) => void;
  onUpdate: (card: Card) => void;
}

const CardDetail: React.FC<CardDetailProps> = ({
  cardId,
  allCards,
  onBack,
  onDelete,
  onUpdate
}) => {
  const [card, setCard] = useState<Card | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDifficulty, setEditDifficulty] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const data = await cardService.getCard(cardId);
        setCard(data);
        setEditTitle(data.title);
        setEditCategory(data.category);
        setEditContent(data.content);
        setEditDifficulty(data.difficulty);
      } catch (err) {
        setError('加载卡片失败');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [cardId]);

  const relatedCards = useMemo(() => {
    if (!card) return [];
    return allCards
      .filter(c => c.category === card.category && c.id !== card.id)
      .slice(0, 5);
  }, [card, allCards]);

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    try {
      const updated = await cardService.updateCard(cardId, {
        title: editTitle,
        category: editCategory,
        content: editContent,
        difficulty: editDifficulty
      });
      setCard(updated);
      onUpdate(updated);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('保存失败');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这张卡片吗？')) {
      try {
        await cardService.deleteCard(cardId);
        onDelete(cardId);
      } catch (err) {
        setError('删除失败');
      }
    }
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="detail-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={star <= difficulty ? '#f59e0b' : 'none'}
            stroke={star <= difficulty ? '#f59e0b' : '#d1d5db'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  const renderedContent = useMemo((): string => {
    if (isEditing) return '';
    if (!card) return '';
    return marked.parse(card.content) as string;
  }, [card, isEditing]);

  const renderedEditPreview = useMemo((): string => {
    if (!isEditing) return '';
    return marked.parse(editContent) as string;
  }, [editContent, isEditing]);

  if (loading) {
    return (
      <div className="card-detail">
        <div className="detail-loading">加载中...</div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="card-detail">
        <div className="detail-error">{error}</div>
        <button onClick={onBack}>返回</button>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="card-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回
        </button>

        <div className="detail-actions">
          {isEditing ? (
            <>
              <button className="action-btn save-btn" onClick={handleSave}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                保存
              </button>
              <button className="action-btn cancel-btn" onClick={() => {
                setIsEditing(false);
                setEditTitle(card.title);
                setEditCategory(card.category);
                setEditContent(card.content);
                setEditDifficulty(card.difficulty);
                setError('');
              }}>
                取消
              </button>
            </>
          ) : (
            <>
              <button className="action-btn edit-btn" onClick={() => setIsEditing(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                编辑
              </button>
              <button className="action-btn delete-btn" onClick={handleDelete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                删除
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-body">
        <div className="detail-main">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  placeholder="输入卡片标题"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>分类</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="前端">前端</option>
                    <option value="后端">后端</option>
                    <option value="工具">工具</option>
                    <option value="踩坑">踩坑</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>难度</label>
                  <div className="difficulty-selector">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="star-btn"
                        onClick={() => setEditDifficulty(star)}
                      >
                        <svg
                          width="24"
                          height="24"
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
              </div>

              <div className="form-group">
                <label>内容 (Markdown)</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="form-textarea"
                  placeholder="支持 Markdown 格式..."
                  rows={12}
                />
              </div>

              <div className="form-group">
                <label>实时预览</label>
                <div
                  className="markdown-preview"
                  dangerouslySetInnerHTML={{ __html: renderedEditPreview || '' }}
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className="detail-category"
                style={{ backgroundColor: CATEGORY_COLORS[card.category] || '#6b7280' }}
              >
                {card.category}
              </div>
              <h1 className="detail-title">{card.title}</h1>
              {renderStars(card.difficulty)}
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            </>
          )}
        </div>

        {!isEditing && relatedCards.length > 0 && (
          <aside className="detail-sidebar">
            <h3 className="sidebar-title">相关推荐</h3>
            <div className="related-list">
              {relatedCards.map((related) => (
                <div
                  key={related.id}
                  className="related-item"
                  onClick={() => {
                    window.scrollTo(0, 0);
                    setCard(related);
                    setEditTitle(related.title);
                    setEditCategory(related.category);
                    setEditContent(related.content);
                    setEditDifficulty(related.difficulty);
                    window.history.pushState({}, '', `#/card/${related.id}`);
                  }}
                >
                  <div
                    className="related-dot"
                    style={{ backgroundColor: CATEGORY_COLORS[related.category] }}
                  />
                  <span className="related-title">{related.title}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default CardDetail;
