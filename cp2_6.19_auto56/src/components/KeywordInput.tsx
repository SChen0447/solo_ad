import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { KeywordInputProps } from '../types'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
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

const KeywordInput: React.FC<KeywordInputProps> = ({ onSubmit, disabled }) => {
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rocket, setRocket] = useState<{ visible: boolean; x: number; y: number; targetX: number; targetY: number } | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 5) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particleIdRef.current += 1
      newParticles.push({
        id: particleIdRef.current,
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        size: 2 + Math.random() * 4,
        alpha: 1,
        color
      })
    }
    setParticles((prev) => [...prev, ...newParticles])
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
    let lastSpawnTime = startTime

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const easeT = 1 - Math.pow(1 - t, 3)

      const currentX = startX + (targetX - startX) * easeT
      const currentY = startY + (targetY - startY) * easeT

      setRocket({ visible: true, x: currentX, y: currentY, targetX, targetY })

      if (performance.now() - lastSpawnTime > 16) {
        spawnParticles(currentX, currentY + 8, color, 4)
        lastSpawnTime = performance.now()
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        spawnParticles(targetX, targetY, color, 20)
        setTimeout(() => {
          setRocket(null)
        }, 100)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [spawnParticles])

  useEffect(() => {
    if (particles.length === 0) return

    let frameId: number
    const animate = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.08,
            alpha: p.alpha * 0.92,
            size: p.size * 0.97
          }))
          .filter((p) => p.alpha > 0.02)
      )
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [particles.length > 0])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = keyword.trim().slice(0, 10)
    if (!trimmed || disabled || !inputRef.current || !containerRef.current) return

    const input = inputRef.current
    const containerRect = containerRef.current.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()

    const startX = inputRect.left + inputRect.width / 2 - containerRect.left
    const startY = inputRect.top - containerRect.top
    const targetX = containerRect.width / 2
    const targetY = -containerRect.height / 2 + 80

    animateRocket(startX, startY, targetX, targetY, getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0ea5e9')

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

      {rocket && rocket.visible && (
        <div
          style={{
            position: 'absolute',
            left: rocket.x - 14,
            top: rocket.y - 14,
            color: 'var(--primary)',
            pointerEvents: 'none',
            zIndex: 20,
            filter: 'drop-shadow(0 2px 8px var(--primary-light))'
          }}
        >
          <RocketIcon />
        </div>
      )}

      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: p.alpha,
            pointerEvents: 'none',
            zIndex: 15,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
          }}
        />
      ))}
    </div>
  )
}

export default KeywordInput
