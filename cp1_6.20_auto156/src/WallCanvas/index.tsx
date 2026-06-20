import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3Force from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'
import { moodApi, moodWS } from '@/api'
import { getMoodConfig } from '@/types'
import type { MoodCard, MoodType } from '@/types'
import './style.css'

interface CardNode extends SimulationNodeDatum {
  id: string
  mood: MoodType
  content: string
  memberName: string
  createdAt: string
  keywords: string[]
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  dragging?: boolean
}

interface WallCanvasProps {
  moodFilter?: MoodType | 'all'
}

const MIN_CARD_WIDTH = 160
const MAX_CARD_WIDTH = 240
const CARD_PADDING = 16
const SPRING_COEFFICIENT = 0.003
const DAMPING = 0.85
const INERTIA_DURATION = 300
const VIRTUAL_THRESHOLD = 50

function WallCanvas({ moodFilter = 'all' }: WallCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cards, setCards] = useState<CardNode[]>([])
  const [viewport, setViewport] = useState({ width: 800, height: 600 })
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 })
  const simulationRef = useRef<d3Force.Simulation<CardNode, undefined> | null>(null)
  const dragStateRef = useRef<{
    dragging: boolean
    dragNode: CardNode | null
    startX: number
    startY: number
    nodeStartX: number
    nodeStartY: number
    lastX: number
    lastY: number
    lastTime: number
    velocityX: number
    velocityY: number
  }>({
    dragging: false,
    dragNode: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  })
  const animationRef = useRef<number>(0)
  const cardsRef = useRef<CardNode[]>([])
  const loaded = useRef(false)

  const filteredCards = useMemo(() => {
    if (moodFilter === 'all') return cards
    return cards.filter(c => c.mood === moodFilter)
  }, [cards, moodFilter])

  const estimateCardSize = (content: string) => {
    const width = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, 160 + content.length * 1.5))
    const lines = Math.ceil(content.length / 18)
    const height = 100 + lines * 20 + CARD_PADDING * 2
    return { width, height }
  }

  const initializeCards = useCallback((moodCards: MoodCard[]) => {
    if (!containerRef.current) return
    const w = containerRef.current.clientWidth
    const h = containerRef.current.clientHeight

    const nodes: CardNode[] = moodCards.map(card => {
      const { width, height } = estimateCardSize(card.content)
      return {
        ...card,
        x: Math.random() * (w - width) + width / 2,
        y: Math.random() * (h - height) + height / 2,
        vx: 0,
        vy: 0,
        width,
        height,
      }
    })

    cardsRef.current = nodes
    setCards(nodes)
    setupSimulation(nodes, w, h)
  }, [])

  const setupSimulation = (nodes: CardNode[], width: number, height: number) => {
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    const simulation = d3Force.forceSimulation<CardNode>(nodes)
      .force('charge', d3Force.forceManyBody().strength(-120))
      .force('center', d3Force.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3Force.forceCollide<CardNode>().radius(d => Math.max(d.width, d.height) / 2 + 10))
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .on('tick', () => {
        constrainToBounds(nodes, width, height)
        cardsRef.current = [...nodes]
        setCards([...nodes])
      })

    simulationRef.current = simulation
  }

  const constrainToBounds = (nodes: CardNode[], width: number, height: number) => {
    nodes.forEach(node => {
      if (node.dragging) return

      const halfW = node.width / 2
      const halfH = node.height / 2

      if (node.x < halfW) {
        const force = (halfW - node.x) * SPRING_COEFFICIENT
        node.vx += force
        node.vx *= DAMPING
      } else if (node.x > width - halfW) {
        const force = (width - halfW - node.x) * SPRING_COEFFICIENT
        node.vx += force
        node.vx *= DAMPING
      }

      if (node.y < halfH) {
        const force = (halfH - node.y) * SPRING_COEFFICIENT
        node.vy += force
        node.vy *= DAMPING
      } else if (node.y > height - halfH) {
        const force = (height - halfH - node.y) * SPRING_COEFFICIENT
        node.vy += force
        node.vy *= DAMPING
      }
    })
  }

  useEffect(() => {
    const loadCards = async () => {
      try {
        const data = await moodApi.getCards()
        initializeCards(data)
        loaded.current = true
      } catch (e) {
        console.error('加载卡片失败', e)
      }
    }
    loadCards()

    const unsubscribe = moodWS.subscribe((newCard) => {
      if (!containerRef.current || !simulationRef.current) return

      const { width, height } = estimateCardSize(newCard.content)
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight

      const newNode: CardNode = {
        ...newCard,
        x: w / 2 + (Math.random() - 0.5) * 100,
        y: h / 2 + (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
        width,
        height,
      }

      const currentNodes = [...cardsRef.current, newNode]
      cardsRef.current = currentNodes
      setCards(currentNodes)
      simulationRef.current.nodes(currentNodes)
      simulationRef.current.alpha(0.3).restart()
    })

    moodWS.connect()

    return () => {
      unsubscribe()
      moodWS.disconnect()
    }
  }, [initializeCards])

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      setViewport({ width: w, height: h })

      if (simulationRef.current) {
        simulationRef.current.force('center', d3Force.forceCenter(w / 2, h / 2).strength(0.05))
        simulationRef.current.alpha(0.1).restart()
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + scrollOffset.x,
      y: e.clientY - rect.top + scrollOffset.y,
    }
  }

  const handleMouseDown = (e: React.MouseEvent, node: CardNode) => {
    e.preventDefault()
    const pos = getMousePos(e)

    dragStateRef.current = {
      dragging: true,
      dragNode: node,
      startX: pos.x,
      startY: pos.y,
      nodeStartX: node.x,
      nodeStartY: node.y,
      lastX: pos.x,
      lastY: pos.y,
      lastTime: Date.now(),
      velocityX: 0,
      velocityY: 0,
    }

    node.dragging = true
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.dragging || !dragStateRef.current.dragNode) return

      const pos = getMousePos(e)
      const node = dragStateRef.current.dragNode
      const now = Date.now()
      const dt = now - dragStateRef.current.lastTime

      if (dt > 0) {
        dragStateRef.current.velocityX = (pos.x - dragStateRef.current.lastX) / dt * 16
        dragStateRef.current.velocityY = (pos.y - dragStateRef.current.lastY) / dt * 16
      }

      node.x = pos.x
      node.y = pos.y
      node.vx = 0
      node.vy = 0

      dragStateRef.current.lastX = pos.x
      dragStateRef.current.lastY = pos.y
      dragStateRef.current.lastTime = now

      if (simulationRef.current) {
        simulationRef.current.alpha(0.3).restart()
      }
    }

    const handleMouseUp = () => {
      if (!dragStateRef.current.dragging || !dragStateRef.current.dragNode) return

      const node = dragStateRef.current.dragNode
      node.dragging = false
      node.vx = dragStateRef.current.velocityX
      node.vy = dragStateRef.current.velocityY

      dragStateRef.current.dragging = false
      dragStateRef.current.dragNode = null

      if (simulationRef.current) {
        simulationRef.current.alpha(0.2).restart()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [scrollOffset])

  const drawConnections = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const visibleCards = filteredCards

    const moodGroups: Record<string, CardNode[]> = {}
    visibleCards.forEach(card => {
      if (!moodGroups[card.mood]) {
        moodGroups[card.mood] = []
      }
      moodGroups[card.mood].push(card)
    })

    Object.entries(moodGroups).forEach(([mood, group]) => {
      if (group.length < 2) return

      const moodConfig = getMoodConfig(mood as MoodType)
      ctx.strokeStyle = moodConfig.color
      ctx.globalAlpha = 0.25
      ctx.lineWidth = 1

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i]
          const b = group[j]
          const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
          const maxDist = 300

          if (dist < maxDist) {
            ctx.globalAlpha = 0.25 * (1 - dist / maxDist)
            ctx.beginPath()
            ctx.moveTo(a.x - scrollOffset.x, a.y - scrollOffset.y)
            ctx.lineTo(b.x - scrollOffset.x, b.y - scrollOffset.y)
            ctx.stroke()
          }
        }
      }
    })

    ctx.globalAlpha = 1
  }, [filteredCards, scrollOffset])

  useEffect(() => {
    const animate = () => {
      drawConnections()
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [drawConnections])

  const isInViewport = (card: CardNode) => {
    if (cards.length <= VIRTUAL_THRESHOLD) return true
    return (
      card.x + card.width / 2 > scrollOffset.x - 100 &&
      card.x - card.width / 2 < scrollOffset.x + viewport.width + 100 &&
      card.y + card.height / 2 > scrollOffset.y - 100 &&
      card.y - card.height / 2 < scrollOffset.y + viewport.height + 100
    )
  }

  const visibleCards = useMemo(() => {
    return filteredCards.filter(isInViewport)
  }, [filteredCards, scrollOffset, viewport, cards.length])

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setScrollOffset(prev => ({
      x: prev.x + e.deltaX,
      y: prev.y + e.deltaY,
    }))
  }

  return (
    <div
      ref={containerRef}
      className="wall-canvas-container"
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        width={viewport.width}
        height={viewport.height}
        className="connections-canvas"
      />

      <div className="cards-container">
        <AnimatePresence>
          {visibleCards.map(card => {
            const moodConfig = getMoodConfig(card.mood)
            return (
              <motion.div
                key={card.id}
                className="mood-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: card.x - card.width / 2 - scrollOffset.x,
                  y: card.y - card.height / 2 - scrollOffset.y,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  width: card.width,
                  minHeight: card.height,
                  background: `linear-gradient(to bottom, ${moodConfig.color} 40px, #FFFFFF 40px)`,
                  cursor: card.dragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={(e) => handleMouseDown(e, card)}
              >
                <div className="card-header">
                  <span className="card-mood">{moodConfig.label}</span>
                  <span className="card-time">{formatTime(card.createdAt)}</span>
                </div>
                <div className="card-content">{card.content}</div>
                {card.keywords.length > 0 && (
                  <div className="card-keywords">
                    {card.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="card-keyword" style={{ borderColor: moodConfig.color, color: moodConfig.color }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                <div className="card-footer">
                  <span className="card-author">— {card.memberName}</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {cards.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌈</div>
          <div className="empty-text">还没有情绪记录</div>
          <div className="empty-subtext">快去记录第一条情绪吧~</div>
        </div>
      )}

      <div className="card-count">
        共 {filteredCards.length} 条情绪
      </div>
    </div>
  )
}

function formatTime(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString()
  } catch {
    return ''
  }
}

export default WallCanvas
