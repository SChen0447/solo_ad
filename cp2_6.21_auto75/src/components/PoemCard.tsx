import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import type { Poem, Ripple } from '../types'
import { generateId } from '../utils'

interface PoemCardProps {
  poem: Poem
  x: number
  y: number
  rotation: number
  opacity: number
  settled: boolean
  isExpanded: boolean
  cardWidth: number
  onCardClick: (poemId: number) => void
}

const PoemCard: React.FC<PoemCardProps> = memo(function PoemCard({
  poem,
  x,
  y,
  rotation,
  opacity,
  settled,
  isExpanded,
  cardWidth,
  onCardClick
}) {
  const isMobile = cardWidth < 320
  const fontScale = isMobile ? 0.8 : 1
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const rippleCleanupRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      rippleCleanupRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const rippleX = e.clientX - rect.left
      const rippleY = e.clientY - rect.top
      const rippleId = generateId()

      const newRipple: Ripple = {
        id: rippleId,
        x: rippleX,
        y: rippleY,
        start: Date.now()
      }

      setRipples((prev) => [...prev, newRipple])

      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== rippleId))
        rippleCleanupRef.current.delete(rippleId)
      }, 500)

      rippleCleanupRef.current.set(rippleId, timer)
      onCardClick(poem.id)
    },
    [poem.id, onCardClick]
  )

  const scale = isHovered && settled ? 1.08 : 1
  const bgOpacity = isHovered && settled ? 0.95 : 0.85
  const shadowSize = isHovered && settled ? 10 : 0

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: cardWidth,
    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
    opacity,
    cursor: settled ? 'pointer' : 'default',
    transition: isExpanded
      ? 'transform 0.3s ease-out, opacity 0.3s ease'
      : settled
      ? 'transform 0.25s ease, opacity 0.3s ease'
      : 'opacity 0.3s ease',
    transformOrigin: 'center center',
    zIndex: isExpanded ? 100 : isHovered ? 10 : 1,
    willChange: 'transform, opacity'
  }

  const titleClass = 'poem-card-title'
  const authorClass = 'poem-card-author'
  const contentClass = 'poem-card-content'
  const notesClass = 'poem-card-notes'

  const innerStyle: React.CSSProperties = {
    backgroundColor: `rgba(250, 240, 230, ${bgOpacity})`,
    borderRadius: 8,
    padding: '20px 24px',
    boxShadow: shadowSize
      ? `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, 0.3), 0 0 0 ${shadowSize}px rgba(0, 0, 0, 0.1)`
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(139, 69, 19, 0.2)'
  }

  const paperTexture: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
    opacity: 0.5
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 24 * fontScale,
    fontWeight: 'bold',
    color: '#4A3728',
    marginBottom: 8,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center'
  }

  const authorStyle: React.CSSProperties = {
    fontSize: 14 * fontScale,
    color: '#8B4513',
    marginBottom: 16,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center'
  }

  const contentStyle: React.CSSProperties = {
    fontSize: 18 * fontScale,
    color: '#4A3728',
    lineHeight: 1.8,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center'
  }

  const notesStyle: React.CSSProperties = {
    fontSize: 14 * fontScale,
    color: '#6B5344',
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px dashed rgba(139, 69, 19, 0.3)',
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    lineHeight: 1.6
  }

  return (
    <div
      ref={cardRef}
      className="poem-card"
      style={cardStyle}
      onMouseEnter={() => settled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div style={innerStyle} className="poem-card-inner">
        <div style={paperTexture} />
        <h3 style={titleStyle} className={titleClass}>{poem.title}</h3>
        <p style={authorStyle} className={authorClass}>
          【{poem.dynasty}】{poem.author}
        </p>
        <div style={contentStyle} className={contentClass}>
          {poem.content.map((line, index) => (
            <p key={index} style={{ margin: '4px 0' }}>
              {line}
            </p>
          ))}
        </div>
        {isExpanded && (
          <div style={notesStyle} className={notesClass}>
            <strong style={{ color: '#8B4513' }}>注释：</strong>
            {poem.notes}
          </div>
        )}
        {ripples.map((ripple) => (
          <RippleEffect key={ripple.id} x={ripple.x} y={ripple.y} />
        ))}
      </div>
    </div>
  )
})

interface RippleEffectProps {
  x: number
  y: number
}

const RippleEffect: React.FC<RippleEffectProps> = ({ x, y }) => {
  const [progress, setProgress] = useState(0)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min(elapsed / 500, 1)
      setProgress(newProgress)

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const radius = progress * 60
  const opacity = 0.6 * (1 - progress)

  const rippleStyle: React.CSSProperties = {
    position: 'absolute',
    left: x - radius,
    top: y - radius,
    width: radius * 2,
    height: radius * 2,
    borderRadius: '50%',
    border: `2px solid rgba(139, 69, 19, ${opacity})`,
    pointerEvents: 'none',
    transform: 'translateZ(0)'
  }

  return <div style={rippleStyle} />
}

export default PoemCard
