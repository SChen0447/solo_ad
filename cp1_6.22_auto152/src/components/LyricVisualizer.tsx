import { useEffect, useRef, useState } from 'react'
import type { LyricLine } from '../types'

interface Props {
  lyrics: LyricLine[]
}

const LINE_HEIGHT = 40
const LINE_DURATION = 2500

export default function LyricVisualizer({ lyrics }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const targetOffsetRef = useRef(0)
  const currentOffsetRef = useRef(0)
  const rafRef = useRef<number>()
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (lyrics.length === 0) return

    const lineInterval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % lyrics.length)
    }, LINE_DURATION)

    return () => clearInterval(lineInterval)
  }, [lyrics.length])

  useEffect(() => {
    if (!containerRef.current) return

    const containerHeight = containerRef.current.clientHeight
    const centerY = containerHeight / 2
    targetOffsetRef.current = centerY - activeIndex * LINE_HEIGHT - LINE_HEIGHT / 2
    startTimeRef.current = Date.now()
    const startOffset = currentOffsetRef.current

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const duration = 600
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const maxStep = 2
      const targetDiff = targetOffsetRef.current - startOffset
      const easedDiff = targetDiff * easeProgress
      const clampedDiff = Math.max(-maxStep, Math.min(maxStep, easedDiff))
      currentOffsetRef.current = startOffset + clampedDiff
      setScrollOffset(currentOffsetRef.current)

      if (progress < 1 || Math.abs(currentOffsetRef.current - targetOffsetRef.current) > 0.5) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        currentOffsetRef.current = targetOffsetRef.current
        setScrollOffset(targetOffsetRef.current)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [activeIndex])

  return (
    <div className="lyric-container" ref={containerRef}>
      <div
        className="lyric-scroll"
        style={{
          transform: `translateY(${scrollOffset}px)`,
          willChange: 'transform'
        }}
      >
        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex
          const isNeighbor = Math.abs(idx - activeIndex) === 1
          const className = `lyric-line${isActive ? ' active' : isNeighbor ? ' neighbor' : ''}`
          return (
            <div
              key={line.index}
              className={className}
              style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
            >
              {line.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
