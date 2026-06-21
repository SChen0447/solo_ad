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

interface StarState {
  errorShake: number
  errorFlash: number
}

const DESIGN_WIDTH = 1000
const DESIGN_HEIGHT = 600
const STAR_RADIUS = 14
const DRAW_DURATION = 500
const ERROR_FLASH_DURATION = 300
const ERROR_SHAKE_DURATION = 200
const ERROR_SHAKE_OFFSET = 3
const BURST_COUNT = 12
const BURST_DISTANCE = 80
const BURST_LIFE = 1000
const COMPLETE_GLOW_DURATION = 1500
const OUTLINE_FADE_DURATION = 1000

const BURST_COLORS = ['#FFD700', '#FFA500', '#FF69B4', '#DA70D6', '#FF8C00', '#FFD700']

export default function Constellation({ constellation, onComplete, resetKey }: ConstellationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [connectedPairs, setConnectedPairs] = useState<Array<[number, number]>>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([])
  const [starStates, setStarStates] = useState<Record<number, StarState>>({})
  const [outlineOpacity, setOutlineOpacity] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [completeGlow, setCompleteGlow] = useState(0)
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([])
  const startTimeRef = useRef<number>(0)
  const completeTimeRef = useRef<number>(0)
  const animRef = useRef<number>(0)
  const shakeTimersRef = useRef<Record<number, number>>({})

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

  useEffect(() => {
    setConnectedPairs([])
    setCurrentStep(0)
    setDrawingLines([])
    setStarStates({})
    setIsComplete(false)
    setCompleteGlow(0)
    setBurstParticles([])
    startTimeRef.current = performance.now()
    completeTimeRef.current = 0
    Object.values(shakeTimersRef.current).forEach(t => clearTimeout(t))
    shakeTimersRef.current = {}

    const start = performance.now()
    const fadeIn = () => {
      const now = performance.now()
      const progress = Math.min(1, (now - start) / OUTLINE_FADE_DURATION)
      setOutlineOpacity(progress * 0.15)
      if (progress < 1) requestAnimationFrame(fadeIn)
    }
    requestAnimationFrame(fadeIn)
  }, [constellation, resetKey])

  useEffect(() => {
    const render = (now: number) => {
      setDrawingLines(prev =>
        prev
          .map(line => ({ ...line }))
      )

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

      setStarStates(prev => {
        let changed = false
        const next: Record<number, StarState> = {}
        for (const [idx, s] of Object.entries(prev)) {
          const i = Number(idx)
          const ns: StarState = { ...s }
          if (ns.errorFlash > 0) {
            ns.errorFlash = Math.max(0, ns.errorFlash - 16)
            changed = true
          }
          if (ns.errorShake > 0) {
            ns.errorShake = Math.max(0, ns.errorShake - 16)
            changed = true
          }
          next[i] = ns
        }
        return changed ? next : prev
      })

      if (isComplete && completeGlow < 0.8) {
        const elapsed = now - completeTimeRef.current
        const progress = Math.min(1, elapsed / COMPLETE_GLOW_DURATION)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCompleteGlow(eased * 0.8)
      }

      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [isComplete, completeGlow])

  useEffect(() => {
    if (drawingLines.length === 0) return
    const check = setInterval(() => {
      const now = performance.now()
      setDrawingLines(prev => {
        const filtered = prev.filter(line => now - line.startTime < line.duration + 50)
        const finished = prev.filter(line => now - line.startTime >= line.duration)
        if (finished.length > 0) {
          const newPairs: Array<[number, number]> = finished.map(l => [l.fromIdx, l.toIdx])
          setConnectedPairs(cp => [...cp, ...newPairs])
        }
        return filtered.length !== prev.length ? filtered : prev
      })
    }, 30)
    return () => clearInterval(check)
  }, [drawingLines])

  const triggerError = (starIdx: number) => {
    setStarStates(prev => ({
      ...prev,
      [starIdx]: {
        errorFlash: ERROR_FLASH_DURATION,
        errorShake: ERROR_SHAKE_DURATION,
      },
    }))
  }

  const triggerBurst = () => {
    const stars = constellation.stars
    const cx = stars.reduce((s, [x, y]) => s + x, 0) / stars.length
    const cy = stars.reduce((s, [x, y]) => s + y, 0) / stars.length
    const particles: BurstParticle[] = []
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.3
      const speed = BURST_DISTANCE / (BURST_LIFE / 1000)
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: BURST_LIFE,
        maxLife: BURST_LIFE,
        color: BURST_COLORS[i % BURST_COLORS.length],
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
    setDrawingLines(prev => [
      ...prev,
      {
        fromIdx,
        toIdx: starIdx,
        startTime: performance.now(),
        duration: DRAW_DURATION,
      },
    ])

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

  const getShakeOffset = (starIdx: number) => {
    const s = starStates[starIdx]
    if (!s || s.errorShake <= 0) return { x: 0, y: 0 }
    const t = 1 - s.errorShake / ERROR_SHAKE_DURATION
    const intensity = Math.sin(t * Math.PI * 8) * ERROR_SHAKE_OFFSET * (1 - t)
    return { x: intensity, y: intensity * 0.7 }
  }

  const getStarColor = (starIdx: number) => {
    const s = starStates[starIdx]
    const isError = s && s.errorFlash > 0
    if (isError) return '#FF4444'
    const idxInSeq = constellation.sequence.slice(0, currentStep + 1).includes(starIdx)
    if (idxInSeq && isComplete) return '#FFD700'
    if (idxInSeq) return '#00BFFF'
    return '#FFFFFF'
  }

  const getGlowOpacity = (starIdx: number) => {
    const idxInSeq = constellation.sequence.slice(0, currentStep + 1).includes(starIdx)
    if (isComplete && idxInSeq) return 0.9
    if (idxInSeq) return 0.6
    return 0.25
  }

  const stars = constellation.stars
  const visibleOpacity = 0.15 + completeGlow

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
          d={constellation.outlinePath}
          fill="none"
          stroke="#8A2BE2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: outlineOpacity + completeGlow * 0.6 }}
        />

        {connectedPairs.map(([from, to], i) => {
          const [x1, y1] = stars[from]
          const [x2, y2] = stars[to]
          const t = 1
          const ex = x1 + (x2 - x1) * t
          const ey = y1 + (y2 - y1) * t
          return (
            <g key={`conn-${i}`} filter="url(#lineGlow)">
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeOpacity={0.5 + completeGlow * 0.3}
                strokeLinecap="round"
              />
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
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
          const progress = Math.min(1, (performance.now() - line.startTime) / line.duration)
          const t = Math.min(1, progress)
          const ex = x1 + (x2 - x1) * t
          const ey = y1 + (y2 - y1) * t
          return (
            <g key={`draw-${i}`} filter="url(#lineGlow)">
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeOpacity={0.5}
                strokeLinecap="round"
              />
              <line
                x1={x1} y1={y1} x2={ex} y2={ey}
                stroke="#00BFFF"
                strokeWidth="3"
                strokeOpacity={0.8}
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
          const shake = getShakeOffset(idx)
          const color = getStarColor(idx)
          const glowOpacity = getGlowOpacity(idx)
          const isError = starStates[idx]?.errorFlash > 0
          const errorProgress = isError ? 1 - (starStates[idx]!.errorFlash / ERROR_FLASH_DURATION) : 0
          const actualX = x + shake.x
          const actualY = y + shake.y
          const pulse = 1 + Math.sin(performance.now() / 500 + idx) * 0.05
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
