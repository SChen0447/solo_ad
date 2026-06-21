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
  const baseCardWidth = 320
  const minFontScale = 0.6
  let fontScale = 1.0
  if (cardWidth < baseCardWidth) {
    const t = Math.max(0, (cardWidth - 200) / (baseCardWidth - 200))
    fontScale = minFontScale + (1.0 - minFontScale) * t
  }
  const isMobile = cardWidth < baseCardWidth
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [expandProgress, setExpandProgress] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const rippleCleanupRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const expandAnimRef = useRef<number>()
  const expandAnimStartRef = useRef<number>(0)
  const expandAnimTargetRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      rippleCleanupRef.current.forEach((timer) => clearTimeout(timer))
      if (expandAnimRef.current) {
        cancelAnimationFrame(expandAnimRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const targetProgress = isExpanded ? 1 : 0
    expandAnimTargetRef.current = targetProgress

    if (expandAnimRef.current) {
      cancelAnimationFrame(expandAnimRef.current)
    }

    expandAnimStartRef.current = performance.now()
    const startProgress = expandProgress
    const duration = 300

    const animateExpand = (nowTime: number) => {
      const elapsed = nowTime - expandAnimStartRef.current
      const t = Math.min(elapsed / duration, 1)
      const easeOutT = 1 - Math.pow(1 - t, 3)
      const newProgress = startProgress + (targetProgress - startProgress) * easeOutT
      setExpandProgress(newProgress)

      if (t < 1) {
        expandAnimRef.current = requestAnimationFrame(animateExpand)
      } else {
        setExpandProgress(targetProgress)
      }
    }

    expandAnimRef.current = requestAnimationFrame(animateExpand)

    return () => {
      if (expandAnimRef.current) {
        cancelAnimationFrame(expandAnimRef.current)
      }
    }
  }, [isExpanded])

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

  const baseScale = isHovered && settled ? 1.08 : 1
  const expandExtraScale = expandProgress * 0.25
  const finalScale = baseScale * (1 + expandExtraScale)
  const bgOpacity = 0.85 + (isHovered && settled ? 0.1 : 0) + expandProgress * 0.1
  const shadowSize = (isHovered && settled ? 10 : 0) + expandProgress * 15
  const shadowOpacity = 0.3 + expandProgress * 0.15

  const finalRotation = rotation * (1 - expandProgress * 0.5)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: cardWidth,
    transform: `translate(${x}px, ${y}px) rotate(${finalRotation}deg) scale(${finalScale})`,
    opacity,
    cursor: settled ? 'pointer' : 'default',
    transition: settled
      ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease'
      : 'opacity 0.3s ease',
    transformOrigin: 'center center',
    zIndex: isExpanded ? 200 : isHovered ? 10 : 1,
    willChange: 'transform, opacity'
  }

  const innerStyle: React.CSSProperties = {
    backgroundColor: `rgba(250, 240, 230, ${Math.min(bgOpacity, 0.98)})`,
    borderRadius: 8 + expandProgress * 8,
    padding: `${20 + expandProgress * 10}px ${24 + expandProgress * 16}px`,
    boxShadow: shadowSize
      ? `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, ${shadowOpacity}), 0 0 0 ${Math.max(shadowSize - 5, 0)}px rgba(0, 0, 0, 0.08)`
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease, border-radius 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid rgba(139, 69, 19, ${0.2 + expandProgress * 0.15})`
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

  const titleClass = 'poem-card-title'
  const authorClass = 'poem-card-author'
  const contentClass = 'poem-card-content'
  const notesClass = 'poem-card-notes'

  const titleStyle: React.CSSProperties = {
    fontSize: 24 * fontScale + expandProgress * 4,
    fontWeight: 'bold',
    color: '#4A3728',
    marginBottom: 8,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center',
    letterSpacing: `${expandProgress * 2}px`
  }

  const authorStyle: React.CSSProperties = {
    fontSize: 14 * fontScale + expandProgress * 2,
    color: '#8B4513',
    marginBottom: 16,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center'
  }

  const contentStyle: React.CSSProperties = {
    fontSize: 18 * fontScale + expandProgress * 3,
    color: '#4A3728',
    lineHeight: 1.8 + expandProgress * 0.2,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    textAlign: 'center'
  }

  const notesContainerStyle: React.CSSProperties = {
    maxHeight: expandProgress > 0.01 ? (200 * expandProgress + 20) : 0,
    opacity: expandProgress,
    overflow: 'hidden',
    marginTop: 16 * expandProgress,
    paddingTop: 12 * expandProgress,
    borderTop: expandProgress > 0.01 ? '1px dashed rgba(139, 69, 19, 0.3)' : 'none',
    transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out, margin-top 0.3s ease-out, padding-top 0.3s ease-out'
  }

  const notesStyle: React.CSSProperties = {
    fontSize: 14 * fontScale + expandProgress * 2,
    color: '#6B5344',
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    lineHeight: 1.6 + expandProgress * 0.1
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
            <p key={index} style={{ margin: `${4 + expandProgress * 2}px 0` }}>
              {line}
            </p>
          ))}
        </div>
        <div style={notesContainerStyle}>
          <div style={notesStyle} className={notesClass}>
            <strong style={{ color: '#8B4513' }}>注释：</strong>
            {poem.notes}
          </div>
        </div>
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
