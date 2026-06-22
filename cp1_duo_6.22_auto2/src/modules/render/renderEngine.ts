import type { CanvasElement, KeyframeProperties } from './canvasElement'
import type { PropertyValueDict } from '../timeline/keyframe'

export interface RenderOptions {
  backgroundColor: string
  showGrid: boolean
  gridSize: number
}

export interface RenderStats {
  renderTime: number
  fps: number
  drawCalls: number
  elementsRendered: number
  framesSkipped: number
  cacheHits: number
}

export interface DirtyRegion {
  x: number
  y: number
  width: number
  height: number
}

interface ElementCache {
  properties: KeyframeProperties
  renderData: string
  needsUpdate: boolean
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

  private stats = {
    renderTime: 0,
    fps: 0,
    drawCalls: 0,
    elementsRendered: 0,
    framesSkipped: 0,
    cacheHits: 0
  }

  private lastRenderTime = 0
  private frameTimes: number[] = []
  private maxFrameTimes = 60

  private elementCache = new Map<string, ElementCache>()
  private dirtyRegions: DirtyRegion[] = []
  private fullRenderNeeded = true

  private staticCache = {
    gridDirty: true,
    gridImageData: null as ImageData | null
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.resize(canvas.width, canvas.height)
    this.invalidateStaticCache()
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
    this.invalidateStaticCache()
    this.markFullRender()
  }

  setOptions(options: Partial<RenderOptions>): void {
    const oldGridSize = this.options.gridSize
    const oldShowGrid = this.options.showGrid
    this.options = { ...this.options, ...options }

    if (options.gridSize !== undefined && options.gridSize !== oldGridSize) {
      this.staticCache.gridDirty = true
    }
    if (options.showGrid !== undefined && options.showGrid !== oldShowGrid) {
      this.staticCache.gridDirty = true
    }
    if (options.backgroundColor !== undefined) {
      this.markFullRender()
    }
  }

  getOptions(): RenderOptions {
    return { ...this.options }
  }

  getStats(): RenderStats {
    return { ...this.stats }
  }

  invalidateStaticCache(): void {
    this.staticCache.gridDirty = true
    this.staticCache.gridImageData = null
  }

  markFullRender(): void {
    this.fullRenderNeeded = true
    this.dirtyRegions = []
  }

  markRegionDirty(region: DirtyRegion): void {
    this.dirtyRegions.push(region)
  }

  render(
    elements: CanvasElement[],
    currentFrame: number,
    selectedElementId: string | null = null,
    forceRender = false
  ): boolean {
    if (!this.ctx || !this.canvas) return false

    const startTime = performance.now()

    const shouldRender = forceRender || this.fullRenderNeeded || this.dirtyRegions.length > 0
    if (!shouldRender) {
      this.stats.framesSkipped++
      return false
    }

    const ctx = this.ctx

    this.updateElementCache(elements, currentFrame)

    if (this.fullRenderNeeded) {
      this.fullRender(ctx, elements, currentFrame, selectedElementId)
      this.fullRenderNeeded = false
    } else {
      this.partialRender(ctx, elements, currentFrame, selectedElementId)
    }

    this.dirtyRegions = []

    const endTime = performance.now()
    this.updateStats(endTime - startTime)

    return true
  }

  private updateElementCache(elements: CanvasElement[], currentFrame: number): void {
    for (const element of elements) {
      const props = element.getInterpolatedProperties(currentFrame)
      const cache = this.elementCache.get(element.id)

      const renderData = this.getElementRenderSignature(element, props)

      if (!cache || cache.renderData !== renderData) {
        this.elementCache.set(element.id, {
          properties: props,
          renderData,
          needsUpdate: true
        })
        this.markElementDirty(element, props)
      } else {
        cache.needsUpdate = false
        this.stats.cacheHits++
      }
    }

    for (const [id] of this.elementCache) {
      if (!elements.find(e => e.id === id)) {
        this.elementCache.delete(id)
      }
    }
  }

  private getElementRenderSignature(element: CanvasElement, props: KeyframeProperties): string {
    return JSON.stringify({
      type: element.type,
      style: element.style,
      visible: element.visible,
      props: {
        x: Math.round(props.x * 100) / 100,
        y: Math.round(props.y * 100) / 100,
        rotation: Math.round(props.rotation * 10) / 10,
        scale: Math.round(props.scale * 1000) / 1000,
        opacity: Math.round(props.opacity * 1000) / 1000
      }
    })
  }

