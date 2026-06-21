import type { GameElement, FrameData } from '../types'

export class RenderCanvas {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private showGrid: boolean = true
  private selectedId: string | null = null
  private isEditing: boolean = true
  private lastScore: number = 0
  private scoreAnimTime: number = 0
  private pauseBtnRect: { x: number; y: number; r: number } = { x: 0, y: 0, r: 16 }
  private isPauseBtnHover: boolean = false
  private onPauseClick: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get canvas context')
    this.ctx = ctx
    this.setupCanvasEvents()
  }

  private setupCanvasEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isEditing) return
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const dx = x - this.pauseBtnRect.x
      const dy = y - this.pauseBtnRect.y
      const wasHover = this.isPauseBtnHover
      this.isPauseBtnHover = dx * dx + dy * dy <= this.pauseBtnRect.r * this.pauseBtnRect.r
      if (wasHover !== this.isPauseBtnHover) {
        this.canvas.style.cursor = this.isPauseBtnHover ? 'pointer' : 'default'
      }
    })
    this.canvas.addEventListener('click', (e) => {
      if (this.isEditing || !this.onPauseClick) return
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (this.isPointInPauseButton(x, y)) {
        e.stopPropagation()
        this.onPauseClick()
      }
    })
  }

  setOnPauseClick(cb: () => void) {
    this.onPauseClick = cb
  }

  isPointInPauseButton(x: number, y: number): boolean {
    const dx = x - this.pauseBtnRect.x
    const dy = y - this.pauseBtnRect.y
    return dx * dx + dy * dy <= this.pauseBtnRect.r * this.pauseBtnRect.r
  }

  setEditing(editing: boolean) {
    this.isEditing = editing
  }

  setSelectedId(id: string | null) {
    this.selectedId = id
  }

  setShowGrid(show: boolean) {
    this.showGrid = show
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'
    this.ctx.scale(dpr, dpr)
  }

  render(data: FrameData) {
    const { elements, score, fps, avgFps, minFps, isPaused } = data
    const w = this.canvas.width / (window.devicePixelRatio || 1)
    const h = this.canvas.height / (window.devicePixelRatio || 1)

    if (score !== this.lastScore) {
      this.scoreAnimTime = performance.now()
      this.lastScore = score
    }

    this.ctx.fillStyle = '#E0E0E0'
    this.ctx.fillRect(0, 0, w, h)

    if (this.showGrid && this.isEditing) {
      this.drawGrid(w, h)
    }

    for (const el of elements) {
      this.drawElement(el)
    }

    if (this.isEditing && this.selectedId) {
      const el = elements.find(e => e.id === this.selectedId)
      if (el) {
        this.drawSelection(el)
      }
    }

    if (!this.isEditing) {
      const perfX = this.drawPerfPanel(fps, avgFps, minFps, w)
      this.drawPauseButton(perfX - 24, 24, isPaused)
      this.drawScore(score)
      if (isPaused) {
        this.drawPauseMask(w, h)
      }
    }
  }

  private drawGrid(w: number, h: number) {
    this.ctx.strokeStyle = '#C0C0C0'
    this.ctx.lineWidth = 0.5
    this.ctx.beginPath()
    for (let x = 0; x <= w; x += 10) {
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, h)
    }
    for (let y = 0; y <= h; y += 10) {
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(w, y)
    }
    this.ctx.stroke()
  }

  private drawElement(el: GameElement) {
    this.ctx.save()

    if (el.type === 'rect') {
      this.ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
      this.ctx.rotate((el.rotation * Math.PI) / 180)
      this.ctx.fillStyle = el.color
      this.ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height)
    } else if (el.type === 'circle') {
      const r = el.radius || Math.min(el.width, el.height) / 2
      this.ctx.translate(el.x, el.y)
      this.ctx.rotate((el.rotation * Math.PI) / 180)
      this.ctx.fillStyle = el.color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, r, 0, Math.PI * 2)
      this.ctx.fill()
    } else if (el.type === 'text') {
      this.ctx.translate(el.x, el.y + (el.fontSize || 24))
      this.ctx.rotate((el.rotation * Math.PI) / 180)
      this.ctx.fillStyle = el.color
      this.ctx.font = `${el.fontSize || 24}px sans-serif`
      this.ctx.fillText(el.text || '', 0, 0)
    }

    this.ctx.restore()
  }

  private drawSelection(el: GameElement) {
    this.ctx.save()
    this.ctx.strokeStyle = '#4A90D9'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([6, 4])

    if (el.type === 'circle' && el.radius) {
      this.ctx.beginPath()
      this.ctx.arc(el.x, el.y, el.radius + 4, 0, Math.PI * 2)
      this.ctx.stroke()

      this.ctx.setLineDash([])
      this.ctx.fillStyle = '#4A90D9'
      this.ctx.beginPath()
      this.ctx.arc(el.x + el.radius + 4, el.y, 6, 0, Math.PI * 2)
      this.ctx.fill()
    } else {
      this.ctx.strokeRect(el.x - 3, el.y - 3, el.width + 6, el.height + 6)

      this.ctx.setLineDash([])
      this.ctx.fillStyle = '#4A90D9'
      const handles = [
        [el.x - 3, el.y - 3],
        [el.x + el.width + 3, el.y - 3],
        [el.x - 3, el.y + el.height + 3],
        [el.x + el.width + 3, el.y + el.height + 3]
      ]
      for (const [hx, hy] of handles) {
        this.ctx.fillRect(hx - 4, hy - 4, 8, 8)
      }
    }
    this.ctx.restore()
  }

  private drawPerfPanel(fps: number, avgFps: number, minFps: number, w: number): number {
    const panelW = 110
    const panelH = 72
    const x = w - panelW - 10
    const y = 10

    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.beginPath()
    this.ctx.roundRect(x, y, panelW, panelH, 4)
    this.ctx.fill()

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '11px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'

    const lineHeight = 20
    const labelW = 36

    const fpsColor = fps >= 55 ? '#10B981' : fps >= 30 ? '#F59E0B' : '#EF4444'
    this.ctx.fillStyle = '#aaa'
    this.ctx.fillText('当前', x + 10, y + 8)
    this.ctx.fillStyle = fpsColor
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`${fps}`, x + panelW - 10, y + 8)
    this.ctx.textAlign = 'left'
    this.ctx.fillText('FPS', x + labelW + 10, y + 8)

    this.ctx.fillStyle = '#aaa'
    this.ctx.fillText('平均', x + 10, y + 8 + lineHeight)
    this.ctx.fillStyle = '#fff'
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`${avgFps}`, x + panelW - 10, y + 8 + lineHeight)
    this.ctx.textAlign = 'left'
    this.ctx.fillText('FPS', x + labelW + 10, y + 8 + lineHeight)

    this.ctx.fillStyle = '#aaa'
    this.ctx.fillText('最低', x + 10, y + 8 + lineHeight * 2)
    const minColor = minFps >= 55 ? '#10B981' : minFps >= 30 ? '#F59E0B' : '#EF4444'
    this.ctx.fillStyle = minColor
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`${minFps}`, x + panelW - 10, y + 8 + lineHeight * 2)
    this.ctx.textAlign = 'left'
    this.ctx.fillText('FPS', x + labelW + 10, y + 8 + lineHeight * 2)

    this.ctx.restore()
    return x
  }

  private drawPauseButton(x: number, y: number, isPaused: boolean) {
    this.pauseBtnRect = { x, y, r: 16 }
    this.ctx.save()

    const alpha = this.isPauseBtnHover ? 0.85 : 0.6
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
    this.ctx.beginPath()
    this.ctx.arc(x, y, 16, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.fillStyle = '#FFFFFF'
    if (isPaused) {
      this.ctx.beginPath()
      this.ctx.moveTo(x - 4, y - 8)
      this.ctx.lineTo(x - 4, y + 8)
      this.ctx.lineTo(x + 8, y)
      this.ctx.closePath()
      this.ctx.fill()
    } else {
      this.ctx.fillRect(x - 6, y - 7, 4, 14)
      this.ctx.fillRect(x + 2, y - 7, 4, 14)
    }

    this.ctx.restore()
  }

  private drawScore(score: number) {
    const animElapsed = performance.now() - this.scoreAnimTime
    const animDuration = 200
    let scale = 1
    if (animElapsed < animDuration) {
      const t = animElapsed / animDuration
      if (t < 0.5) {
        scale = 1 + t * 0.6
      } else {
        scale = 1.3 - (t - 0.5) * 0.6
      }
    }

    this.ctx.save()
    const x = 70
    const y = 24

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.beginPath()
    this.ctx.roundRect(10, 10, 120, 28, 4)
    this.ctx.fill()

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '14px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('得分: ', 20, y)

    if (scale !== 1) {
      this.ctx.translate(x + 10, y)
      this.ctx.scale(scale, scale)
      this.ctx.translate(-(x + 10), -y)
    }
    this.ctx.fillStyle = '#10B981'
    this.ctx.font = `${14 * scale}px monospace`
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(`${score}`, x + 10, y)

    this.ctx.restore()
  }

  private drawPauseMask(w: number, h: number) {
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fillRect(0, 0, w, h)
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = 'bold 48px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('已暂停', w / 2, h / 2)
    this.ctx.restore()
  }

  getElementAtPoint(x: number, y: number, elements: GameElement[]): GameElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (this.isPointInElement(x, y, el)) {
        return el
      }
    }
    return null
  }

  private isPointInElement(x: number, y: number, el: GameElement): boolean {
    if (el.type === 'circle' && el.radius) {
      const dx = x - el.x
      const dy = y - el.y
      return dx * dx + dy * dy <= el.radius * el.radius
    } else {
      return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
    }
  }
}
