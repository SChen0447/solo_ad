import { useEffect, useRef } from 'react'
import type { AudioEngine } from './AudioEngine'

export type VisualizerType = 'bars' | 'particles' | 'waveform'

interface Particle {
  angle: number
  radius: number
  speed: number
  size: number
  alpha: number
  hue: number
}

interface VisualizerProps {
  audioEngine: AudioEngine | null
  effectType: VisualizerType
  gains: { low: number; mid: number; high: number }
}

export default function Visualizer({ audioEngine, effectType, gains }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const hueRef = useRef<number>(0)
  const typeRef = useRef<VisualizerType>(effectType)

  useEffect(() => {
    typeRef.current = effectType
  }, [effectType])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const initParticles = (count: number) => {
      const arr: Particle[] = []
      for (let i = 0; i < count; i++) {
        arr.push({
          angle: (i / count) * Math.PI * 2,
          radius: 0,
          speed: 0.002 + Math.random() * 0.004,
          size: 3,
          alpha: 0.3,
          hue: (i / count) * 360,
        })
      }
      particlesRef.current = arr
    }

    if (particlesRef.current.length === 0) {
      initParticles(128)
    }

    const drawBars = (freq: Uint8Array) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const barCount = 64
      const gap = 2
      const availableW = w - (barCount + 1) * gap
      const barW = Math.max(2, availableW / barCount)
      const totalStep = barW + gap
      const startX = (w - totalStep * barCount + gap) / 2
      const baseY = h - 40
      const maxBarH = h - 100

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * (freq.length * 0.7))
        const val = freq[idx] || 0
        const barH = (val / 255) * maxBarH
        const x = startX + i * totalStep
        const y = baseY - barH

        const ratio = barH / maxBarH
        const r = Math.floor(40 + ratio * 215)
        const g = Math.floor(120 - ratio * 80)
        const b = Math.floor(255 - ratio * 200)

        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.shadowColor = `rgba(${r},${g},${b},0.6)`
        ctx.shadowBlur = 8
        ctx.fillRect(x, y, barW, barH)
      }
      ctx.shadowBlur = 0
    }

    const drawParticles = (freq: Uint8Array) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2
      const maxRadius = Math.min(w, h) * 0.45

      hueRef.current = (hueRef.current + 0.5) % 360

      const particles = particlesRef.current
      const binCount = Math.min(freq.length, particles.length)

      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const freqIdx = Math.floor((i / particles.length) * binCount)
        const energy = (freq[freqIdx] || 0) / 255

        p.radius = 50 + energy * maxRadius
        p.size = 3 + energy * 5
        p.alpha = 0.3 + energy * 0.7
        p.angle += p.speed + energy * 0.02

        const x = cx + Math.cos(p.angle) * p.radius
        const y = cy + Math.sin(p.angle) * p.radius
        const hue = (hueRef.current + p.hue) % 360

        ctx.beginPath()
        ctx.fillStyle = `hsla(${hue},80%,60%,${p.alpha})`
        ctx.shadowColor = `hsla(${hue},80%,60%,${p.alpha})`
        ctx.shadowBlur = 15
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowBlur = 0
    }

    const drawWaveform = (time: Uint8Array) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const midY = h / 2
      const amp = (h / 2) * 0.75

      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.shadowColor = 'rgba(59,130,246,0.5)'
      ctx.shadowBlur = 10
      ctx.beginPath()

      for (let i = 0; i < time.length; i++) {
        const x = (i / (time.length - 1)) * w
        const v = (time[i] - 128) / 128
        const y = midY + v * amp
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(100,180,255,0.2)'
      ctx.shadowBlur = 0
      ctx.beginPath()
      for (let i = 0; i < time.length; i++) {
        const x = (i / (time.length - 1)) * w
        const v = (time[i] - 128) / 128
        const y = midY - v * amp
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    const drawIdle = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '20px -apple-system, "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('点击右侧"上传音频"按钮开始体验', w / 2, h / 2)
      ctx.restore()
    }

    const render = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      const freq = audioEngine ? audioEngine.getFrequencyData() : new Uint8Array(0)
      const time = audioEngine ? audioEngine.getTimeDomainData() : new Uint8Array(0)
      const hasAudio = freq.length > 0 && freq.some(v => v > 0)

      if (typeRef.current === 'bars') {
        drawBars(freq)
      } else if (typeRef.current === 'particles') {
        drawParticles(freq)
      } else if (typeRef.current === 'waveform') {
        drawWaveform(time)
      }

      if (!hasAudio && !audioEngine) {
        drawIdle()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [audioEngine, gains])

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '70%',
    minHeight: 600,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  }

  const canvasWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 600,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 0 60px rgba(59,130,246,0.15), inset 0 0 40px rgba(59,130,246,0.08)',
    border: '1px solid rgba(59,130,246,0.25)',
    background: 'rgba(10,10,26,0.6)',
  }

  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(59,130,246,0.7)',
    borderStyle: 'solid',
    pointerEvents: 'none',
  }

  return (
    <div style={containerStyle}>
      <div style={canvasWrapperStyle}>
        <div style={{ ...cornerStyle, top: 6, left: 6, borderWidth: '2px 0 0 2px', borderTopLeftRadius: 10 }} />
        <div style={{ ...cornerStyle, top: 6, right: 6, borderWidth: '2px 2px 0 0', borderTopRightRadius: 10 }} />
        <div style={{ ...cornerStyle, bottom: 6, left: 6, borderWidth: '0 0 2px 2px', borderBottomLeftRadius: 10 }} />
        <div style={{ ...cornerStyle, bottom: 6, right: 6, borderWidth: '0 2px 2px 0', borderBottomRightRadius: 10 }} />
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            minHeight: 600,
          }}
        />
      </div>
    </div>
  )
}
