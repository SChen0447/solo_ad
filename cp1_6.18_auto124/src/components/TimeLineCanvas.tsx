import { useEffect, useRef, useCallback } from 'react'
import { TimeLineEngine } from '../modules/TimeLineEngine'
import { Card, useGridStore } from '../modules/GridStore'

interface TimeLineCanvasProps {
  onCardDoubleClick: (card: Card) => void
  onCardHover: (card: Card | null) => void
}

export const TimeLineCanvas = ({ onCardDoubleClick, onCardHover }: TimeLineCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<TimeLineEngine | null>(null)
  const cards = useGridStore(state => state.cards)
  const viewportWidth = useGridStore(state => state.viewportWidth)
  const viewportHeight = useGridStore(state => state.viewportHeight)
  const setScrollX = useGridStore(state => state.setScrollX)
  const setZoom = useGridStore(state => state.setZoom)
  const setFocusedCard = useGridStore(state => state.setFocusedCard)
  const clearNewFlag = useGridStore(state => state.clearNewFlag)
  const clearUpdatingFlag = useGridStore(state => state.clearUpdatingFlag)

  const handleScroll = useCallback((scrollX: number) => {
    setScrollX(scrollX)
  }, [setScrollX])

  const handleCenterCardChange = useCallback((card: Card | null) => {
    setFocusedCard(card?.id || null)
  }, [setFocusedCard])

  const handleCardDoubleClick = useCallback((card: Card) => {
    onCardDoubleClick(card)
  }, [onCardDoubleClick])

  const handleCardHover = useCallback((card: Card | null) => {
    onCardHover(card)
  }, [onCardHover])

  useEffect(() => {
    if (!containerRef.current) return

    const engine = new TimeLineEngine({
      container: containerRef.current,
      viewportWidth,
      viewportHeight: viewportHeight - 120,
      onCardDoubleClick: handleCardDoubleClick,
      onCardHover: handleCardHover,
      onScroll: handleScroll,
      onCenterCardChange: handleCenterCardChange
    })

    engineRef.current = engine
    containerRef.current.style.cursor = 'grab'

    return () => {
      engine.destroy()
    }
  }, [viewportWidth, viewportHeight, handleCardDoubleClick, handleCardHover, handleScroll, handleCenterCardChange])

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.render(cards)

      const newCards = cards.filter(c => c.isNew)
      const updatingCards = cards.filter(c => c.isUpdating)

      for (const card of newCards) {
        setTimeout(() => {
          clearNewFlag(card.id)
        }, 350)
      }

      for (const card of updatingCards) {
        setTimeout(() => {
          clearUpdatingFlag(card.id)
        }, 450)
      }
    }
  }, [cards, clearNewFlag, clearUpdatingFlag])

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setZoom(useGridStore.getState().zoom)
    }
  }, [cards.length])

  return (
    <div
      ref={containerRef}
      className="timeline-canvas"
      style={{
        width: '100%',
        height: 'calc(100vh - 180px)',
        backgroundColor: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  )
}
