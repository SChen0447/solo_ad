import type { BoardElement, ToolType, Point } from './types'
import { CANVAS_BG, GRID_COLOR, TEXT_FONT_SIZE } from './types'
import useStore from './StateManager'

const FADE_DURATION = 200
const GRID_SIZE = 5

export interface Viewport {
  offsetX: number
  offsetY: number
  scale: number
}

export type CanvasMode = 'draw' | 'pan'

interface CreateElementResult {
  id: string
  onStart: (point: Point) => void
  onMove: (point: Point) => void
  onEnd: () => void
}

class CanvasHandler {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private viewport: Viewport
  private animationFrameId: number | null = null
  private running = false

  private panStart: Point | null = null
  private panViewportStart: Viewport | null = null
  private mode: CanvasMode = 'draw'

  private inProgress: CreateElementResult | null = null

  private editingTextId: string | null = null
  private textInput: HTMLInputElement | null = null

  private onViewportChange: (v: Viewport) => void

  constructor(canvas: HTMLCanvasElement, onViewportChange: (v: Viewport) => void) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2d context')
    this.ctx = ctx
    this.onViewportChange = onViewportChange

    this.viewport = {
      offsetX: canvas.width / 2,
      offsetY: canvas.height / 2,
      scale: 1,
    }
  }

  getViewport() {
    return { ...this.viewport }
  }

  setViewport(v: Viewport) {
    this.viewport = { ...v }
    this.onViewportChange(this.viewport)
  }

  setMode(mode: CanvasMode) {
    this.mode = mode
  }

  start() {
    if (this.running) return
    this.running = true
    const loop = () => {
      if (!this.running) return
      this.render()
      this.animationFrameId = requestAnimationFrame(loop)
    }
    loop()
  }

  stop() {
    this.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  screenToWorld(sx: number, sy: number): Point {
    return {
      x: (sx - this.viewport.offsetX) / this.viewport.scale,
      y: (sy - this.viewport.offsetY) / this.viewport.scale,
    }
  }

  handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(0.1, Math.min(5, this.viewport.scale * (1 + delta)))

    const rect = this.canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const worldBefore = this.screenToWorld(mx, my)

    this.viewport.scale = newScale
    this.viewport.offsetX = mx - worldBefore.x * newScale
    this.viewport.offsetY = my - worldBefore.y * newScale
    this.onViewportChange(this.viewport)
  }

  handlePointerDown(e: React.PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (e.button === 1 || e.shiftKey) {
      this.mode = 'pan'
    }

    if (this.mode === 'pan' || e.button === 1 || e.shiftKey) {
      this.panStart = { x: sx, y: sy }
      this.panViewportStart = { ...this.viewport }
      this.canvas.style.cursor = 'grabbing'
      return
    }

    const tool = useStore.getState().currentTool
    const world = this.screenToWorld(sx, sy)
    this.cancelEditText()

    if (tool === 'text') {
      const store = useStore.getState()
      const el = store.createElement('text', world.x, world.y, { text: '' })
      el.text = ''
      store.addElement(el)
      this.editingTextId = el.id
      this.showTextInput(sx, sy, el.id)
      const { getWebSocketConnection } = require('./WebSocketConnection')
      getWebSocketConnection().send({
        type: 'add',
        element: { ...el, opacity: 1 },
        userId: el.userId,
      })
      return
    }

    if (tool === 'pen') {
      this.inProgress = this.createStrokeElement(world)
    } else if (tool === 'rect') {
      this.inProgress = this.createRectElement(world)
    } else if (tool === 'ellipse') {
      this.inProgress = this.createEllipseElement(world)
    }
    this.inProgress?.onStart(world)
  }

  handlePointerMove(e: React.PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (this.mode === 'pan' && this.panStart && this.panViewportStart) {
      this.viewport.offsetX = this.panViewportStart.offsetX + (sx - this.panStart.x)
      this.viewport.offsetY = this.panViewportStart.offsetY + (sy - this.panStart.y)
      this.onViewportChange(this.viewport)
      return
    }

    const world = this.screenToWorld(sx, sy)
    this.inProgress?.onMove(world)
  }

  handlePointerUp(e: React.PointerEvent) {
    if (this.mode === 'pan') {
      this.panStart = null
      this.panViewportStart = null
      this.canvas.style.cursor = 'default'
      if (!e.shiftKey) this.mode = 'draw'
      return
    }

    if (this.inProgress) {
      this.inProgress.onEnd()
      this.inProgress = null
    }
  }

  handleDoubleClick(e: React.MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = this.screenToWorld(sx, sy)

    const store = useStore.getState()
    const el = store.createElement('text', world.x, world.y, { text: '' })
    el.text = ''
    store.addElement(el)
    this.editingTextId = el.id
    this.showTextInput(sx, sy, el.id)
    const { getWebSocketConnection } = require('./WebSocketConnection')
    getWebSocketConnection().send({
      type: 'add',
      element: { ...el, opacity: 1 },
      userId: el.userId,
    })
  }

  private createStrokeElement(startPt: Point): CreateElementResult {
    const store = useStore.getState()
    const el = store.createElement('stroke', startPt.x, startPt.y, {
      points: [{ x: startPt.x, y: startPt.y }],
    })
    return {
      id: el.id,
      onStart: () => {
        store.addElement(el)
      },
      onMove: (pt) => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        const newPoints = [...(current.points || []), pt]
        store.updateElement(el.id, {
          points: newPoints,
          x: Math.min(current.x, pt.x),
          y: Math.min(current.y, pt.y),
        })
      },
      onEnd: () => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        const toSend = { ...current, opacity: 1 }
        const { getWebSocketConnection } = require('./WebSocketConnection')
        getWebSocketConnection().send({
          type: 'add',
          element: toSend,
          userId: toSend.userId,
        })
      },
    }
  }

  private createRectElement(startPt: Point): CreateElementResult {
    const store = useStore.getState()
    const el = store.createElement('rect', startPt.x, startPt.y, {
      width: 0,
      height: 0,
    })
    return {
      id: el.id,
      onStart: () => {
        store.addElement(el)
      },
      onMove: (pt) => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        const w = pt.x - el.x
        const h = pt.y - el.y
        store.updateElement(el.id, {
          width: Math.abs(w),
          height: Math.abs(h),
          x: w < 0 ? pt.x : el.x,
          y: h < 0 ? pt.y : el.y,
        })
      },
      onEnd: () => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        if ((current.width || 0) < 2 && (current.height || 0) < 2) {
          store.deleteElement(el.id)
          return
        }
        const toSend = { ...current, opacity: 1 }
        const { getWebSocketConnection } = require('./WebSocketConnection')
        getWebSocketConnection().send({
          type: 'add',
          element: toSend,
          userId: toSend.userId,
        })
      },
    }
  }

  private createEllipseElement(startPt: Point): CreateElementResult {
    const store = useStore.getState()
    const el = store.createElement('ellipse', startPt.x, startPt.y, {
      width: 0,
      height: 0,
    })
    return {
      id: el.id,
      onStart: () => {
        store.addElement(el)
      },
      onMove: (pt) => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        const w = pt.x - el.x
        const h = pt.y - el.y
        store.updateElement(el.id, {
          width: Math.abs(w),
          height: Math.abs(h),
          x: w < 0 ? pt.x : el.x,
          y: h < 0 ? pt.y : el.y,
        })
      },
      onEnd: () => {
        const current = store.elements.find((e) => e.id === el.id)
        if (!current) return
        if ((current.width || 0) < 2 && (current.height || 0) < 2) {
          store.deleteElement(el.id)
          return
        }
        const toSend = { ...current, opacity: 1 }
        const { getWebSocketConnection } = require('./WebSocketConnection')
        getWebSocketConnection().send({
          type: 'add',
          element: toSend,
          userId: toSend.userId,
        })
      },
    }
  }

  private showTextInput(sx: number, sy: number, _id: string) {
    if (this.textInput) this.textInput.remove()
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = '输入文字...'
    input.style.position = 'absolute'
    input.style.left = sx + 'px'
    input.style.top = sy + 'px'
    input.style.fontSize = TEXT_FONT_SIZE + 'px'
    input.style.color = '#444444'
    input.style.background = 'transparent'
    input.style.border = '1px dashed #4da6ff'
    input.style.outline = 'none'
    input.style.padding = '4px 6px'
    input.style.borderRadius = '4px'
    input.style.minWidth = '120px'
    input.style.zIndex = '1000'
    this.canvas.parentElement?.appendChild(input)
    this.textInput = input
    input.focus()

    const commit = () => {
      const value = input.value.trim()
      const store = useStore.getState()
      const el = store.elements.find((e) => e.id === this.editingTextId)
      if (this.editingTextId && el) {
        if (!value) {
          store.deleteElement(this.editingTextId)
        } else {
          store.updateElement(this.editingTextId, { text: value })
          const updated = store.elements.find((e) => e.id === this.editingTextId)
          if (updated) {
            const { getWebSocketConnection } = require('./WebSocketConnection')
            getWebSocketConnection().send({
              type: 'update',
              element: { ...updated, opacity: 1 },
              userId: updated.userId,
            })
          }
        }
      }
      input.remove()
      this.textInput = null
      this.editingTextId = null
    }

    input.addEventListener('blur', commit)
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        input.blur()
      }
      if (ev.key === 'Escape') {
        input.value = ''
        input.blur()
      }
    })
  }

  cancelEditText() {
    if (this.textInput) {
      this.textInput.remove()
      this.textInput = null
      this.editingTextId = null
    }
  }

  private computeOpacity(el: BoardElement): number {
    if (el.opacity >= 1) return 1
    const elapsed = Date.now() - el.createdAt
    if (elapsed >= FADE_DURATION) {
      if (el.opacity !== 1) {
        queueMicrotask(() => {
          useStore.getState().updateElement(el.id, { opacity: 1 })
        })
      }
      return 1
    }
    return elapsed / FADE_DURATION
  }

  private render() {
    const ctx = this.ctx
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight

    ctx.save()
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, w, h)

    ctx.translate(this.viewport.offsetX, this.viewport.offsetY)
    ctx.scale(this.viewport.scale, this.viewport.scale)

    this.drawGrid(ctx, w, h)

    const elements = useStore.getState().elements
    for (const el of elements) {
      const opacity = this.computeOpacity(el)
      ctx.save()
      ctx.globalAlpha = opacity
      this.drawElement(ctx, el)
      ctx.restore()
    }

    ctx.restore()
  }

  private drawGrid(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
    const s = this.viewport.scale
    const { offsetX, offsetY } = this.viewport
    const topLeftX = -offsetX / s
    const topLeftY = -offsetY / s
    const bottomRightX = (screenW - offsetX) / s
    const bottomRightY = (screenH - offsetY) / s

    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 1 / s

    const startX = Math.floor(topLeftX / GRID_SIZE) * GRID_SIZE
    const endX = Math.ceil(bottomRightX / GRID_SIZE) * GRID_SIZE
    const startY = Math.floor(topLeftY / GRID_SIZE) * GRID_SIZE
    const endY = Math.ceil(bottomRightY / GRID_SIZE) * GRID_SIZE

    ctx.beginPath()
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      ctx.moveTo(x, topLeftY)
      ctx.lineTo(x, bottomRightY)
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      ctx.moveTo(topLeftX, y)
      ctx.lineTo(bottomRightX, y)
    }
    ctx.stroke()
  }

  private drawElement(ctx: CanvasRenderingContext2D, el: BoardElement) {
    switch (el.type) {
      case 'stroke':
        this.drawStroke(ctx, el)
        break
      case 'rect':
        this.drawRect(ctx, el)
        break
      case 'ellipse':
        this.drawEllipse(ctx, el)
        break
      case 'text':
        this.drawText(ctx, el)
        break
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, el: BoardElement) {
    if (!el.points || el.points.length < 1) return
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.lineWidth || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const pts = el.points
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.stroke()
  }

  private drawRect(ctx: CanvasRenderingContext2D, el: BoardElement) {
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.lineWidth || 2
    ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0)
  }

  private drawEllipse(ctx: CanvasRenderingContext2D, el: BoardElement) {
    const rx = (el.width || 0) / 2
    const ry = (el.height || 0) / 2
    const cx = el.x + rx
    const cy = el.y + ry
    if (rx <= 0 || ry <= 0) return
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.lineWidth || 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawText(ctx: CanvasRenderingContext2D, el: BoardElement) {
    if (!el.text) return
    ctx.fillStyle = el.color
    ctx.font = `${el.fontSize || TEXT_FONT_SIZE}px system-ui, -apple-system, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(el.text, el.x, el.y)
  }

  dispose() {
    this.stop()
    this.cancelEditText()
  }
}

export default CanvasHandler
