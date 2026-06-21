import { useEffect, useRef, useMemo } from 'react'

export interface StarConfig {
  starCount?: number
  minSize?: number
  maxSize?: number
  minOpacity?: number
  maxOpacity?: number
  minPulsePeriod?: number
  maxPulsePeriod?: number
}

interface Star {
  x: number
  y: number
  size: number
  baseOpacity: number
  phase: number
  pulsePeriod: number
  pulseAmplitude: number
}

const DEFAULT_CONFIG: Required<StarConfig> = {
  starCount: 200,
  minSize: 2,
  maxSize: 6,
  minOpacity: 0.3,
  maxOpacity: 1.0,
  minPulsePeriod: 2000,
  maxPulsePeriod: 4000,
}

interface StarFieldProps extends StarConfig {}

export default function StarField({
  starCount,
  minSize,
  maxSize,
  minOpacity,
  maxOpacity,
  minPulsePeriod,
  maxPulsePeriod,
}: StarFieldProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const config: Required<StarConfig> = {
    starCount: starCount ?? DEFAULT_CONFIG.starCount,
    minSize: minSize ?? DEFAULT_CONFIG.minSize,
    maxSize: maxSize ?? DEFAULT_CONFIG.maxSize,
    minOpacity: minOpacity ?? DEFAULT_CONFIG.minOpacity,
    maxOpacity: maxOpacity ?? DEFAULT_CONFIG.maxOpacity,
    minPulsePeriod: minPulsePeriod ?? DEFAULT_CONFIG.minPulsePeriod,
    maxPulsePeriod: maxPulsePeriod ?? DEFAULT_CONFIG.maxPulsePeriod,
  }

  const mergedConfig = config

  const stars = useMemo(() => {
    const generated: Star[] = []
    for (let i = 0; i < mergedConfig.starCount; i++) {
      generated.push({
        x: Math.random(),
        y: Math.random(),
        size: mergedConfig.minSize + Math.random() * (mergedConfig.maxSize - mergedConfig.minSize),
        baseOpacity: mergedConfig.minOpacity + Math.random() * (mergedConfig.maxOpacity - mergedConfig.minOpacity),
        phase: Math.random() * Math.PI * 2,
        pulsePeriod: mergedConfig.minPulsePeriod + Math.random() * (mergedConfig.maxPulsePeriod - mergedConfig.minPulsePeriod),
        pulseAmplitude: 0.2 + Math.random() * 0.3,
      })
    }
    return generated
  }, [mergedConfig.starCount, mergedConfig.minSize, mergedConfig.maxSize, mergedConfig.minOpacity, mergedConfig.maxOpacity, mergedConfig.minPulsePeriod, mergedConfig.maxPulsePeriod])

  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const width = window.innerWidth
      const height = window.innerHeight

      ctx.clearRect(0, 0, width, height)

      const starList = starsRef.current
      for (let i = 0; i < starList.length; i++) {
        const s = starList[i]
        const t = (elapsed / s.pulsePeriod) * Math.PI * 2 + s.phase
        const pulseFactor = Math.sin(t) * s.pulseAmplitude
        const opacity = Math.max(0.1, Math.min(1, s.baseOpacity + pulseFactor))

        const x = s.x * width
        const y = s.y * height
        const size = s.size * (1 + pulseFactor * 0.15)

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
        gradient.addColorStop(0.4, `rgba(200, 220, 255, ${opacity * 0.6})`)
        gradient.addColorStop(1, 'rgba(100, 140, 255, 0)')

        ctx.beginPath()
        ctx.arc(x, y, size * 2, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
