import { useState, useRef, useCallback, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { usePortfolioStore, CardType, CardData, SocialLink } from '../store';
import './Editor.css';

const generateId = () => Math.random().toString(36).substring(2, 11);

const cardTemplates: { type: CardType; icon: string; label: string }[] = [
  { type: 'project', icon: 'fa-image', label: '项目卡片' },
  { type: 'text', icon: 'fa-align-left', label: '文本卡片' },
  { type: 'contact', icon: 'fa-address-book', label: '联系卡片' }
];

const iconOptions = [
  { type: 'github', icon: 'fa-github', label: 'GitHub' },
  { type: 'twitter', icon: 'fa-twitter', label: 'Twitter' },
  { type: 'linkedin', icon: 'fa-linkedin', label: 'LinkedIn' },
  { type: 'email', icon: 'fa-envelope', label: '邮箱' }
];

function Editor() {
  const { cards, selectedCardId, addCard, updateCard, updateLayout, selectCard, removeCard, layoutConfig, undo, redo, history, redoStack } = usePortfolioStore();
  const [draggedType, setDraggedType] = useState<CardType | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCard = cards.find(c => c.id === selectedCardId);

  const handleDragStart = (type: CardType) => {
    setDraggedType(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedType) {
      addCard(draggedType);
      setDraggedType(null);
    }
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    const updatedCards = cards.map(card => {
      const layout = newLayout.find(l => l.i === card.id);
      if (layout) {
        return {
          ...card,
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h
        };
      }
      return card;
    });
    updateLayout(updatedCards);
  };

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeStop = useCallback(() => {
    setTimeout(() => setIsResizing(false), 200);
  }, []);

  const handleCardClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    selectCard(cardId);
  };

  const handleBackgroundClick = () => {
    selectCard(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCardId) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持JPG和PNG格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateCard(selectedCardId, { image: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCardId) return;
    const value = e.target.value.slice(0, 20);
    updateCard(selectedCardId, { title: value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!selectedCardId) return;
    const value = e.target.value.slice(0, 100);
    updateCard(selectedCardId, { description: value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!selectedCardId) return;
    updateCard(selectedCardId, { content: e.target.value });
  };

  const applyFormat = (format: string) => {
    if (!selectedCardId || !selectedCard?.content) return;
    let newContent = selectedCard.content;
    
    switch (format) {
      case 'bold':
        newContent = `**${newContent}**`;
        break;
      case 'italic':
        newContent = `*${newContent}*`;
        break;
      case 'list':
        newContent = newContent.split('\n').map(line => `- ${line}`).join('\n');
        break;
      case 'link':
        const url = prompt('请输入链接地址:', 'https://');
        if (url) newContent = `[${newContent}](${url})`;
        break;
    }
    
    updateCard(selectedCardId, { content: newContent });
  };

  const addLink = () => {
    if (!selectedCardId) return;
    const links = selectedCard?.links || [];
    if (links.length >= 5) {
      alert('最多只能添加5个链接');
      return;
    }
    const newLink: SocialLink = {
      id: generateId(),
      type: 'github',
      url: 'https://'
    };
    updateCard(selectedCardId, { links: [...links, newLink] });
  };

  const updateLink = (linkId: string, updates: Partial<SocialLink>) => {
    if (!selectedCardId || !selectedCard?.links) return;
    const updatedLinks = selectedCard.links.map(link =>
      link.id === linkId ? { ...link, ...updates } : link
    );
    updateCard(selectedCardId, { links: updatedLinks });
  };

  const removeLink = (linkId: string) => {
    if (!selectedCardId || !selectedCard?.links) return;
    const updatedLinks = selectedCard.links.filter(link => link.id !== linkId);
    updateCard(selectedCardId, { links: updatedLinks });
  };

  const gridLayout = cards.map(card => ({
    i: card.id,
    x: card.x,
    y: card.y,
    w: card.w,
    h: card.h,
    minW: 2,
    maxW: 12,
    minH: 2,
    maxH: 6
  }));

  const renderCardContent = (card: CardData) => {
    switch (card.type) {
      case 'project':
        return (
          <div className="card-content project-card">
            {card.image ? (
              <div className="project-image" style={{ backgroundImage: `url(${card.image})` }} />
            ) : (
              <div className="project-placeholder">
                <i className="fas fa-image"></i>
                <span>点击上传图片</span>
              </div>
            )}
            <div className="project-info">
              <h3 className="project-title">{card.title || '项目标题'}</h3>
              <p className="project-desc">{card.description || '项目描述...'}</p>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="card-content text-card">
            <div className="text-content">
              {card.content || '在这里输入文本内容...'}
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="card-content contact-card">
            <h3 className="contact-title">{card.title || '联系方式'}</h3>
            <div className="contact-links">
              {card.links?.map(link => (
                <a key={link.id} className="contact-link" href={link.url}>
                  <i className={`fab ${iconOptions.find(i => i.type === link.type)?.icon || 'fa-link'}`}></i>
                </a>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const updateWidth = () => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        usePortfolioStore.getState().setLayoutConfig({ width: rect.width - 40 });
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="sidebar-title">
          <i className="fas fa-puzzle-piece"></i>
          物料栏
        </div>
        <div className="card-templates">
          {cardTemplates.map(template => (
            <div
              key={template.type}
              className="template-card"
              draggable
              onDragStart={() => handleDragStart(template.type)}
              onDragEnd={() => setDraggedType(null)}
            >
              <i className={`fas ${template.icon}`}></i>
              <span>{template.label}</span>
              <i className="fas fa-grip-vertical drag-handle"></i>
            </div>
          ))}
        </div>
      </div>

      <div className="main-editor-area">
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <button
              className={`tool-btn-undo ${history.length === 0 ? 'disabled' : ''}`}
              onClick={undo}
              disabled={history.length === 0}
              title="撤销 (Ctrl+Z)"
            >
              <i className="fas fa-undo"></i>
              <span>撤销</span>
            </button>
            <button
              className={`tool-btn-redo ${redoStack.length === 0 ? 'disabled' : ''}`}
              onClick={redo}
              disabled={redoStack.length === 0}
              title="重做 (Ctrl+Y)"
            >
              <i className="fas fa-redo"></i>
              <span>重做</span>
            </button>
          </div>
          <div className="toolbar-right">
            <span className="history-counter">历史: {history.length}/50</span>
          </div>
        </div>

        <div
          className="grid-container-wrapper"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBackgroundClick}
          ref={gridRef}
        >
          <div className="grid-background">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="grid-column" />
          ))}
        </div>
        <GridLayout
          className="grid-layout"
          layout={gridLayout}
          cols={layoutConfig.cols}
          rowHeight={layoutConfig.rowHeight}
          width={layoutConfig.width}
          onLayoutChange={handleLayoutChange}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          draggableHandle=".card-drag-handle"
          isResizable={true}
          isDraggable={true}
        >
          {cards.map(card => (
            <div
              key={card.id}
              className={`grid-card ${selectedCardId === card.id ? 'selected' : ''} ${isResizing && selectedCardId === card.id ? 'resizing' : ''}`}
              onClick={(e) => handleCardClick(e, card.id)}
            >
              <div className="card-drag-handle">
                <i className="fas fa-grip-vertical"></i>
              </div>
              {renderCardContent(card)}
            </div>
          ))}
        </GridLayout>
        {cards.length === 0 && (
          <div className="empty-hint">
            <i className="fas fa-arrow-left"></i>
            <p>从左侧拖拽卡片到这里开始编辑</p>
          </div>
        )}
      </div>

      {selectedCard && (
        <div className="property-panel">
          <div className="panel-header">
            <span>属性编辑</span>
            <button className="close-btn" onClick={() => selectCard(null)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="panel-content">
            {selectedCard.type === 'project' && (
              <>
                <div className="form-group">
                  <label>项目图片</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  {selectedCard.image ? (
                    <div className="image-preview-wrapper">
                      <img src={selectedCard.image} alt="预览" className="image-preview" />
                      <button
                        className="btn btn-secondary upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fas fa-sync-alt"></i>
                        重新上传
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="fas fa-upload"></i>
                      上传图片
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>标题 ({selectedCard.title?.length || 0}/20)</label>
                  <input
                    type="text"
                    value={selectedCard.title || ''}
                    onChange={handleTitleChange}
                    placeholder="输入标题..."
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label>描述 ({selectedCard.description?.length || 0}/100)</label>
                  <textarea
                    value={selectedCard.description || ''}
                    onChange={handleDescriptionChange}
                    placeholder="输入描述..."
                    rows={3}
                    maxLength={100}
                  />
                </div>
              </>
            )}

            {selectedCard.type === 'text' && (
              <>
                <div className="form-group">
                  <label>文本内容</label>
                  <div className="toolbar">
                    <button className="tool-btn" onClick={() => applyFormat('bold')} title="加粗">
                      <i className="fas fa-bold"></i>
                    </button>
                    <button className="tool-btn" onClick={() => applyFormat('italic')} title="斜体">
                      <i className="fas fa-italic"></i>
                    </button>
                    <button className="tool-btn" onClick={() => applyFormat('list')} title="列表">
                      <i className="fas fa-list-ul"></i>
                    </button>
                    <button className="tool-btn" onClick={() => applyFormat('link')} title="链接">
                      <i className="fas fa-link"></i>
                    </button>
                  </div>
                  <textarea
                    value={selectedCard.content || ''}
                    onChange={handleContentChange}
                    placeholder="输入文本内容..."
                    rows={6}
                  />
                </div>
              </>
            )}

            {selectedCard.type === 'contact' && (
              <>
                <div className="form-group">
                  <label>标题 ({selectedCard.title?.length || 0}/20)</label>
                  <input
                    type="text"
                    value={selectedCard.title || ''}
                    onChange={handleTitleChange}
                    placeholder="输入标题..."
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <div className="links-header">
                    <label>社交链接 ({selectedCard.links?.length || 0}/5)</label>
                    <button className="btn btn-primary add-link-btn" onClick={addLink}>
                      <i className="fas fa-plus"></i>
                      添加
                    </button>
                  </div>
                  <div className="links-list">
                    {selectedCard.links?.map(link => (
                      <div key={link.id} className="link-item">
                        <select
                          value={link.type}
                          onChange={(e) => updateLink(link.id, { type: e.target.value as SocialLink['type'] })}
                        >
                          {iconOptions.map(opt => (
                            <option key={opt.type} value={opt.type}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateLink(link.id, { url: e.target.value })}
                          placeholder="链接地址..."
                        />
                        <button className="remove-link-btn" onClick={() => removeLink(link.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              className="btn btn-danger delete-card-btn"
              onClick={() => removeCard(selectedCard.id)}
            >
              <i className="fas fa-trash-alt"></i>
              删除此卡片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Editor;
