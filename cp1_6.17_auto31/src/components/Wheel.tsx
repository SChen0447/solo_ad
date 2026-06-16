import { useEffect, useRef, useCallback } from 'react'

interface Prize {
  id: string
  name: string
  count: number
  color: string
  probability: number
}

interface WheelProps {
  prizes: Prize[]
  spinning: boolean
  onSpinEnd?: (prizeId: string) => void
  targetPrizeId?: string | null
  disabled?: boolean
  size?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

const Wheel = ({ prizes, spinning, onSpinEnd, targetPrizeId = null, disabled = false, size = 280 }: WheelProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const spinStartTimeRef = useRef(0)
  const spinDurationRef = useRef(3000)
  const targetAngleRef = useRef(0)
  const isSpinningRef = useRef(false)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(0)

  const getTargetAngle = useCallback((prizeId: string) => {
    const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0)
    let startAngle = -Math.PI / 2
    for (const prize of prizes) {
      const angle = (prize.probability / totalProb) * Math.PI * 2
      if (prize.id === prizeId) {
        const centerAngle = startAngle + angle / 2
        return -centerAngle
      }
      startAngle += angle
    }
    return 0
  }, [prizes])

  const createParticles = useCallback((count: number) => {
    const particles: Particle[] = []
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 20

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      const speed = 2 + Math.random() * 4
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        color: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 4
      })
    }
    particlesRef.current = [...particlesRef.current, ...particles]
  }, [size])

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, rotation: number) => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0)
    let startAngle = -Math.PI / 2

    prizes.forEach((prize, index) => {
      const angle = (prize.probability / totalProb) * Math.PI * 2
      const endAngle = startAngle + angle

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      gradient.addColorStop(0, lightenColor(prize.color, 20))
      gradient.addColorStop(1, prize.color)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
      ctx.shadowBlur = 5
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.save()
      ctx.rotate(startAngle + angle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(12, Math.floor(size / 25))}px sans-serif`
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 3
      ctx.fillText(prize.name, radius - 20, 6)
      ctx.restore()

      startAngle = endAngle
      index
    })

    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
    ctx.lineWidth = 3
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 15
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(0, 0, 30, 0, Math.PI * 2)
    const centerGradient = ctx.createRadialGradient(0, -10, 5, 0, 0, 30)
    centerGradient.addColorStop(0, '#fff')
    centerGradient.addColorStop(1, '#e0e0e0')
    ctx.fillStyle = centerGradient
    ctx.fill()

    ctx.fillStyle = '#e94560'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GO', 0, 0)

    ctx.restore()
  }, [prizes, size])

  const drawPointer = useCallback((ctx: CanvasRenderingContext2D) => {
    const centerX = size / 2

    ctx.save()
    ctx.translate(centerX, 10)

    ctx.beginPath()
    ctx.moveTo(-12, 0)
    ctx.lineTo(0, 25)
    ctx.lineTo(12, 0)
    ctx.closePath()

    const pointerGradient = ctx.createLinearGradient(-12, 0, 12, 0)
    pointerGradient.addColorStop(0, '#ffd700')
    pointerGradient.addColorStop(0.5, '#fff')
    pointerGradient.addColorStop(1, '#ffd700')
    ctx.fillStyle = pointerGradient
    ctx.fill()

    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 10
    ctx.stroke()

    ctx.restore()
  }, [size])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2)
      ctx.fillStyle = particle.color
      ctx.globalAlpha = particle.life
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }, [])

  const updateParticles = useCallback(() => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= 1 / p.maxLife
      return p.life > 0
    })
  }, [])

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    ctx.clearRect(0, 0, size, size)

    if (isSpinningRef.current) {
      const elapsed = timestamp - spinStartTimeRef.current
      const progress = Math.min(elapsed / spinDurationRef.current, 1)
      const easedProgress = easeOutCubic(progress)

      const startAngle = rotationRef.current
      const endAngle = targetAngleRef.current + Math.PI * 2 * 8
      rotationRef.current = startAngle + (endAngle - startAngle) * easedProgress

      if (progress >= 1) {
        isSpinningRef.current = false
        rotationRef.current = targetAngleRef.current
        if (targetPrizeId && onSpinEnd) {
          setTimeout(() => onSpinEnd(targetPrizeId), 300)
        }
      }

      if (Math.random() < 0.3) {
        createParticles(2)
      }
    }

    updateParticles()
    drawParticles(ctx)
    drawWheel(ctx, rotationRef.current)
    drawPointer(ctx)

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [size, drawWheel, drawPointer, drawParticles, updateParticles, createParticles, targetPrizeId, onSpinEnd])

  useEffect(() => {
    if (spinning && targetPrizeId && !isSpinningRef.current) {
      isSpinningRef.current = true
      spinStartTimeRef.current = performance.now()
      spinDurationRef.current = 2500 + Math.random() * 2500
      targetAngleRef.current = getTargetAngle(targetPrizeId)
    }
  }, [spinning, targetPrizeId, getTargetAngle])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          filter: disabled ? 'grayscale(50%) brightness(0.7)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      />
    </div>
  )
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

export default Wheel
