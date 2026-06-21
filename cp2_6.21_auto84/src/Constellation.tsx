import { useEffect, useRef, useState, useCallback } from 'react'
import type { ConstellationData } from './data/constellations'

interface ConstellationProps {
  constellation: ConstellationData
  onComplete: (score: number, elapsed: number) => void
  resetKey: number
}

interface DrawingLine {
  fromIdx: number
  toIdx: number
  startTime: number
  duration: number
}

interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

interface StarErrorState {
  startTime: number
}

const DESIGN_WIDTH = 1000
const DESIGN_HEIGHT = 600
const STAR_RADIUS = 14
const DRAW_DURATION = 500
const ERROR_FLASH_DURATION = 300
const ERROR_SHAKE_DURATION = 300
const ERROR_SHAKE_OFFSET = 3
const BURST_COUNT = 12
const BURST_DISTANCE = 80
const BURST_LIFE = 1000
const COMPLETE_GLOW_DURATION = 1500
const OUTLINE_FADE_DURATION = 1000

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const interpolateColor = (color1: string, color2: string, t: number): string => {
  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  )
}

export default function Constellation({ constellation, onComplete, resetKey }: ConstellationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const outlinePathRef = useRef<SVGPathElement>(null)

  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [connectedPairs, setConnectedPairs] = useState<Array<[number, number]>>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [completeGlow, setCompleteGlow] = useState(0)
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([])
  const [, setTick] = useState(0)

  const startTimeRef = useRef<number>(0)
  const completeTimeRef = useRef<number>(0)
  const animRef = useRef<number>(0)
  const outlineFadeRef = useRef<{ startTime: number; rafId: number | null }>({ startTime: 0, rafId: null })
  const drawingLinesRef = useRef<DrawingLine[]>([])
  const starErrorsRef = useRef<Record<number, StarErrorState>>({})
  const outlineOpacityRef = useRef(0)

  const updateLayout = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const padding = 40
    const availableW = rect.width - padding * 2
    const availableH = rect.height - padding * 2 - 60
    const s = Math.min(availableW / DESIGN_WIDTH, availableH / DESIGN_HEIGHT)
    setScale(s)
    setOffsetX((rect.width - DESIGN_WIDTH * s) / 2)
    setOffsetY(padding + (availableH - DESIGN_HEIGHT * s) / 2)
  }, [])

  useEffect(() => {
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [updateLayout])

  const startOutlineFadeIn = useCallback(() => {
    if (outlineFadeRef.current.rafId !== null) {
      cancelAnimationFrame(outlineFadeRef.current.rafId)
    }
    outlineOpacityRef.current = 0
    if (outlinePathRef.current) {
      outlinePathRef.current.style.opacity = '0'
    }

    const startTime = performance.now()
    outlineFadeRef.current.startTime = startTime

    const animate = () => {
      const now = performance.now()
      const rawProgress = Math.min(1, (now - startTime) / OUTLINE_FADE_DURATION)
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3)
      const opacity = easedProgress * 0.15
      outlineOpacityRef.current = opacity

      if (outlinePathRef.current) {
        outlinePathRef.current.style.opacity = String(opacity)
      }

      if (rawProgress < 1) {
        outlineFadeRef.current.rafId = requestAnimationFrame(animate)
      } else {
        outlineFadeRef.current.rafId = null
      }
    }

    outlineFadeRef.current.rafId = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    setConnectedPairs([])
    setCurrentStep(0)
    setIsComplete(false)
    setCompleteGlow(0)
    setBurstParticles([])
    drawingLinesRef.current = []
    starErrorsRef.current = {}
    startTimeRef.current = performance.now()
    completeTimeRef.current = 0

    startOutlineFadeIn()
  }, [constellation, resetKey, startOutlineFadeIn])

  useEffect(() => {
    const render = (now: number) => {
      const drawingLines = drawingLinesRef.current
      if (drawingLines.length > 0) {
        const finished: DrawingLine[] = []
        const remaining: DrawingLine[] = []
        for (const line of drawingLines) {
          if (now - line.startTime >= line.duration) {
            finished.push(line)
          } else {
            remaining.push(line)
          }
        }
        if (finished.length > 0) {
          drawingLinesRef.current = remaining
          const newPairs: Array<[number, number]> = finished.map(l => [l.fromIdx, l.toIdx])
          setConnectedPairs(cp => [...cp, ...newPairs])
        }
      }

      const starErrors = starErrorsRef.current
      let starErrorsChanged = false
      for (const [idxStr, state] of Object.entries(starErrors)) {
        if (now - state.startTime >= ERROR_FLASH_DURATION) {
          delete starErrors[Number(idxStr)]
          starErrorsChanged = true
        }
      }

      setBurstParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.016,
            y: p.y + p.vy * 0.016,
            life: p.life - 16,
          }))
          .filter(p => p.life > 0)
      )

      if (isComplete && completeGlow < 0.8) {
        const elapsed = now - completeTimeRef.current
        const progress = Math.min(1, elapsed / COMPLETE_GLOW_DURATION)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCompleteGlow(eased * 0.8)
      }

      setTick(t => t + 1)

      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [isComplete, completeGlow])

  useEffect(() => {
    return () => {
      if (outlineFadeRef.current.rafId !== null) {
        cancelAnimationFrame(outlineFadeRef.current.rafId)
        outlineFadeRef.current.rafId = null
      }
    }
  }, [])

  const triggerError = (starIdx: number) => {
    starErrorsRef.current[starIdx] = {
      startTime: performance.now(),
    }
  }

  const triggerBurst = () => {
    const stars = constellation.stars
    const cx = stars.reduce((s, [x, y]) => s + x, 0) / stars.length
    const cy = stars.reduce((s, [x, y]) => s + y, 0) / stars.length
    const particles: BurstParticle[] = []
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.3
      const speed = BURST_DISTANCE / (BURST_LIFE / 1000)
      const colorT = Math.random()
      const particleColor = interpolateColor('#FFD700', '#FF69B4', colorT)
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: BURST_LIFE,
        maxLife: BURST_LIFE,
        color: particleColor,
      })
    }
    setBurstParticles(particles)
  }

  const handleStarClick = (starIdx: number) => {
    if (isComplete) return
    if (currentStep >= constellation.sequence.length - 1) return

    const expectedIdx = constellation.sequence[currentStep + 1]

    if (starIdx !== expectedIdx) {
      triggerError(starIdx)
      return
    }

    const fromIdx = constellation.sequence[currentStep]
    drawingLinesRef.current = [
      ...drawingLinesRef.current,
      {
        fromIdx,
        toIdx: starIdx,
        startTime: performance.now(),
        duration: DRAW_DURATION,
      },
    ]

    const nextStep = currentStep + 1
    setCurrentStep(nextStep)

    if (nextStep >= constellation.sequence.length - 1) {
      setTimeout(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        const score = Math.max(0, 1000 - Math.floor(elapsed * 10))
        completeTimeRef.current = performance.now()
        setIsComplete(true)
        triggerBurst()
        setTimeout(() => {
          onComplete(score, elapsed)
        }, 2000)
      }, DRAW_DURATION + 100)
    }
  }

  const getShakeOffset = (starIdx: number, now: number) => {
    const state = starErrorsRef.current[starIdx]
    if (!state) return { x: 0, y: 0 }
    const elapsed = now - state.startTime
    if (elapsed >= ERROR_FLASH_DURATION) return { x: 0, y: 0 }
    const t = elapsed / ERROR_FLASH_DURATION
    const intensity = Math.sin(t * Math.PI * 8) * ERROR_SHAKE_OFFSET * (1 - t)
    return { x: intensity, y: intensity * 0.7 }
  }

  const getStarErrorProgress = (starIdx: number, now: number) => {
    const state = starErrorsRef.current[starIdx]
    if (!state) return 0
    const elapsed = now - state.startTime
    if (elapsed >= ERROR_FLASH_DURATION) return 0
    return elapsed / ERROR_FLASH_DURATION
  }

  const isStarInError = (starIdx: number, now: number) => {
    const state = starErrorsRef.current[starIdx]
    if (!state) return false
    return now - state.startTime < ERROR_FLASH_DURATION
  }

  const getStarColor = (starIdx: number, now: number) => {
    if (isStarInError(starIdx, now)) return '#FF4444'
    const idxInSeq = constellation.sequence.slice(0, currentStep + 1).includes(starIdx)
    if (idxInSeq && isComplete) return '#FFD700'
    if (idxInSeq) return '#00BFFF'
    return '#FFFFFF'
  }

  const getGlowOpacity = (starIdx: number, now: number) => {
    const idxInSeq = constellation.sequence.slice(0, currentStep + 1).includes(starIdx)
    if (isStarInError(starIdx, now)) return 0.8
    if (isComplete && idxInSeq) return 0.9
    if (idxInSeq) return 0.6
    return 0.25
  }

  const stars = constellation.stars
  const now = performance.now()
  const drawingLines = drawingLinesRef.current
  const outlineStyleOpacity = outlineOpacityRef.current + completeGlow * 0.6

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: DESIGN_WIDTH * scale,
          height: DESIGN_HEIGHT * scale,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="starGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={outlinePathRef}
          d={constellation.outlinePath}
          fill="none"
          stroke="#8A2BE2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: outlineStyleOpacity }}
        />

        {connectedPairs.map(([from, to], i) => {
          const [x1, y1] = stars[from]
          const [x2, y2] = stars[to]
          return (
            <g key={`conn-${i}`} filter="url(#lineGlow)">
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeOpacity={0.5 + completeGlow * 0.3}
                strokeLinecap="round"
              />
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#00BFFF"
                strokeWidth="3"
                strokeOpacity={0.8}
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {drawingLines.map((line, i) => {
          const [x1, y1] = stars[line.fromIdx]
          const [x2, y2] = stars[line.toIdx]
          const progress = Math.min(1, (now - line.startTime) / line.duration)
          const t = Math.min(1, progress)
          const ex = x1 + (x2 - x1) * t
          const ey = y1 + (y2 - y1) * t
          const lineOpacity = t * 0.8
          const haloOpacity = t * 0.5
          return (
            <g key={`draw-${i}`} filter="url(#lineGlow)">
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeOpacity={haloOpacity}
                strokeLinecap="round"
              />
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
                stroke="#00BFFF"
                strokeWidth="3"
                strokeOpacity={lineOpacity}
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {burstParticles.map((p, i) => {
          const alpha = p.life / p.maxLife
          const r = 4 * alpha + 1
          return (
            <circle
              key={`burst-${i}`}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={p.color}
              opacity={alpha}
              filter="url(#starGlow)"
            />
          )
        })}

        {stars.map(([x, y], idx) => {
          const shake = getShakeOffset(idx, now)
          const color = getStarColor(idx, now)
          const glowOpacity = getGlowOpacity(idx, now)
          const isError = isStarInError(idx, now)
          const errorProgress = getStarErrorProgress(idx, now)
          const actualX = x + shake.x
          const actualY = y + shake.y
          const pulse = 1 + Math.sin(now / 500 + idx) * 0.05
          const r = STAR_RADIUS * (isComplete && errorProgress < 0.5 ? 1.2 : pulse)

          return (
            <g
              key={`star-${idx}`}
              transform={`translate(${actualX}, ${actualY})`}
              style={{ cursor: isComplete ? 'default' : 'pointer' }}
              onClick={() => handleStarClick(idx)}
            >
              <circle
                r={r * 2.5}
                fill={color}
                opacity={glowOpacity * 0.3}
                filter="url(#starGlow)"
              />
              <circle r={r} fill={color} opacity={0.9 + completeGlow} />
              <circle r={r * 0.4} fill="#FFFFFF" opacity={0.8} />
              {isError && (
                <circle r={r * 2} fill="#FF4444" opacity={0.5} />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