  private markElementDirty(element: CanvasElement, props: KeyframeProperties): void {
    const padding = 20
    const scale = props.scale
    const halfW = (element.style.width / 2) * scale + padding
    const halfH = (element.style.height / 2) * scale + padding

    const corners = this.getTransformedCorners(props, halfW, halfH)

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of corners) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }

    this.markRegionDirty({
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    })
  }

  private getTransformedCorners(props: KeyframeProperties, halfW: number, halfH: number): [number, number][] {
    const angle = (props.rotation * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const corners: [number, number][] = [
      [-halfW, -halfH],
      [halfW, -halfH],
      [halfW, halfH],
      [-halfW, halfH]
    ]

    return corners.map(([x, y]) => [
      props.x + x * cos - y * sin,
      props.y + x * sin + y * cos
    ])
  }

  private fullRender(
    ctx: CanvasRenderingContext2D,
    elements: CanvasElement[],
    currentFrame: number,
    selectedElementId: string | null
  ): void {
    ctx.clearRect(0, 0, this.width, this.height)
    this.drawBackground(ctx)

    if (this.options.showGrid) {
      this.drawGridOptimized(ctx)
    }

    this.stats.drawCalls = 0
    this.stats.elementsRendered = 0

    for (const element of elements) {
      if (!element.visible) continue

      const props = element.getInterpolatedProperties(currentFrame)
      this.drawElement(ctx, element, props, element.id === selectedElementId)
      this.stats.elementsRendered++
    }
  }

  private partialRender(
    ctx: CanvasRenderingContext2D,
    elements: CanvasElement[],
    currentFrame: number,
    selectedElementId: string | null
  ): void {
    const padding = 5

    for (const region of this.dirtyRegions) {
      const x = Math.max(0, region.x - padding)
      const y = Math.max(0, region.y - padding)
      const w = Math.min(this.width - x, region.width + padding * 2)
      const h = Math.min(this.height - y, region.height + padding * 2)

      if (w <= 0 || h <= 0) continue

      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()

      ctx.clearRect(x, y, w, h)
      this.drawBackgroundRegion(ctx, x, y, w, h)

      if (this.options.showGrid) {
        this.drawGridRegion(ctx, x, y, w, h)
      }

      ctx.restore()
    }

    ctx.save()
    for (const region of this.dirtyRegions) {
      const x = Math.max(0, region.x - padding)
      const y = Math.max(0, region.y - padding)
      const w = Math.min(this.width - x, region.width + padding * 2)
      const h = Math.min(this.height - y, region.height + padding * 2)
      ctx.rect(x, y, w, h)
    }
    ctx.clip()

    this.stats.drawCalls = 0
    this.stats.elementsRendered = 0

    for (const element of elements) {
      if (!element.visible) continue

      const cache = this.elementCache.get(element.id)
      if (cache && !cache.needsUpdate) continue

      const props = element.getInterpolatedProperties(currentFrame)
      this.drawElement(ctx, element, props, element.id === selectedElementId)
      this.stats.elementsRendered++
    }

    ctx.restore()
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.options.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)
  }

  private drawBackgroundRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = this.options.backgroundColor
    ctx.fillRect(x, y, w, h)
  }

  private drawGridOptimized(ctx: CanvasRenderingContext2D): void {
    if (!this.staticCache.gridDirty && this.staticCache.gridImageData) {
      ctx.putImageData(this.staticCache.gridImageData, 0, 0)
      return
    }

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.width
    tempCanvas.height = this.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) {
      this.drawGrid(ctx)
      return
    }

    this.drawGrid(tempCtx)

    this.staticCache.gridImageData = tempCtx.getImageData(0, 0, this.width, this.height)
    this.staticCache.gridDirty = false

    ctx.putImageData(this.staticCache.gridImageData, 0, 0)
  }

  private drawGridRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1

    const gridSize = this.options.gridSize
    const startX = Math.floor(x / gridSize) * gridSize
    const startY = Math.floor(y / gridSize) * gridSize

    for (let gx = startX; gx < x + w; gx += gridSize) {
      if (gx >= x && gx <= x + w) {
        ctx.beginPath()
        ctx.moveTo(gx, y)
        ctx.lineTo(gx, y + h)
        ctx.stroke()
      }
    }

    for (let gy = startY; gy < y + h; gy += gridSize) {
      if (gy >= y && gy <= y + h) {
        ctx.beginPath()
        ctx.moveTo(x, gy)
        ctx.lineTo(x + w, gy)
        ctx.stroke()
      }
    }

    const centerX = this.width / 2
    const centerY = this.height / 2

    if (centerX >= x && centerX <= x + w) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(centerX, y)
      ctx.lineTo(centerX, y + h)
      ctx.stroke()
    }

    if (centerY >= y && centerY <= y + h) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, centerY)
      ctx.lineTo(x + w, centerY)
      ctx.stroke()
    }
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
    this.stats.drawCalls++
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

  private updateStats(renderTime: number): void {
    this.stats.renderTime = renderTime

    const now = performance.now()
    if (this.lastRenderTime > 0) {
      const frameTime = now - this.lastRenderTime
      const instantFps = 1000 / frameTime

      this.frameTimes.push(instantFps)
      if (this.frameTimes.length > this.maxFrameTimes) {
        this.frameTimes.shift()
      }

      const avgFps = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.stats.fps = Math.round(avgFps * 10) / 10
    }
    this.lastRenderTime = now
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

  interpolatePropertiesFrame(
    elements: CanvasElement[],
    frame: number
  ): Map<string, PropertyValueDict> {
    const result = new Map<string, PropertyValueDict>()
    for (const element of elements) {
      result.set(element.id, element.getPropertyValueDict(frame))
    }
    return result
  }
}

export const renderEngine = new RenderEngine()
