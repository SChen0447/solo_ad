import { useState, useRef, useCallback } from 'react'
import { SearchBar } from './modules/search'
import { useSearchStore } from './modules/search'
import { Canvas } from './modules/canvas'
import { useCanvasStore } from './modules/canvas'
import { useCollectionStore, type Card } from './modules/collection'
import './styles.css'

function App() {
  const [panelWidth, setPanelWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const cards = useCollectionStore((s) => s.cards)
  const isLoading = useCollectionStore((s) => s.isLoading)
  const fetchUrl = useCollectionStore((s) => s.fetchUrl)
  const canvasCards = useCanvasStore((s) => s.canvasCards)
  const highlightIds = useCanvasStore((s) => s.highlightedIds)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth }

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = ev.clientX - resizeRef.current.startX
      const newWidth = Math.max(180, Math.min(400, resizeRef.current.startWidth + delta))
      setPanelWidth(newWidth)
    }

    const handleUp = () => {
      setIsResizing(false)
      resizeRef.current = null
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const handleFetch = useCallback(() => {
    if (!urlInput.trim()) return
    let url = urlInput.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    fetchUrl(url)
    setUrlInput('')
  }, [urlInput, fetchUrl])

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.setData('application/json', JSON.stringify(card))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnPanel = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const card = JSON.parse(e.dataTransfer.getData('application/json')) as Card
      useCanvasStore.getState().removeCanvasCard(card.id)
    } catch {}
  }

  const isOnCanvas = (cardId: string) => canvasCards.has(cardId)

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <h1>笔墨档案</h1>
        </div>
        <SearchBar />
      </header>

      <div className="app-body">
        <aside
          className={`collection-panel ${isResizing ? 'resizing' : ''}`}
          style={{ width: panelWidth }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnPanel}
        >
          <div className="panel-header">
            <h2>收藏</h2>
            <span className="panel-count">{cards.length}</span>
          </div>

          <div className="url-input-section">
            <div className="url-input-wrapper">
              <input
                type="text"
                className="url-input"
                placeholder="输入网址添加剪报..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
              <button
                className="url-fetch-btn"
                onClick={handleFetch}
                disabled={isLoading || !urlInput.trim()}
              >
                {isLoading ? (
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5-5m-5 5 5 5m-5-5h14" />
                  </svg>
                )}
              </button>
            </div>
            <p className="url-hint">拖拽卡片到画布上整理</p>
          </div>

          <div className="collection-list">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`collection-card ${
                  highlightIds.has(card.id) ? 'highlighted' : ''
                } ${isOnCanvas(card.id) ? 'on-canvas' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, card)}
              >
                <div className="collection-card-thumb">
                  <img src={card.screenshot} alt={card.title} />
                  {isOnCanvas(card.id) && <div className="on-canvas-badge">画布中</div>}
                </div>
                <div className="collection-card-info">
                  <h3 className="collection-card-title">{card.title}</h3>
                  <p className="collection-card-desc">{card.description.slice(0, 50)}...</p>
                  {card.tags.length > 0 && (
                    <div className="collection-card-tags">
                      {card.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="mini-tag">{tag}</span>
                      ))}
                      {card.tags.length > 2 && (
                        <span className="mini-tag more">+{card.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <p>暂无收藏卡片</p>
                <span>输入网址开始添加</span>
              </div>
            )}
          </div>
        </aside>

        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
        />

        <main className="canvas-area">
          <Canvas onDeleteCard={() => {}} panelWidth={panelWidth} />
          <div className="canvas-hint">
            <span>鼠标中键拖动平移 · 滚轮缩放 (0.2x - 4x) · 双击卡片编辑</span>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
