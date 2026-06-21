import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Image, Link as LinkIcon, FileText, Plus, X, Trash2,
  Tag as TagIcon, Loader, ArrowLeft, ExternalLink, Edit3, Check
} from 'lucide-react';
import { Card, CardType, Tag, cardManager } from '../modules/cardManager/CardManager';
import { Theme } from './ThemeSwitcher';

interface BoardViewProps {
  boardId: string;
  boardName: string;
  theme: Theme;
  onBack: () => void;
}

const renderMarkdown = (text: string): string => {
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  if (html.includes('<li>')) {
    html = html.replace(/((?:<li>.*<\/li>\s?)+)/g, '<ul>$1</ul>');
  }
  return html;
};

export const BoardView: React.FC<BoardViewProps> = ({ boardId, boardName, theme, onBack }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTag, setFilteredTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCardType, setAddCardType] = useState<CardType>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [noteText, setNoteText] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const refreshData = useCallback(async () => {
    await cardManager.init(boardId);
    setCards(cardManager.getCards());
    setTags(cardManager.getTags());
  }, [boardId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    await cardManager.reorderCards(result.source.index, result.destination.index);
    setCards(cardManager.getCards());
  };

  const handleAddCard = async () => {
    let content: Card['content'] = {};
    if (addCardType === 'image' && imageUrl.trim()) {
      content = { imageUrl: imageUrl.trim() };
      setLoadingImages(prev => new Set(prev).add('pending_' + Date.now()));
    } else if (addCardType === 'link' && linkTitle.trim() && linkUrl.trim()) {
      content = { linkTitle: linkTitle.trim(), linkUrl: linkUrl.trim() };
    } else if (addCardType === 'note' && noteText.trim()) {
      content = { noteText: noteText.trim().slice(0, 200) };
    } else {
      return;
    }
    await cardManager.addCard(addCardType, content);
    setCards(cardManager.getCards());
    setShowAddModal(false);
    setImageUrl('');
    setLinkTitle('');
    setLinkUrl('');
    setNoteText('');
  };

  const handleDeleteCard = async (cardId: string) => {
    await cardManager.deleteCard(cardId);
    setCards(cardManager.getCards());
  };

  const handleEditCard = (card: Card) => {
    setEditingCardId(card.id);
    if (card.type === 'note') {
      setEditText(card.content.noteText || '');
    } else if (card.type === 'link') {
      setEditText(card.content.linkTitle || '');
    } else if (card.type === 'image') {
      setEditText(card.content.imageUrl || '');
    }
  };

  const handleSaveEdit = async (card: Card) => {
    let content: Card['content'] = {};
    if (card.type === 'note') {
      content = { noteText: editText.slice(0, 200) };
    } else if (card.type === 'link') {
      content = { linkTitle: editText, linkUrl: card.content.linkUrl };
    } else if (card.type === 'image') {
      content = { imageUrl: editText };
    }
    await cardManager.updateCard(card.id, content);
    setCards(cardManager.getCards());
    setEditingCardId(null);
  };

  const handleAddTag = async (cardId: string) => {
    if (!newTagName.trim()) return;
    await cardManager.addTagToCard(cardId, newTagName);
    setCards(cardManager.getCards());
    setTags(cardManager.getTags());
    setNewTagName('');
  };

  const handleRemoveTag = async (cardId: string, tagId: string) => {
    await cardManager.removeTagFromCard(cardId, tagId);
    setCards(cardManager.getCards());
  };

  const handleImageLoad = (cardId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  const handleImageError = (cardId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  const isCardVisible = (card: Card) => {
    if (!filteredTag) return true;
    return card.tags.includes(filteredTag);
  };

  const getTagColor = (tagId: string): Tag | undefined => {
    return tags.find(t => t.id === tagId);
  };

  return (
    <div className="board-view">
      <div className="board-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <h2 className="board-title">{boardName}</h2>
        <button className="add-card-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>添加卡片</span>
        </button>
      </div>

      {tags.length > 0 && (
        <div className="tag-filter-bar">
          <button
            className={`tag-filter-chip ${filteredTag === null ? 'active' : ''}`}
            onClick={() => setFilteredTag(null)}
          >
            全部
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`tag-filter-chip ${filteredTag === tag.id ? 'active' : ''}`}
              style={{
                backgroundColor: filteredTag === tag.id ? tag.color : 'transparent',
                borderColor: tag.color,
                color: filteredTag === tag.id ? '#fff' : theme === 'dark' ? '#e0e0e0' : '#333'
              }}
              onClick={() => setFilteredTag(filteredTag === tag.id ? null : tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="cards-grid" direction="horizontal">
          {(provided) => (
            <div
              className="cards-grid"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {cards.map((card, index) => {
                const visible = isCardVisible(card);
                return (
                  <Draggable key={card.id} draggableId={card.id} index={index} isDragDisabled={!visible}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`card-item ${card.type} ${!visible ? 'faded' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                        style={{
                          ...provided.draggableProps.style,
                          transform: snapshot.isDragging ? 'scale(0.9)' : undefined
                        }}
                      >
                        <div className="card-tags">
                          {card.tags.map(tagId => {
                            const tag = getTagColor(tagId);
                            return tag ? (
                              <span
                                key={tagId}
                                className="card-tag"
                                style={{ backgroundColor: tag.color }}
                                onClick={() => setFilteredTag(filteredTag === tagId ? null : tagId)}
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                        </div>

                        <div className="card-actions">
                          <button
                            className="card-action-btn"
                            onClick={(e) => { e.stopPropagation(); setShowTagModal(card.id); }}
                            title="添加标签"
                          >
                            <TagIcon size={14} />
                          </button>
                          <button
                            className="card-action-btn"
                            onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}
                            title="编辑"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="card-action-btn delete"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="card-content">
                          {card.type === 'image' && (
                            <div className="image-card-wrapper">
                              {loadingImages.has(card.id) || card.content.imageUrl ? (
                                <>
                                  <div className={`image-loading ${loadingImages.has(card.id) || !card.content.imageUrl ? 'show' : ''}`}>
                                    <Loader className="spinner" size={32} />
                                  </div>
                                  <img
                                    src={card.content.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    className="card-image"
                                    onLoad={() => handleImageLoad(card.id)}
                                    onError={() => handleImageError(card.id)}
                                    style={{ display: loadingImages.has(card.id) || !card.content.imageUrl ? 'none' : 'block' }}
                                  />
                                </>
                              ) : null}
                              {editingCardId === card.id && (
                                <div className="card-edit-box">
                                  <input
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="图片URL"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveEdit(card)}>
                                    <Check size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {card.type === 'link' && (
                            <div className="link-card-wrapper">
                              <LinkIcon size={20} className="link-icon" />
                              {editingCardId === card.id ? (
                                <div className="card-edit-box">
                                  <input
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="标题"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveEdit(card)}>
                                    <Check size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="link-info">
                                  <div className="link-title">{card.content.linkTitle}</div>
                                  <a
                                    href={card.content.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-url"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {card.content.linkUrl}
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {card.type === 'note' && (
                            <div className="note-card-wrapper">
                              <FileText size={18} className="note-icon" />
                              {editingCardId === card.id ? (
                                <div className="card-edit-box">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="笔记内容（最多200字）"
                                    maxLength={200}
                                    autoFocus
                                  />
                                  <div className="edit-actions">
                                    <span className="char-count">{editText.length}/200</span>
                                    <button onClick={() => handleSaveEdit(card)}>
                                      <Check size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="note-text"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content.noteText || '') }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {cards.length === 0 && (
        <div className="empty-state">
          <p>还没有卡片，点击"添加卡片"创建第一张吧！</p>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加卡片</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="card-type-selector">
                <button
                  className={`type-btn ${addCardType === 'image' ? 'active' : ''}`}
                  onClick={() => setAddCardType('image')}
                >
                  <Image size={18} />
                  <span>图片</span>
                </button>
                <button
                  className={`type-btn ${addCardType === 'link' ? 'active' : ''}`}
                  onClick={() => setAddCardType('link')}
                >
                  <LinkIcon size={18} />
                  <span>链接</span>
                </button>
                <button
                  className={`type-btn ${addCardType === 'note' ? 'active' : ''}`}
                  onClick={() => setAddCardType('note')}
                >
                  <FileText size={18} />
                  <span>笔记</span>
                </button>
              </div>

              {addCardType === 'image' && (
                <div className="form-group">
                  <label>图片URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}

              {addCardType === 'link' && (
                <>
                  <div className="form-group">
                    <label>标题</label>
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="链接标题"
                    />
                  </div>
                  <div className="form-group">
                    <label>URL</label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </>
              )}

              {addCardType === 'note' && (
                <div className="form-group">
                  <label>笔记内容（最多200字）</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="记录你的灵感...&#10;支持**加粗**、*斜体*、- 列表"
                    maxLength={200}
                    rows={4}
                  />
                  <span className="char-count">{noteText.length}/200</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddCard}>添加</button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="modal-overlay" onClick={() => { setShowTagModal(null); setNewTagName(''); }}>
          <div className="modal tag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>管理标签</h3>
              <button className="modal-close" onClick={() => { setShowTagModal(null); setNewTagName(''); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="existing-tags">
                {tags.map(tag => {
                  const currentCard = cards.find(c => c.id === showTagModal);
                  const hasTag = currentCard?.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`tag-option ${hasTag ? 'selected' : ''}`}
                      style={{ backgroundColor: hasTag ? tag.color : 'transparent', borderColor: tag.color }}
                      onClick={() => {
                        if (hasTag) {
                          handleRemoveTag(showTagModal!, tag.id);
                        } else {
                          handleAddTag(showTagModal!);
                        }
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {tags.length === 0 && <p className="hint-text">还没有标签，创建一个吧</p>}
              </div>
              <div className="form-group">
                <label>创建新标签（最多10字）</label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="输入标签名称"
                    maxLength={10}
                  />
                  <button className="btn-primary" onClick={() => handleAddTag(showTagModal!)}>添加</button>
                </div>
              </div>
              <p className="hint-text">每张卡片最多3个标签</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
