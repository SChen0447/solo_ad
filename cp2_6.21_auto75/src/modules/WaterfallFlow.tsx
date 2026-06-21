import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import PoemCard from '../components/PoemCard'
import { getFilteredPoems } from '../poemData'
import { random, debounce } from '../utils'
import type { CardState, DynastyOption, Poem } from '../types'

interface WaterfallFlowProps {
  searchQuery: string
  selectedDynasty: DynastyOption
  expandedCardId: number | null
  onCardClick: (poemId: number) => void
}

const CARD_WIDTH_DEFAULT = 320
const CARD_VERTICAL_GAP = 60
const CARD_HORIZONTAL_GAP = 30
const BATCH_SIZE = 10
const FALL_SPEED_MIN = 1.5
const FALL_SPEED_MAX = 3
const SETTLE_AREA_TOP = 100
const MOBILE_BREAKPOINT = 768

const WaterfallFlow: React.FC<WaterfallFlowProps> = ({
  searchQuery,
  selectedDynasty,
  expandedCardId,
  onCardClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cards, setCards] = useState<CardState[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const [showEmptyTip, setShowEmptyTip] = useState(false)
  const animationFrameRef = useRef<number>()
  const columnsRef = useRef<number>(3)
  const containerWidthRef = useRef<number>(0)
  const cardWidthRef = useRef<number>(CARD_WIDTH_DEFAULT)
  const lastSettledYRef = useRef<number[]>([0, 0, 0])
  const allPoemsRef = useRef<Poem[]>([])
  const loadedCountRef = useRef(0)
  const isLoadingRef = useRef(false)

  const initColumns = useCallback((containerWidth: number) => {
    const padding = 60
    const availableWidth = containerWidth - padding

    if (containerWidth < MOBILE_BREAKPOINT) {
      columnsRef.current = 1
      cardWidthRef.current = availableWidth
    } else {
      const cols = Math.floor(
        (availableWidth + CARD_HORIZONTAL_GAP) /
          (CARD_WIDTH_DEFAULT + CARD_HORIZONTAL_GAP)
      )
      columnsRef.current = Math.max(1, Math.min(cols, 5))
      cardWidthRef.current = CARD_WIDTH_DEFAULT
    }
    lastSettledYRef.current = new Array(columnsRef.current).fill(0)
  }, [])

  const getColumnX = useCallback((colIndex: number, containerWidth: number) => {
    const cardWidth = cardWidthRef.current
    const totalWidth =
      columnsRef.current * cardWidth +
      (columnsRef.current - 1) * CARD_HORIZONTAL_GAP
    const startX = (containerWidth - 60 - totalWidth) / 2 + 30
    return startX + colIndex * (cardWidth + CARD_HORIZONTAL_GAP)
  }, [])

  const getShortestColumn = useCallback(() => {
    let minIndex = 0
    let minValue = lastSettledYRef.current[0]
    for (let i = 1; i < lastSettledYRef.current.length; i++) {
      if (lastSettledYRef.current[i] < minValue) {
        minValue = lastSettledYRef.current[i]
        minIndex = i
      }
    }
    return minIndex
  }, [])

  const createCardState = useCallback(
    (poem: Poem, containerWidth: number): CardState => {
      const colIndex = getShortestColumn()
      const baseX = getColumnX(colIndex, containerWidth)
      const cardWidth = cardWidthRef.current
      const maxOffset = Math.min(80, cardWidth * 0.2)
      const offsetX = random(-maxOffset, maxOffset)
      const rotation = random(-5, 5)
      const speed = random(FALL_SPEED_MIN, FALL_SPEED_MAX)

      const estimatedHeight =
        80 + poem.content.length * 32 + 40 + (poem.notes ? 60 : 0)
      const settledY =
        lastSettledYRef.current[colIndex] + SETTLE_AREA_TOP

      lastSettledYRef.current[colIndex] =
        settledY + estimatedHeight + CARD_VERTICAL_GAP

      return {
        id: poem.id,
        poem,
        x: baseX + offsetX,
        y: -300 - random(0, 200),
        rotation,
        opacity: 0,
        speed,
        settled: false,
        settledY,
        scale: 1
      }
    },
    [getColumnX, getShortestColumn]
  )

  const loadMoreCards = useCallback(
    (count: number) => {
      if (isLoadingRef.current) return
      if (loadedCountRef.current >= allPoemsRef.current.length) return

      isLoadingRef.current = true
      const containerWidth = containerWidthRef.current
      if (!containerWidth) return

      const startIndex = loadedCountRef.current
      const endIndex = Math.min(
        startIndex + count,
        allPoemsRef.current.length
      )
      const newPoems = allPoemsRef.current.slice(startIndex, endIndex)

      if (newPoems.length === 0) {
        isLoadingRef.current = false
        return
      }

      const newCards: CardState[] = newPoems.map((poem) =>
        createCardState(poem, containerWidth)
      )

      setCards((prev) => [...prev, ...newCards])
      loadedCountRef.current = endIndex
      isLoadingRef.current = false
    },
    [createCardState]
  )

  const resetCards = useCallback(() => {
    setIsFiltering(true)
    setCards([])
    loadedCountRef.current = 0
    lastSettledYRef.current = new Array(columnsRef.current).fill(0)
    isLoadingRef.current = false

    setTimeout(() => {
      const filtered = getFilteredPoems(selectedDynasty, searchQuery)
      const shuffled = [...filtered].sort(() => Math.random() - 0.5)
      allPoemsRef.current = shuffled
      setShowEmptyTip(shuffled.length === 0)

      if (shuffled.length > 0) {
        const containerWidth = containerWidthRef.current
        if (containerWidth) {
          initColumns(containerWidth)
          const initialCount = Math.min(BATCH_SIZE * 2, shuffled.length)
          const initialCards: CardState[] = []

          for (let i = 0; i < initialCount; i++) {
            initialCards.push(
              createCardState(shuffled[i], containerWidth)
            )
          }
          setCards(initialCards)
          loadedCountRef.current = initialCount
        }
      }

      setIsFiltering(false)
    }, 300)
  }, [selectedDynasty, searchQuery, createCardState, initColumns])

  useEffect(() => {
    resetCards()
  }, [selectedDynasty, searchQuery])

  useEffect(() => {
    const updateAnimation = () => {
      setCards((prevCards) => {
        return prevCards.map((card) => {
          if (card.settled) return card

          const newY = card.y + card.speed
          const newOpacity = Math.min(card.opacity + 0.02, 1)

          if (newY >= card.settledY) {
            return {
              ...card,
              y: card.settledY,
              opacity: 1,
              settled: true
            }
          }

          return {
            ...card,
            y: newY,
            opacity: newOpacity
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(updateAnimation)
    }

    animationFrameRef.current = requestAnimationFrame(updateAnimation)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = debounce(() => {
      const container = containerRef.current
      if (!container) return

      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreCards(BATCH_SIZE)
      }
    }, 100)

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [loadMoreCards])

  useEffect(() => {
    const handleResize = debounce(() => {
      const container = containerRef.current
      if (!container) return
      containerWidthRef.current = container.clientWidth
    }, 150)

    const container = containerRef.current
    if (container) {
      containerWidthRef.current = container.clientWidth
      initColumns(container.clientWidth)
      window.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [initColumns])

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#1A252F',
    padding: '30px',
    overflowY: 'auto',
    overflowX: 'hidden',
    borderRadius: 8,
    transition: 'opacity 0.3s ease'
  }

  const emptyTipStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 20,
    color: '#A0A0A0',
    textAlign: 'center',
    opacity: showEmptyTip ? 1 : 0,
    transition: 'opacity 0.5s ease',
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    pointerEvents: 'none'
  }

  const maxSettledY = useMemo(() => {
    return Math.max(...lastSettledYRef.current, 0)
  }, [cards.length])

  return (
    <div
      ref={containerRef}
      style={{
        ...containerStyle,
        opacity: isFiltering ? 0 : 1
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: maxSettledY + 500
        }}
      >
        {cards.map((card) => (
          <PoemCard
            key={card.id}
            poem={card.poem}
            x={card.x}
            y={card.y}
            rotation={card.rotation}
            opacity={card.opacity}
            settled={card.settled}
            isExpanded={expandedCardId === card.id}
            cardWidth={cardWidthRef.current}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <div style={emptyTipStyle}>
        烟雨朦胧，未寻得此朝佳句
      </div>
    </div>
  )
}

export default WaterfallFlow
