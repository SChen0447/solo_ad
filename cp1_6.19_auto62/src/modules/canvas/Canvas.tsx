import { useRef, useEffect, useState, useCallback } from 'react'
import { useCanvasStore, type CanvasCard } from './store'
import { useCollectionStore } from '../collection'
import type { Card } from '../collection'
import './canvas.css'

interface CanvasProps {
  onDeleteCard: (cardId: string) => void
  panelWidth: number
}

export const Canvas = ({ onDeleteCard, panelWidth }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    canvasCards,
    addCanvasCard,
    removeCanvasCard,
    updateCanvasCardPos,
    highlightedIds,
  } = useCanvasStore()

  const updateCard = useCollectionStore((s) => s.updateCard)
  const cards = useCollectionStore((s) => s.cards)

  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [ghostCard, setGhostCard] = useState<{
    x: number
    y: number
    card: Card
  } | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editingType, setEditingType] = useState<'tags' | 'note'>('tags')
  const [highlightAnimation, setHighlightAnimation] = useState<Set<string>>(new Set())

  const GRID_SIZE = 40

  useEffect(() => {
    if (highlightedIds.size > 0) {
      setHighlightAnimation(new Set(highlightedIds))
      const timer = setTimeout(() => {
        setHighlightAnimation(new Set())
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedIds])

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#F9FAFB'
    ctx.fillRect(0, 0, width, height)

    const gridSize = GRID_SIZE * zoom
    const spacing = gridSize < 20 ? gridSize * 2 : gridSize < 10 ? gridSize * 4 : gridSize

    const offsetX = panX % spacing
    const offsetY = panY % spacing

    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 0.5

    ctx.beginPath()
    for (let x = offsetX; x < width; x += spacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    for (let y = offsetY; y < height; y += spacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()

    ctx.strokeStyle = '#D1D5DB'
    ctx.lineWidth = 0.8
    const majorSpacing = spacing * 5
    const majorOffsetX = panX % majorSpacing
    const majorOffsetY = panY % majorSpacing
    ctx.beginPath()
    for (let x = majorOffsetX; x < width; x += majorSpacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    for (let y = majorOffsetY; y < height; y += majorSpacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()
  }, [zoom, panX, panY])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      drawGrid()
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawGrid])

  useEffect(() => {
    drawGrid()
  }, [drawGrid])

  const screenToWorld = (sx: number, sy: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (sx - rect.left - panX) / zoom
    const y = (sy - rect.top - panY) / zoom
    return { x, y }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    } else if (e.button === 0) {
      setEditingCardId(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y)
      return
    }
    if (draggingCardId) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      updateCanvasCardPos(draggingCardId, x - dragOffset.x, y - dragOffset.y)
    }
    if (ghostCard) {
      const rect = canvasRef.current!.getBoundingClientRect()
      setGhostCard({
        ...ghostCard,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }
    if (ghostCard) {
      const rect = canvasRef.current!.getBoundingClientRect()
      if (e.clientX - rect.left > 0 && e.clientY - rect.top > 0) {
        const { x, y } = screenToWorld(e.clientX, e.clientY)
        addCanvasCard(ghostCard.card, x - 150, y - 112)
      }
      setGhostCard(null)
      document.body.style.overflow = ''
    }
    if (draggingCardId) {
      if (e.clientX < panelWidth) {
        removeCanvasCard(draggingCardId)
        onDeleteCard(draggingCardId)
      }
      setDraggingCardId(null)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = -e.deltaY * 0.001
    const newZoom = Math.max(0.2, Math.min(4, zoom * (1 + delta)))

    const worldX = (mouseX - panX) / zoom
    const worldY = (mouseY - panY) / zoom

    const newPanX = mouseX - worldX * newZoom
    const newPanY = mouseY - worldY * newZoom

    setZoom(newZoom)
    setPan(newPanX, newPanY)
  }

  const handleCardMouseDown = (e: React.MouseEvent, card: CanvasCard) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    setDragOffset({ x: x - card.x, y: y - card.y })
    setDraggingCardId(card.id)
  }

  const handleCardDoubleClick = (e: React.MouseEvent, card: CanvasCard) => {
    e.stopPropagation()
    setEditingCardId(card.id)
    setEditingType('tags')
    setEditingText(card.tags.join(', '))
  }

  const handleSaveEdit = () => {
    if (!editingCardId) return
    if (editingType === 'tags') {
      const tags = editingText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      updateCard(editingCardId, { tags })
    } else {
      updateCard(editingCardId, { note: editingText })
    }
    setEditingCardId(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const cardData = JSON.parse(e.dataTransfer.getData('application/json')) as Card
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      addCanvasCard(cardData, x - 150, y - 112)
    } catch {}
    setGhostCard(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const cardData = JSON.parse(e.dataTransfer.getData('application/json')) as Card
      if (cardData && !ghostCard) {
        const rect = canvasRef.current!.getBoundingClientRect()
        setGhostCard({ x: e.clientX - rect.left, y: e.clientY - rect.top, card: cardData })
        document.body.style.overflow = 'hidden'
      }
    } catch {}
  }

  const handleDragLeave = () => {
    setGhostCard(null)
    document.body.style.overflow = ''
  }

  const renderedCards = Array.from(canvasCards.values())

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{ cursor: isPanning ? 'grabbing' : draggingCardId ? 'grabbing' : 'default' }}
    >
      <canvas ref={canvasRef} className="canvas-grid" />
      <div
        className="canvas-content"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {renderedCards.map((card) => (
          <div
            key={card.id}
            className={`canvas-card ${
              draggingCardId === card.id ? 'dragging' : ''
            } ${highlightedIds.has(card.id) ? 'highlighted' : ''} ${
              highlightAnimation.has(card.id) ? 'animate-highlight' : ''
            }`}
            style={{
              left: card.x,
              top: card.y,
            }}
            onMouseDown={(e) => handleCardMouseDown(e, card)}
            onDoubleClick={(e) => handleCardDoubleClick(e, card)}
          >
            <img src={card.screenshot} alt={card.title} className="canvas-card-img" />
            <div className="canvas-card-body">
              <h4 className="canvas-card-title">{card.title}</h4>
              {card.tags.length > 0 && (
                <div className="canvas-card-tags">
                  {card.tags.map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {card.note && <p className="canvas-card-note">{card.note}</p>}
            </div>
            {editingCardId === card.id && (
              <div className="card-edit-popup" onClick={(e) => e.stopPropagation()}>
                <div className="edit-tabs">
                  <button
                    className={editingType === 'tags' ? 'active' : ''}
                    onClick={() => {
                      setEditingType('tags')
                      setEditingText(card.tags.join(', '))
                    }}
                  >
                    标签
                  </button>
                  <button
                    className={editingType === 'note' ? 'active' : ''}
                    onClick={() => {
                      setEditingType('note')
                      setEditingText(card.note)
                    }}
                  >
                    笔记
                  </button>
                </div>
                <textarea
                  className="edit-textarea"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  placeholder={editingType === 'tags' ? '用逗号分隔标签' : '添加关联笔记...'}
                  autoFocus
                />
                <div className="edit-footer">
                  <span className="char-count">{editingText.length}/500</span>
                  <button className="save-btn" onClick={handleSaveEdit}>
                    保存
                  </button>
                </div>
              </div>
            )}
            {highlightAnimation.has(card.id) && <div className="highlight-circle" />}
          </div>
        ))}
      </div>
      {ghostCard && (
        <div
          className="ghost-card"
          style={{ left: ghostCard.x - 150, top: ghostCard.y - 112 }}
        >
          <img src={ghostCard.card.screenshot} alt="" />
          <div className="ghost-card-title">{ghostCard.card.title}</div>
        </div>
      )}
    </div>
  )
}

export default Canvas
