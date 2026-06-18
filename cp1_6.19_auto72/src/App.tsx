import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BoardCanvas } from './modules/board/BoardCanvas';
import { Card } from './modules/board/Card';
import { useBoardStore, type CardData } from './modules/board/boardStore';
import { scrapeUrl } from './modules/scraper/scraper';
import './App.css';

const App: React.FC = () => {
  const {
    sidebarCards,
    addSidebarCard,
    removeSidebarCard,
    toggleFavorite,
    getAllBoardColors,
    cards,
  } = useBoardStore();

  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [draggingCard, setDraggingCard] = useState<CardData | null>(null);
  const [detailCard, setDetailCard] = useState<CardData | null>(null);
  const [detailCardRect, setDetailCardRect] = useState<DOMRect | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  const colorPaletteRef = useRef<HTMLDivElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  const sortedCards = [...sidebarCards].sort((a, b) => b.createdAt - a.createdAt);
  const displayedCards = filterFavorites
    ? sortedCards.filter((c) => c.isFavorite)
    : sortedCards;

  const boardColors = getAllBoardColors();

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const handleScrape = useCallback(async () => {
    if (!urlInput.trim() || isScraping) return;

    setIsScraping(true);
    try {
      const data = await scrapeUrl(urlInput.trim());
      addSidebarCard(data);
      setUrlInput('');
      showToastMessage('素材添加成功！');
    } catch (error) {
      showToastMessage('抓取失败，请重试');
    } finally {
      setIsScraping(false);
    }
  }, [urlInput, isScraping, addSidebarCard, showToastMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleScrape();
      }
    },
    [handleScrape]
  );

  const handleSidebarDragStart = useCallback(
    (e: React.MouseEvent, card: CardData) => {
      setDraggingCard(card);
    },
    []
  );

  const handleCardDoubleClick = useCallback((card: CardData) => {
    const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
    if (cardEl) {
      setDetailCardRect(cardEl.getBoundingClientRect());
    }
    setDetailCard(card);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailCard(null);
    setDetailCardRect(null);
  }, []);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}?board=${Date.now()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToastMessage('链接已复制到剪贴板！');
    });
  }, [showToastMessage]);

  const handleColorButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cards.length === 0) {
        showToastMessage('画布上还没有卡片哦');
        return;
      }
      setShowColorPalette((prev) => !prev);
    },
    [cards.length, showToastMessage]
  );

  const handleCopyColor = useCallback(
    (color: string) => {
      navigator.clipboard.writeText(color).then(() => {
        showToastMessage(`已复制 ${color}`);
      });
    },
    [showToastMessage]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showColorPalette &&
        colorPaletteRef.current &&
        !colorPaletteRef.current.contains(e.target as Node) &&
        colorBtnRef.current &&
        !colorBtnRef.current.contains(e.target as Node)
      ) {
        setShowColorPalette(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPalette]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailCard(null);
        setShowColorPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sortedColors = boardColors.slice(0, 12);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <span className="logo-text">i</span>
            <span className="logo-text-secondary">w</span>
          </div>
          <h1 className="app-title">灵感织网</h1>
        </div>

        <div className="header-right">
          <button
            ref={colorBtnRef}
            className="header-btn color-btn"
            onClick={handleColorButtonClick}
            title="配色方案"
          >
            <div className="color-btn-icon">
              <span style={{ background: boardColors[0] || '#6c63ff' }} />
              <span style={{ background: boardColors[1] || '#4e46c9' }} />
              <span style={{ background: boardColors[2] || '#a8a2ff' }} />
            </div>
            <span>配色方案</span>
          </button>

          <button
            className="header-btn share-btn"
            onClick={handleShare}
            title="分享"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>分享</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>资源库</h2>
            <button
              className={`filter-btn ${filterFavorites ? 'active' : ''}`}
              onClick={() => setFilterFavorites(!filterFavorites)}
              title={filterFavorites ? '显示全部' : '只看收藏'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>

          <div className="url-input-wrapper">
            <input
              type="text"
              className="url-input"
              placeholder="输入网页URL，添加灵感素材..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isScraping}
            />
            <button
              className="add-btn"
              onClick={handleScrape}
              disabled={isScraping || !urlInput.trim()}
            >
              {isScraping ? (
                <div className="spinner" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
          </div>

          <div className="sidebar-cards">
            {displayedCards.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                <p>{filterFavorites ? '还没有收藏的素材' : '暂无素材，试试添加URL吧'}</p>
              </div>
            ) : (
              displayedCards.map((card) => (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', card.id);
                    setDraggingCard(card);
                  }}
                  onDragEnd={() => setDraggingCard(null)}
                  onMouseDown={(e) => handleSidebarDragStart(e, card)}
                >
                  <Card
                    card={card}
                    variant="sidebar"
                    onDelete={removeSidebarCard}
                    onToggleFavorite={toggleFavorite}
                    onDoubleClick={handleCardDoubleClick}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          <BoardCanvas
            onCardDoubleClick={handleCardDoubleClick}
            draggingSidebarCard={draggingCard}
            onSidebarDragEnd={() => setDraggingCard(null)}
          />
        </main>
      </div>

      {detailCard && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={
              detailCardRect
                ? {
                    '--from-x': `${detailCardRect.left}px`,
                    '--from-y': `${detailCardRect.top}px`,
                    '--from-width': `${detailCardRect.width}px`,
                    '--from-height': `${detailCardRect.height}px`,
                  } as React.CSSProperties
                : undefined
            }
          >
            <button className="modal-close" onClick={handleCloseDetail}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-image">
              <img src={detailCard.thumbnail} alt={detailCard.title} />
            </div>

            <div className="modal-body">
              <h2 className="modal-title">{detailCard.title}</h2>

              <div className="modal-colors">
                <span className="modal-label">主色调</span>
                <div className="color-list">
                  {detailCard.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="color-item"
                      style={{ background: color }}
                      onClick={() => handleCopyColor(color)}
                      title={`点击复制 ${color}`}
                    >
                      <span className="color-hex">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-summary">
                <span className="modal-label">摘要</span>
                <p>{detailCard.summary}</p>
              </div>

              <div className="modal-date">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {new Date(detailCard.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {showColorPalette && (
        <div ref={colorPaletteRef} className="color-palette-popup">
          <div className="palette-header">
            <span className="palette-title">画布配色方案</span>
            <span className="palette-count">{sortedColors.length} 种颜色</span>
          </div>
          <div className="palette-colors">
            {sortedColors.map((color, idx) => (
              <div
                key={idx}
                className="palette-color"
                style={{ background: color }}
                onClick={() => handleCopyColor(color)}
                title={`点击复制 ${color}`}
              >
                <span className="palette-color-hex">{color}</span>
              </div>
            ))}
          </div>
          <div className="palette-footer">
            按使用频率排序 · 点击复制色值
          </div>
        </div>
      )}

      <div className={`toast ${showToast ? 'show' : ''}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {toastMessage}
      </div>
    </div>
  );
};

export default App;
