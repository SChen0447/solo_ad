import { useRef, useEffect, useCallback, useState } from 'react'
import { Card, useGridStore } from '../modules/GridStore'

export const Minimap = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const cards = useGridStore(state => state.cards)
  const scrollX = useGridStore(state => state.scrollX)
  const zoom = useGridStore(state => state.zoom)
  const viewportWidth = useGridStore(state => state.viewportWidth)
  const viewportHeight = useGridStore(state => state.viewportHeight)
  const setScrollX = useGridStore(state => state.setScrollX)
  const focusedCardId = useGridStore(state => state.focusedCardId)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartScrollX, setDragStartScrollX] = useState(0)

  const minimapHeight = 60
  const cardDotSize = 8
  const contentPadding = 16

  const getTotalWidth = useCallback(() => {
    if (cards.length === 0) return viewportWidth
    const cardWidth = 280 * zoom
    const spacing = 120 * zoom
    const baseX = viewportWidth / 2
    const lastCardX = baseX + (cards.length - 1) * (cardWidth + spacing)
    return lastCardX + cardWidth + baseX
  }, [cards.length, zoom, viewportWidth])

  const totalWidth = getTotalWidth()
  const scale = (viewportWidth - contentPadding * 2) / Math.max(totalWidth, viewportWidth)

  const getCardMinimapX = useCallback((card: Card) => {
    const index = cards.findIndex(c => c.id === card.id)
    if (index === -1) return 0
    const baseX = viewportWidth / 2
    const cardWidth = 280 * zoom
    const spacing = 120 * zoom
    const cardX = baseX + index * (cardWidth + spacing) + cardWidth / 2
    return contentPadding + cardX * scale
  }, [cards, zoom, viewportWidth, scale])

  const viewportLeft = contentPadding + scrollX * scale
  const viewportRight = contentPadding + (scrollX + viewportWidth) * scale
  const viewportRectWidth = viewportRight - viewportLeft

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    const target = e.target as HTMLElement
    if (target.classList.contains('minimap-viewport') ||
        target.closest('.minimap-viewport')) {
      setIsDragging(true)
      setDragStartX(e.clientX)
      setDragStartScrollX(scrollX)
    } else {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const clickX = e.clientX - rect.left
        const newScrollX = (clickX - contentPadding - viewportRectWidth / 2) / scale
        setScrollX(Math.max(0, Math.min(totalWidth - viewportWidth, newScrollX)))
      }
    }
  }, [scrollX, viewportRectWidth, scale, setScrollX, totalWidth, viewportWidth])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartX
    const scrollDelta = deltaX / scale
    const newScrollX = Math.max(0, Math.min(totalWidth - viewportWidth, dragStartScrollX - scrollDelta))
    setScrollX(newScrollX)
  }, [isDragging, dragStartX, dragStartScrollX, scale, setScrollX, totalWidth, viewportWidth])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleCardClick = useCallback((card: Card) => {
    const targetX = card.x - viewportWidth / 2 + (280 * zoom) / 2
    setScrollX(Math.max(0, Math.min(totalWidth - viewportWidth, targetX)))
  }, [viewportWidth, zoom, setScrollX, totalWidth])

  return (
    <div
      ref={containerRef}
      className="minimap"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '1200px',
        height: `${minimapHeight}px`,
        backgroundColor: 'rgba(22, 33, 62, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(160, 174, 192, 0.2)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s ease',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 0, 0, 0.4)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {cards.length >= 2 && cards.map((card, index) => {
          if (index === cards.length - 1) return null
          const nextCard = cards[index + 1]
          const x1 = getCardMinimapX(card)
          const x2 = getCardMinimapX(nextCard)
          const y = minimapHeight / 2

          return (
            <line
              key={`line-${card.id}-${nextCard.id}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="rgba(79, 209, 197, 0.3)"
              strokeWidth="1"
            />
          )
        })}
      </svg>

      {cards.map((card) => {
        const x = getCardMinimapX(card)
        const isFocused = card.id === focusedCardId

        return (
          <div
            key={card.id}
            className="minimap-card-dot"
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick(card)
            }}
            style={{
              position: 'absolute',
              left: `${x - cardDotSize / 2}px`,
              top: `${minimapHeight / 2 - cardDotSize / 2}px`,
              width: `${isFocused ? cardDotSize + 4 : cardDotSize}px`,
              height: `${isFocused ? cardDotSize + 4 : cardDotSize}px`,
              borderRadius: '50%',
              backgroundColor: card.color,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isFocused
                ? `0 0 12px ${card.color}, 0 0 20px ${card.color}60`
                : `0 0 6px ${card.color}80`,
              transform: isFocused ? 'scale(1.2)' : 'scale(1)',
              zIndex: isFocused ? 2 : 1
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.3)'
              e.currentTarget.style.boxShadow = `0 0 16px ${card.color}, 0 0 24px ${card.color}60`
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = isFocused ? 'scale(1.2)' : 'scale(1)'
              e.currentTarget.style.boxShadow = isFocused
                ? `0 0 12px ${card.color}, 0 0 20px ${card.color}60`
                : `0 0 6px ${card.color}80`
            }}
          />
        )
      })}

      <div
        ref={viewportRef}
        className="minimap-viewport"
        style={{
          position: 'absolute',
          top: '4px',
          left: `${viewportLeft}px`,
          width: `${viewportRectWidth}px`,
          height: `${minimapHeight - 8}px`,
          backgroundColor: 'rgba(255, 165, 0, 0.2)',
          border: '2px solid rgba(255, 165, 0, 0.6)',
          borderRadius: '6px',
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          transition: 'background-color 0.2s ease, border-color 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 165, 0, 0.3)'
          e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.8)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 165, 0, 0.2)'
          e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.6)'
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '8px',
          fontSize: '10px',
          color: 'var(--text-note)',
          opacity: 0.7
        }}
      >
        {cards.length} 个节点
      </div>
    </div>
  )
}
