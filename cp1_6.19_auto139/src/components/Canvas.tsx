import { useRef, useState, useEffect, useCallback } from 'react'
import type { Board, Card, CardType } from '../types'

interface Props {
  board: Board
  onBack: () => void
  onAddCard: (type: CardType) => void
  onCardClick: (card: Card) => void
  onCardPositionChange: (id: string, x: number, y: number, localOnly?: boolean) => void
  onDeleteCard: (id: string) => void
  onExport: () => void
}

const CARD_W = 200
const CARD_H = 150

interface CardState {
  displayX: number
  displayY: number
  velX: number
  velY: number
  flash: boolean
}

function simpleMarkdown(text: string) {
  const lines = text.split('\n')
  const els: React.ReactNode[] = []
  let list: string[] | null = null
  const flushList = () => {
    if (list) {
      els.push(
        <ul key={`ul-${els.length}`}>
          {list.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
          ))}
        </ul>
      )
      list = null
    }
  }
  const renderInline = (s: string) => {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
  }
  lines.forEach((l, i) => {
    const h3 = l.match(/^###\s+(.+)/)
    const h2 = l.match(/^##\s+(.+)/)
    const h1 = l.match(/^#\s+(.+)/)
    const li = l.match(/^[-*]\s+(.+)/)
    if (li) {
      if (!list) list = []
      list.push(li[1])
    } else {
      flushList()
      if (h3) els.push(<h3 key={i}>{h3[1]}</h3>)
      else if (h2) els.push(<h2 key={i}>{h2[1]}</h2>)
      else if (h1) els.push(<h1 key={i}>{h1[1]}</h1>)
      else if (l.trim()) els.push(<p key={i} dangerouslySetInnerHTML={{ __html: renderInline(l) }} />)
      else els.push(<br key={i} />)
    }
  })
  flushList()
  return <div>{els}</div>
}

export default function Canvas({
  board,
  onBack,
  onAddCard,
  onCardClick,
  onCardPositionChange,
  onDeleteCard,
  onExport,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [draggingCard, setDraggingCard] = useState<string | null>(null)
  const dragStartRef = useRef<{ mx: number; my: number; cx: number; cy: number; cardId: string } | null>(null)
  const [panning, setPanning] = useState(false)
  const panStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const cardStatesRef = useRef<Map<string, CardState>>(new Map())
  const [, forceRender] = useState(0)
  const animFrameRef = useRef<number | null>(null)

  board.cards.forEach(c => {
    if (!cardStatesRef.current.has(c.id)) {
      cardStatesRef.current.set(c.id, {
        displayX: c.x,
        displayY: c.y,
        velX: 0,
        velY: 0,
        flash: false,
      })
    } else {
      const st = cardStatesRef.current.get(c.id)!
      if (draggingCard !== c.id) {
        if (Math.abs(st.displayX - c.x) < 0.5) st.displayX = c.x
        if (Math.abs(st.displayY - c.y) < 0.5) st.displayY = c.y
      }
    }
  })

  useEffect(() => {
    const existing = new Set(Array.from(cardStatesRef.current.keys()))
    const current = new Set(board.cards.map(c => c.id))
    existing.forEach(id => {
      if (!current.has(id)) cardStatesRef.current.delete(id)
    })
  }, [board.cards])

  const checkAndResolveCollisions = useCallback(() => {
    const cards = board.cards
    let changed = false
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i]
        const b = cards[j]
        const aState = cardStatesRef.current.get(a.id)!
        const bState = cardStatesRef.current.get(b.id)!
        const ax = aState.displayX
        const ay = aState.displayY
        const bx = bState.displayX
        const by = bState.displayY
        const overlapX = Math.min(ax + CARD_W, bx + CARD_W) - Math.max(ax, bx)
        const overlapY = Math.min(ay + CARD_H, by + CARD_H) - Math.max(ay, by)
        if (overlapX > 0 && overlapY > 0) {
          const cx1 = ax + CARD_W / 2
          const cy1 = ay + CARD_H / 2
          const cx2 = bx + CARD_W / 2
          const cy2 = by + CARD_H / 2
          let dx = cx2 - cx1
          let dy = cy2 - cy1
          if (dx === 0 && dy === 0) { dx = 1; dy = 1 }
          const len = Math.sqrt(dx * dx + dy * dy)
          dx /= len
          dy /= len
          const push = Math.max(overlapX, overlapY) / 2 + 2
          if (draggingCard !== a.id) {
            aState.displayX -= dx * push
            aState.displayY -= dy * push
            aState.velX = -dx * 10
            aState.velY = -dy * 10
            changed = true
          }
          if (draggingCard !== b.id) {
            bState.displayX += dx * push
            bState.displayY += dy * push
            bState.velX = dx * 10
            bState.velY = dy * 10
            changed = true
          }
        }
      }
    }
    return changed
  }, [board.cards, draggingCard])

  useEffect(() => {
    const animate = () => {
      let anyVel = false
      cardStatesRef.current.forEach(st => {
        if (Math.abs(st.velX) > 0.1 || Math.abs(st.velY) > 0.1) {
          st.displayX += st.velX * 0.016 * 60
          st.displayY += st.velY * 0.016 * 60
          st.velX *= 0.82
          st.velY *= 0.82
          anyVel = true
        }
      })
      const collided = checkAndResolveCollisions()
      if (anyVel || collided) forceRender(v => v + 1)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [checkAndResolveCollisions])

  const screenToWorld = (sx: number, sy: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (sx - rect.left - offsetX) / scale,
      y: (sy - rect.top - offsetY) / scale,
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldX = (mx - offsetX) / scale
    const worldY = (my - offsetY) / scale
    const delta = -e.deltaY > 0 ? 1.1 : 1 / 1.1
    const newScale = Math.max(0.5, Math.min(2, scale * delta))
    const newOffsetX = mx - worldX * newScale
    const newOffsetY = my - worldY * newScale
    setScale(newScale)
    setOffsetX(newOffsetX)
    setOffsetY(newOffsetY)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey) || (e.button === 0 && e.metaKey)) {
      e.preventDefault()
      setPanning(true)
      panStartRef.current = { mx: e.clientX, my: e.clientY, ox: offsetX, oy: offsetY }
      setShowTypeSelector(false)
    } else if (e.button === 0 && e.target === e.currentTarget) {
      setShowTypeSelector(false)
    }
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (panning && panStartRef.current) {
        setOffsetX(panStartRef.current.ox + (e.clientX - panStartRef.current.mx))
        setOffsetY(panStartRef.current.oy + (e.clientY - panStartRef.current.my))
      }
      if (draggingCard && dragStartRef.current) {
        const w = screenToWorld(e.clientX, e.clientY)
        const state = cardStatesRef.current.get(draggingCard)
        if (state) {
          state.displayX = dragStartRef.current.cx + (w.x - dragStartRef.current.mx / scale * 0)
          const rect = wrapperRef.current?.getBoundingClientRect()
          const sx = (e.clientX - (rect?.left || 0) - offsetX) / scale
          const sy = (e.clientY - (rect?.top || 0) - offsetY) / scale
          state.displayX = dragStartRef.current.cx + (sx - dragStartRef.current.mx)
          state.displayY = dragStartRef.current.cy + (sy - dragStartRef.current.my)
          forceRender(v => v + 1)
        }
      }
    }
    const handleUp = (e: MouseEvent) => {
      if (panning) {
        setPanning(false)
        panStartRef.current = null
      }
      if (draggingCard && dragStartRef.current) {
        const state = cardStatesRef.current.get(draggingCard)
        if (state) {
          onCardPositionChange(
            draggingCard,
            Math.round(state.displayX),
            Math.round(state.displayY),
          )
        }
        setDraggingCard(null)
        dragStartRef.current = null
      }
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [panning, draggingCard, offsetX, offsetY, scale, onCardPositionChange])

  const startCardDrag = (e: React.MouseEvent, card: Card) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const w = screenToWorld(e.clientX, e.clientY)
    const state = cardStatesRef.current.get(card.id)
    dragStartRef.current = {
      mx: w.x,
      my: w.y,
      cx: state?.displayX ?? card.x,
      cy: state?.displayY ?? card.y,
      cardId: card.id,
    }
    setDraggingCard(card.id)
  }

  const gridSize = 40 * scale

  return (
    <div
      className="canvas-wrapper"
      ref={wrapperRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: panning ? 'grabbing' : undefined }}
    >
      <div className="canvas-toolbar">
        <div className="toolbar-left">
          <button className="btn btn-ghost" onClick={onBack}>
            <svg className="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回
          </button>
          <div style={{ padding: '10px 16px', background: 'rgba(22,33,62,0.8)', borderRadius: 8, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 12, color: '#a0a0b0' }}>当前画板</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: board.themeColor }}>{board.name}</div>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-ghost" onClick={onExport}>
            <svg className="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出 JSON
          </button>
          <button
            className="btn add-card-btn"
            onClick={() => setShowTypeSelector(v => !v)}
            title="添加卡片"
          >
            <span className="plus-icon">＋</span>
          </button>
        </div>
      </div>

      {showTypeSelector && (
        <div className="type-selector">
          {([
            { type: 'text' as CardType, icon: '📝', name: '文字' },
            { type: 'image' as CardType, icon: '🖼️', name: '图片' },
            { type: 'color' as CardType, icon: '🎨', name: '色块' },
          ]).map(opt => (
            <div
              key={opt.type}
              className="type-option"
              onClick={() => { onAddCard(opt.type); setShowTypeSelector(false) }}
            >
              <div className="type-option-icon">{opt.icon}</div>
              <div className="type-option-name">{opt.name}</div>
            </div>
          ))}
        </div>
      )}

      <div
        className="canvas"
        style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {board.cards.map(card => {
          const st = cardStatesRef.current.get(card.id)
          const dx = st?.displayX ?? card.x
          const dy = st?.displayY ?? card.y
          const isDragging = draggingCard === card.id
          return (
            <div
              key={card.id}
              className={`card ${isDragging ? 'dragging' : ''} ${st?.flash ? 'flash' : ''}`}
              style={{
                left: dx,
                top: dy,
                transition: isDragging ? 'none' : 'box-shadow 0.3s ease-out, border-color 0.3s ease-out',
              }}
              onMouseDown={(e) => startCardDrag(e, card)}
              onClick={(e) => {
                if (!isDragging) { e.stopPropagation(); onCardClick(card) }
              }}
            >
              <button
                className="card-delete"
                onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id) }}
                title="删除卡片"
              >
                ×
              </button>
              {card.type === 'text' && (
                <div className="card-content">
                  <span className="card-type-badge">文字</span>
                  <div className="text-card-title">
                    {(card.content as { title: string }).title || '无标题'}
                  </div>
                  <div className="text-card-body">
                    {simpleMarkdown((card.content as { body: string }).body || '')}
                  </div>
                </div>
              )}
              {card.type === 'image' && (
                <>
                  <div className="card-type-badge" style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>图片</div>
                  <div className="card-content image-card">
                    <img
                      className="image-card-img"
                      src={(card.content as { url: string }).url}
                      alt=""
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 110%22><rect fill=%22%232a2a3e%22 width=%22200%22 height=%22110%22/><text x=%22100%22 y=%2255%22 fill=%22%23a0a0b0%22 font-size=%2212%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>图片加载失败</text></svg>' }}
                      draggable={false}
                    />
                    <div className="image-card-caption">
                      {(card.content as { caption: string }).caption || '图片卡片'}
                    </div>
                  </div>
                </>
              )}
              {card.type === 'color' && (
                <div className="card-content color-card" style={{ padding: 0 }}>
                  <div
                    className="color-card-swatch"
                    style={{ background: (card.content as { color: string }).color }}
                  >
                    {(card.content as { name: string }).name || '色块'}
                  </div>
                  <div className="color-card-hex">
                    {(card.content as { color: string }).color.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="canvas-scale-display">
        缩放: {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
