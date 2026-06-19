import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { KeywordInputProps } from '../types'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  initialSize: number
  alpha: number
  color: string
  fadeColor: string
  born: number
  maxLife: number
}

const SendIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const RocketIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bl})`
}

const PARTICLE_LIFE = 400

const KeywordInput: React.FC<KeywordInputProps> = ({ onSubmit, disabled }) => {
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rocket, setRocket] = useState<{ x: number; y: number } | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const particleLoopRef = useRef<number | null>(null)

  const spawnTrailParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const now = performance.now()
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particleIdRef.current += 1
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2
      const speed = 1.5 + Math.random() * 2.5
      const size = 3 + Math.random() * 5
      newParticles.push({
        id: particleIdRef.current,
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.6,
        vy: Math.sin(angle) * speed * 0.8,
        size,
        initialSize: size,
        alpha: 1,
        color,
        fadeColor: '#ffffff',
        born: now,
        maxLife: PARTICLE_LIFE + Math.random() * 150
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
  }, [])

  const spawnBurstParticles = useCallback((x: number, y: number, color: string) => {
    const now = performance.now()
    const newParticles: Particle[] = []
    for (let i = 0; i < 24; i++) {
      particleIdRef.current += 1
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
      const size = 4 + Math.random() * 5
      newParticles.push({
        id: particleIdRef.current,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        initialSize: size,
        alpha: 1,
        color,
        fadeColor: '#ffffff',
        born: now,
        maxLife: PARTICLE_LIFE + Math.random() * 200
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
  }, [])

  useEffect(() => {
    if (particles.length === 0) return

    const tick = () => {
      const now = performance.now()
      setParticles((prev) => {
        const alive = prev
          .map((p) => {
            const age = now - p.born
            const lifeRatio = Math.max(0, 1 - age / p.maxLife)
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.05,
              vx: p.vx * 0.98,
              size: p.initialSize * (0.2 + 0.8 * lifeRatio),
              alpha: lifeRatio * lifeRatio
            }
          })
          .filter((p) => p.alpha > 0.01)
        return alive
      })
      particleLoopRef.current = requestAnimationFrame(tick)
    }
    particleLoopRef.current = requestAnimationFrame(tick)

    return () => {
      if (particleLoopRef.current) {
        cancelAnimationFrame(particleLoopRef.current)
      }
    }
  }, [particles.length > 0])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (particleLoopRef.current) {
        cancelAnimationFrame(particleLoopRef.current)
      }
    }
  }, [])

  const animateRocket = useCallback((
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    color: string
  ) => {
    const startTime = performance.now()
    const duration = 500
    let lastTrailTime = 0

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const easeT = 1 - Math.pow(1 - t, 3)

      const currentX = startX + (targetX - startX) * easeT
      const currentY = startY + (targetY - startY) * easeT

      setRocket({ x: currentX, y: currentY })

      if (now - lastTrailTime > 20) {
        spawnTrailParticles(currentX, currentY + 12, color, 3)
        lastTrailTime = now
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        spawnBurstParticles(targetX, targetY, color)
        setTimeout(() => setRocket(null), 80)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [spawnTrailParticles, spawnBurstParticles])

  const handleSubmit = useCallback(() => {
    const trimmed = keyword.trim().slice(0, 10)
    if (!trimmed || disabled || !inputRef.current || !containerRef.current) return

    const input = inputRef.current
    const containerRect = containerRef.current.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()

    const startX = inputRect.left + inputRect.width / 2 - containerRect.left
    const startY = inputRect.top - containerRect.top
    const targetX = containerRect.width / 2
    const targetY = 20

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0ea5e9'

    animateRocket(startX, startY, targetX, targetY, primaryColor)

    onSubmit(trimmed)
    setKeyword('')
  }, [keyword, disabled, onSubmit, animateRocket])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="student-input-bar" ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="input-wrapper">
        <input
          ref={inputRef}
          className="text-input"
          type="text"
          placeholder="输入关键词（最多10字）..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value.slice(0, 10))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={10}
        />
        <span className="char-count">{keyword.length}/10</span>
      </div>
      <button
        className="btn"
        onClick={handleSubmit}
        disabled={!keyword.trim() || disabled}
        style={{ flex: '0 0 auto', padding: '12px 20px' }}
      >
        <SendIcon />
        发送
      </button>

      {rocket && (
        <div
          style={{
            position: 'absolute',
            left: rocket.x - 14,
            top: rocket.y - 14,
            color: 'var(--primary)',
            pointerEvents: 'none',
            zIndex: 20,
            filter: 'drop-shadow(0 2px 8px var(--primary-light))',
            transition: 'none'
          }}
        >
          <RocketIcon />
        </div>
      )}

      {particles.map((p) => {
        const displayColor = lerpColor(p.fadeColor, p.color, p.alpha)
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: displayColor,
              opacity: p.alpha,
              pointerEvents: 'none',
              zIndex: 15,
              boxShadow: `0 0 ${p.size * 1.5}px ${displayColor}`,
              willChange: 'transform, opacity'
            }}
          />
        )
      })}
    </div>
  )
}

export default KeywordInput
