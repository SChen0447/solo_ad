import type { GameElement, FrameData } from '../types'

export class RenderCanvas {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private showGrid: boolean = true
  private selectedId: string | null = null
  private isEditing: boolean = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get canvas context')
    this.ctx = ctx
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
    const { elements, score, fps, isPaused } = data
    const w = this.canvas.width / (window.devicePixelRatio || 1)
    const h = this.canvas.height / (window.devicePixelRatio || 1)

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
      this.drawFPS(fps, w)
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

  private drawFPS(fps: number, w: number) {
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.beginPath()
    this.ctx.roundRect(w - 80, 10, 70, 28, 4)
    this.ctx.fill()
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '14px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(`${fps} FPS`, w - 45, 24)
    this.ctx.restore()
  }

  private drawScore(score: number) {
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.beginPath()
    this.ctx.roundRect(10, 10, 120, 28, 4)
    this.ctx.fill()
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '14px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(`得分: ${score}`, 70, 24)
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
