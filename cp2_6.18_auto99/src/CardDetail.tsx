import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Card, CATEGORY_COLORS, Category, CATEGORIES } from './types';
import { getCard, updateCard, deleteCard, getRecommendations } from './services/cardService';
import { toggleFavorite } from './services/favoriteService';

interface CardDetailProps {
  cardId: string;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (card: Card) => void;
}

const CardDetail: React.FC<CardDetailProps> = ({ cardId, onBack, onDelete, onUpdate }) => {
  const [card, setCard] = useState<Card | null>(null);
  const [recommendations, setRecommendations] = useState<Card[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('前端');
  const [editDifficulty, setEditDifficulty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardData, recData] = await Promise.all([
          getCard(cardId),
          getRecommendations(cardId)
        ]);
        setCard(cardData);
        setRecommendations(recData);
        setEditTitle(cardData.title);
        setEditContent(cardData.content);
        setEditCategory(cardData.category);
        setEditDifficulty(cardData.difficulty);
      } catch (error) {
        console.error('Failed to fetch card:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cardId]);

  const handleToggleFavorite = async () => {
    if (!card) return;
    try {
      const result = await toggleFavorite(card.id);
      setCard({ ...card, favorited: result.favorited });
      onUpdate({ ...card, favorited: result.favorited });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleEdit = () => {
    if (card) {
      setEditTitle(card.title);
      setEditContent(card.content);
      setEditCategory(card.category);
      setEditDifficulty(card.difficulty);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!card) return;
    try {
      const updated = await updateCard(card.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        difficulty: editDifficulty
      });
      setCard(updated);
      onUpdate(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
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

  const handleDelete = async () => {
    if (!card) return;
    if (window.confirm('确定要删除这张卡片吗？')) {
      try {
        await deleteCard(card.id);
        onDelete(card.id);
        onBack();
      } catch (error) {
        console.error('Failed to delete card:', error);
      }
    }
  };

  if (loading) {
    return <div className="detail-loading">加载中...</div>;
  }

  if (!card) {
    return <div className="detail-loading">卡片不存在</div>;
  }

  const categoryColor = CATEGORY_COLORS[card.category as Category];

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="star-rating detail-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => setEditDifficulty(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const getHtmlContent = (content: string) => {
    return { __html: marked(content) };
  };

  return (
    <div className="card-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>

        <div className="detail-actions">
          <button
            className={`favorite-btn-large ${card.favorited ? 'favorited' : ''}`}
            onClick={handleToggleFavorite}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={card.favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {card.favorited ? '已收藏' : '收藏'}
          </button>

          {isEditing ? (
            <>
              <button className="action-btn save-btn" onClick={handleSave}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" />
                  <polyline points="7,3 7,8 15,8" />
                </svg>
                保存
              </button>
              <button className="action-btn cancel-btn" onClick={handleCancel}>
                取消
              </button>
            </>
          ) : (
            <>
              <button className="action-btn edit-btn" onClick={handleEdit}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                编辑
              </button>
              <button className="action-btn delete-btn" onClick={handleDelete}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`detail-body ${isEditing ? 'editing' : ''}`}>
        <div className="detail-content">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>分类</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as Category)}
                    className="form-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>难度</label>
                  {renderStars(editDifficulty, true)}
                </div>
              </div>

              <div className="editor-container">
                <div className="editor-pane">
                  <label>Markdown 编辑</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="markdown-editor"
                    placeholder="在此输入 Markdown 内容..."
                  />
                </div>
                <div className="preview-pane">
                  <label>实时预览</label>
                  <div
                    className="markdown-preview detail-markdown"
                    dangerouslySetInnerHTML={getHtmlContent(editContent)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-meta">
                <span className="detail-category" style={{ backgroundColor: categoryColor }}>
                  {card.category}
                </span>
                {renderStars(card.difficulty)}
              </div>

              <h1 className="detail-title">{card.title}</h1>

              <div
                className="detail-markdown"
                dangerouslySetInnerHTML={getHtmlContent(card.content)}
              />
            </>
          )}
        </div>

        {!isEditing && recommendations.length > 0 && (
          <div className="detail-sidebar">
            <h3 className="sidebar-title">同分类推荐</h3>
            <div className="recommendation-list">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="recommendation-item"
                  onClick={() => {
                    window.scrollTo(0, 0);
                    setCard(null);
                    setLoading(true);
                    getCard(rec.id).then((data) => {
                      setCard(data);
                      setLoading(false);
                    });
                    getRecommendations(rec.id).then(setRecommendations);
                    window.history.pushState({}, '', `/card/${rec.id}`);
                  }}
                >
                  <div
                    className="rec-category"
                    style={{ backgroundColor: CATEGORY_COLORS[rec.category as Category] }}
                  >
                    {rec.category}
                  </div>
                  <div className="rec-title">{rec.title}</div>
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
