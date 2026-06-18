import type { SpectrumStyle, BackgroundPreset, NoiseDensity, BackgroundConfig } from './types'

interface ParticleState {
  x: number
  y: number
  baseY: number
  vx: number
  vy: number
  angle: number
  rotationSpeed: number
}

export class SpectrumRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number = 0
  private height: number = 0
  private particleStates: ParticleState[] = []
  private noiseParticles: { x: number; y: number; alpha: number }[] = []
  private style: SpectrumStyle = 'bar'
  private styleTransition: number = 1
  private targetStyle: SpectrumStyle = 'bar'
  private transitionStart: number = 0
  private transitionDuration: number = 300
  private time: number = 0

  private backgroundGradients: Record<BackgroundPreset, string[]> = {
    aurora: ['#00d4ff', '#7b2ff7', '#ff006e'],
    neon: ['#ff006e', '#8338ec', '#3a86ff'],
    starry: ['#0f0c29', '#302b63', '#24243e'],
    sunset: ['#ff7e5f', '#feb47b', '#ffcc70'],
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not supported')
    this.ctx = ctx
    this.resize()
    this.initNoiseParticles('medium')
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width * dpr
    this.height = rect.height * dpr
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.ctx.scale(dpr, dpr)
    this.initParticleStates()
  }

  setStyle(style: SpectrumStyle): void {
    if (this.targetStyle === style) return
    this.targetStyle = style
    this.transitionStart = performance.now()
    this.styleTransition = 0
  }

  setBackgroundNoise(density: NoiseDensity): void {
    this.initNoiseParticles(density)
  }

  private initNoiseParticles(density: NoiseDensity): void {
    this.noiseParticles = []
    const counts: Record<NoiseDensity, number> = {
      low: 100,
      medium: 300,
      high: 600,
    }
    const count = counts[density]
    const w = this.canvas.width
    const h = this.canvas.height
    for (let i = 0; i < count; i++) {
      this.noiseParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        alpha: 0.1 + Math.random() * 0.3,
      })
    }
  }

  private initParticleStates(): void {
    this.particleStates = []
    const barCount = 256
    for (let i = 0; i < barCount; i++) {
      this.particleStates.push({
        x: 0,
        y: 0,
        baseY: 0,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      })
    }
  }

  render(frequencyData: Uint8Array, config: BackgroundConfig): void {
    this.time += 1
    const now = performance.now()

    if (this.styleTransition < 1) {
      const elapsed = now - this.transitionStart
      this.styleTransition = Math.min(elapsed / this.transitionDuration, 1)
      if (this.styleTransition >= 1) {
        this.style = this.targetStyle
      }
    }

    const displayWidth = this.canvas.width / (window.devicePixelRatio || 1)
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 1)

    this.ctx.clearRect(0, 0, displayWidth, displayHeight)

    this.drawBackground(config, displayWidth, displayHeight)

    if (config.noiseEnabled) {
      this.drawNoise(displayWidth, displayHeight)
    }

    const t = this.styleTransition
    if (t < 1 && this.style !== this.targetStyle) {
      this.ctx.globalAlpha = 1 - t
      this.drawSpectrum(this.style, frequencyData, displayWidth, displayHeight)
      this.ctx.globalAlpha = t
      this.drawSpectrum(this.targetStyle, frequencyData, displayWidth, displayHeight)
      this.ctx.globalAlpha = 1
    } else {
      this.drawSpectrum(this.style, frequencyData, displayWidth, displayHeight)
    }
  }

  private drawBackground(config: BackgroundConfig, w: number, h: number): void {
    const colors = this.backgroundGradients[config.preset]
    const hueShift = config.hueShift

    const gradient = this.ctx.createLinearGradient(0, 0, w, h)

    for (let i = 0; i < colors.length; i++) {
      const shifted = this.shiftHue(colors[i], hueShift)
      gradient.addColorStop(i / (colors.length - 1), shifted)
    }

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, w, h)

    const overlayGradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2)
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
    this.ctx.fillStyle = overlayGradient
    this.ctx.fillRect(0, 0, w, h)
  }

  private shiftHue(hex: string, degrees: number): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const v = max

    const d = max - min
    s = max === 0 ? 0 : d / max

    if (max === min) {
      h = 0
    } else {
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    h = (h + degrees / 360) % 1
    if (h < 0) h += 1

    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)

    let rr = v
    let gg = v
    let bb = v

    switch (i % 6) {
      case 0:
        rr = v
        gg = t
        bb = p
        break
      case 1:
        rr = q
        gg = v
        bb = p
        break
      case 2:
        rr = p
        gg = v
        bb = t
        break
      case 3:
        rr = p
        gg = q
        bb = v
        break
      case 4:
        rr = t
        gg = p
        bb = v
        break
      case 5:
        rr = v
        gg = p
        bb = q
        break
    }

    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
  }

  private drawNoise(_w: number, _h: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    for (const p of this.noiseParticles) {
      this.ctx.globalAlpha = p.alpha
      this.ctx.beginPath()
      this.ctx.arc(p.x / (window.devicePixelRatio || 1), p.y / (window.devicePixelRatio || 1), 0.5, 0, Math.PI * 2)
      this.ctx.fill()
    }
    this.ctx.globalAlpha = 1
  }

  private drawSpectrum(style: SpectrumStyle, data: Uint8Array, w: number, h: number): void {
    switch (style) {
      case 'bar':
        this.drawBars(data, w, h)
        break
      case 'wave':
        this.drawWave(data, w, h)
        break
      case 'particle':
        this.drawParticles(data, w, h)
        break
    }
  }

  private getBarColor(index: number, total: number): string {
    const ratio = index / total
    if (ratio < 0.33) {
      const t = ratio / 0.33
      const r = 255
      const g = Math.round(100 * t)
      const b = 0
      return `rgb(${r}, ${g}, ${b})`
    } else if (ratio < 0.66) {
      const t = (ratio - 0.33) / 0.33
      const r = 255
      const g = Math.round(100 + 80 * t)
      const b = Math.round(50 * t)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      const t = (ratio - 0.66) / 0.34
      const r = Math.round(255 - 100 * t)
      const g = Math.round(180 - 80 * t)
      const b = Math.round(50 + 200 * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  private drawBars(data: Uint8Array, w: number, h: number): void {
    const barCount = 256
    const barWidth = 4
    const gap = 1
    const totalWidth = barCount * (barWidth + gap) - gap
    const startX = (w - totalWidth) / 2
    const bottomY = h * 0.85

    for (let i = 0; i < barCount; i++) {
      const value = data[i] / 255
      const barHeight = value * h * 0.6
      const x = startX + i * (barWidth + gap)
      const y = bottomY - barHeight

      const color = this.getBarColor(i, barCount)

      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 2

      this.ctx.fillStyle = color
      this.ctx.fillRect(x, y, barWidth, barHeight)

      this.ctx.shadowBlur = 0
    }
  }

  private drawWave(data: Uint8Array, w: number, h: number): void {
    const barCount = 256
    const bottomY = h * 0.85
    const totalWidth = w * 0.9
    const startX = (w - totalWidth) / 2

    const points: { x: number; y: number }[] = []

    for (let i = 0; i < barCount; i++) {
      const value = data[i] / 255
      const x = startX + (i / (barCount - 1)) * totalWidth
      const y = bottomY - value * h * 0.5
      points.push({ x, y })
    }

    const gradient = this.ctx.createLinearGradient(0, bottomY - h * 0.5, 0, bottomY)
    gradient.addColorStop(0, 'rgba(255, 100, 150, 0.9)')
    gradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.7)')
    gradient.addColorStop(1, 'rgba(200, 100, 255, 0.3)')

    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, bottomY)

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2
      const yc = (points[i].y + points[i + 1].y) / 2
      this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
    }

    this.ctx.lineTo(points[points.length - 1].x, bottomY)
    this.ctx.closePath()

    this.ctx.fillStyle = gradient
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2
      const yc = (points[i].y + points[i + 1].y) / 2
      this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  private drawParticles(data: Uint8Array, w: number, h: number): void {
    const barCount = 256
    const totalWidth = w * 0.9
    const startX = (w - totalWidth) / 2
    const bottomY = h * 0.85

    for (let i = 0; i < barCount; i++) {
      const state = this.particleStates[i]
      const value = data[i] / 255
      const targetX = startX + (i / (barCount - 1)) * totalWidth
      const targetY = bottomY - value * h * 0.5

      state.baseY = targetY
      state.x += state.vx + (targetX - state.x) * 0.1
      state.y += state.vy + (targetY - state.y) * 0.08
      state.angle += state.rotationSpeed

      state.vx *= 0.98
      state.vy *= 0.98

      if (state.x < startX) state.vx += 0.1
      if (state.x > startX + totalWidth) state.vx -= 0.1
      if (state.y < h * 0.1) state.vy += 0.05
      if (state.y > bottomY) state.vy -= 0.05

      const radius = 2 + value * 6

      const ratio = i / barCount
      let r: number, g: number, b: number
      if (ratio < 0.5) {
        const t = ratio / 0.5
        r = Math.round(100 * t)
        g = Math.round(150 + 50 * t)
        b = 255
      } else {
        const t = (ratio - 0.5) / 0.5
        r = Math.round(100 + 155 * t)
        g = Math.round(200 - 100 * t)
        b = Math.round(255 - 200 * t)
      }

      const color = `rgba(${r}, ${g}, ${b}, 0.9)`

      this.ctx.save()
      this.ctx.translate(state.x, state.y)
      this.ctx.rotate(state.angle)

      this.ctx.fillStyle = color
      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 8

      this.ctx.beginPath()
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.shadowBlur = 0
      this.ctx.restore()
    }
  }

  exportFrame(config: BackgroundConfig): string {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = 1920
    exportCanvas.height = 1080
    const ctx = exportCanvas.getContext('2d')!

    const colors = this.backgroundGradients[config.preset]
    const hueShift = config.hueShift
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    for (let i = 0; i < colors.length; i++) {
      const shifted = this.shiftHue(colors[i], hueShift)
      gradient.addColorStop(i / (colors.length - 1), shifted)
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)

    const overlayGradient = ctx.createRadialGradient(960, 540, 0, 960, 540, 1080)
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
    ctx.fillStyle = overlayGradient
    ctx.fillRect(0, 0, 1920, 1080)

    if (config.noiseEnabled) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      const densityMap: Record<NoiseDensity, number> = { low: 200, medium: 500, high: 1000 }
      const count = densityMap[config.noiseDensity]
      for (let i = 0; i < count; i++) {
        const alpha = 0.1 + Math.random() * 0.3
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(Math.random() * 1920, Math.random() * 1080, 1, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'right'
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    ctx.fillText(timeStr, 1920 - 20, 30)

    return exportCanvas.toDataURL('image/png')
  }

  exportFrameWithSpectrum(frequencyData: Uint8Array, config: BackgroundConfig): string {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = 1920
    exportCanvas.height = 1080
    const ctx = exportCanvas.getContext('2d')!

    const originalCtx = this.ctx
    const originalCanvas = this.canvas

    this.ctx = ctx
    this.canvas = exportCanvas

    const savedWidth = this.width
    const savedHeight = this.height
    this.width = 1920
    this.height = 1080

    this.drawBackground(config, 1920, 1080)

    if (config.noiseEnabled) {
      const densityMap: Record<NoiseDensity, number> = { low: 200, medium: 500, high: 1000 }
      const count = densityMap[config.noiseDensity]
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      for (let i = 0; i < count; i++) {
        const alpha = 0.1 + Math.random() * 0.3
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(Math.random() * 1920, Math.random() * 1080, 1, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    this.drawSpectrum(this.style, frequencyData, 1920, 1080)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'right'
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    ctx.fillText(timeStr, 1920 - 20, 30)

    this.ctx = originalCtx
    this.canvas = originalCanvas
    this.width = savedWidth
    this.height = savedHeight

    return exportCanvas.toDataURL('image/png')
  }
}
