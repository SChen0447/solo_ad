import type { CanvasElement, KeyframeProperties } from './canvasElement'

export interface RenderOptions {
  backgroundColor: string
  showGrid: boolean
  gridSize: number
}

export class RenderEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width = 800
  private height = 500

  private options: RenderOptions = {
    backgroundColor: '#1a1a2e',
    showGrid: true,
    gridSize: 50
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize(canvas.width, canvas.height)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options }
  }

  getOptions(): RenderOptions {
    return { ...this.options }
  }

  render(elements: CanvasElement[], currentFrame: number, selectedElementId: string | null = null): void {
    if (!this.ctx || !this.canvas) return

    const ctx = this.ctx

    ctx.clearRect(0, 0, this.width, this.height)

    this.drawBackground(ctx)

    if (this.options.showGrid) {
      this.drawGrid(ctx)
    }

    for (const element of elements) {
      if (!element.visible) continue

      const props = element.getInterpolatedProperties(currentFrame)
      this.drawElement(ctx, element, props, element.id === selectedElementId)
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.options.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1

    for (let x = 0; x <= this.width; x += this.options.gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
    }

    for (let y = 0; y <= this.height; y += this.options.gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(0, 200, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.width / 2, 0)
    ctx.lineTo(this.width / 2, this.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, this.height / 2)
    ctx.lineTo(this.width, this.height / 2)
    ctx.stroke()
  }

  private drawElement(
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    props: KeyframeProperties,
    isSelected: boolean
  ): void {
    ctx.save()

    const centerX = props.x
    const centerY = props.y

    ctx.translate(centerX, centerY)
    ctx.rotate((props.rotation * Math.PI) / 180)
    ctx.scale(props.scale, props.scale)
    ctx.globalAlpha = props.opacity

    const halfW = element.style.width / 2
    const halfH = element.style.height / 2

    if (element.type === 'rectangle') {
      this.drawRectangle(ctx, element, halfW, halfH)
    } else if (element.type === 'circle') {
      this.drawCircle(ctx, element, halfW, halfH)
    } else if (element.type === 'text') {
      this.drawText(ctx, element)
    }

    if (isSelected) {
      this.drawSelectionOutline(ctx, element, halfW, halfH)
    }

    ctx.restore()
  }

  private drawRectangle(
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    halfW: number,
    halfH: number
  ): void {
    const radius = element.style.borderRadius ?? 8

    ctx.fillStyle = element.style.fill
    ctx.beginPath()
    this.roundRect(ctx, -halfW, -halfH, halfW * 2, halfH * 2, radius)
    ctx.fill()

    if (element.style.strokeWidth > 0) {
      ctx.strokeStyle = element.style.stroke
      ctx.lineWidth = element.style.strokeWidth
      ctx.stroke()
    }
  }

  private drawCircle(
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    halfW: number,
    _halfH: number
  ): void {
    const radius = halfW

    ctx.fillStyle = element.style.fill
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()

    if (element.style.strokeWidth > 0) {
      ctx.strokeStyle = element.style.stroke
      ctx.lineWidth = element.style.strokeWidth
      ctx.stroke()
    }
  }

  private drawText(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
    const fontSize = element.style.fontSize ?? 32
    const fontFamily = element.style.fontFamily ?? 'Arial, sans-serif'

    ctx.fillStyle = element.style.fill
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const text = element.style.text ?? 'Text'
    ctx.fillText(text, 0, 0)
  }

  private drawSelectionOutline(
    ctx: CanvasRenderingContext2D,
    _element: CanvasElement,
    halfW: number,
    halfH: number
  ): void {
    const padding = 6
    const x = -halfW - padding
    const y = -halfH - padding
    const w = halfW * 2 + padding * 2
    const h = halfH * 2 + padding * 2

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])

    const handleSize = 6
    const corners = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h]
    ]

    ctx.fillStyle = '#00d4ff'
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  hitTest(
    elements: CanvasElement[],
    currentFrame: number,
    mouseX: number,
    mouseY: number
  ): CanvasElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      if (!element.visible) continue

      const props = element.getInterpolatedProperties(currentFrame)

      const dx = mouseX - props.x
      const dy = mouseY - props.y

      const angle = (-props.rotation * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      const localX = dx * cos - dy * sin
      const localY = dx * sin + dy * cos

      const halfW = element.style.width / 2
      const halfH = element.style.height / 2

      if (
        localX >= -halfW * props.scale &&
        localX <= halfW * props.scale &&
        localY >= -halfH * props.scale &&
        localY <= halfH * props.scale
      ) {
        return element
      }
    }
    return null
  }
}

export const renderEngine = new RenderEngine()
