import type { FrequencyData, TimeMarker, EnvelopePoint } from './types'

const COLOR_LOW = { r: 108, g: 99, b: 255 }
const COLOR_MID = { r: 255, g: 101, b: 132 }
const COLOR_HIGH = { r: 255, g: 209, b: 102 }

function lerpColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  let r: number, g: number, b: number
  if (clamped < 0.5) {
    const localT = clamped * 2
    r = Math.round(COLOR_LOW.r + (COLOR_MID.r - COLOR_LOW.r) * localT)
    g = Math.round(COLOR_LOW.g + (COLOR_MID.g - COLOR_LOW.g) * localT)
    b = Math.round(COLOR_LOW.b + (COLOR_MID.b - COLOR_LOW.b) * localT)
  } else {
    const localT = (clamped - 0.5) * 2
    r = Math.round(COLOR_MID.r + (COLOR_HIGH.r - COLOR_MID.r) * localT)
    g = Math.round(COLOR_MID.g + (COLOR_HIGH.g - COLOR_MID.g) * localT)
    b = Math.round(COLOR_MID.b + (COLOR_HIGH.b - COLOR_MID.b) * localT)
  }
  return `rgb(${r}, ${g}, ${b})`
}

export class WaveformVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number = 1
  private currentFrequencyData: FrequencyData | null = null
  private staticWaveformData: number[] = []
  private duration: number = 0
  private currentTime: number = 0
  private markers: TimeMarker[] = []
  private editingMarkerId: string | null = null
  private draggingLabelId: string | null = null
  private labelOffsets: Map<string, number> = new Map()
  private onCanvasClick: ((time: number, labelX: number) => void) | null = null
  private onMarkerClick: ((id: string) => void) | null = null
  private onLabelDoubleClick: ((id: string) => void) | null = null
  private onLabelDragEnd: ((id: string, offset: number) => void) | null = null
  private onLabelSubmit: ((id: string, newLabel: string) => void) | null = null
  private editingInputValue: string = ''
  private editingInputEl: HTMLInputElement | null = null
  private dragStartX: number = 0
  private dragStartOffset: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.setupDPR()
    this.bindEvents()
  }

  private setupDPR() {
    this.dpr = window.devicePixelRatio || 1
    this.resize()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  setStaticWaveform(data: number[]) {
    this.staticWaveformData = data
  }

  setDuration(duration: number) {
    this.duration = duration
  }

  setCurrentTime(time: number) {
    this.currentTime = time
  }

  setMarkers(markers: TimeMarker[]) {
    this.markers = [...markers]
  }

  setEditingMarker(id: string | null, initialValue: string = '') {
    this.editingMarkerId = id
    this.editingInputValue = initialValue
    this.destroyEditingInput()
    if (id) {
      this.createEditingInput(id, initialValue)
    }
  }

  setFrequencyData(data: FrequencyData) {
    this.currentFrequencyData = data
  }

  setClickCallback(callback: (time: number, labelX: number) => void) {
    this.onCanvasClick = callback
  }

  setMarkerClickCallback(callback: (id: string) => void) {
    this.onMarkerClick = callback
  }

  setLabelDoubleClickCallback(callback: (id: string) => void) {
    this.onLabelDoubleClick = callback
  }

  setLabelDragEndCallback(callback: (id: string, offset: number) => void) {
    this.onLabelDragEnd = callback
  }

  setLabelSubmitCallback(callback: (id: string, newLabel: string) => void) {
    this.onLabelSubmit = callback
  }

  getLabelOffset(markerId: string): number {
    return this.labelOffsets.get(markerId) || 0
  }

  setLabelOffset(markerId: string, offset: number) {
    this.labelOffsets.set(markerId, offset)
  }

  private getCanvasRect() {
    return this.canvas.getBoundingClientRect()
  }

  private timeToX(time: number): number {
    if (this.duration <= 0) return 0
    const rect = this.getCanvasRect()
    return (time / this.duration) * rect.width
  }

  private xToTime(x: number): number {
    const rect = this.getCanvasRect()
    if (rect.width <= 0) return 0
    return (x / rect.width) * this.duration
  }

  private bindEvents() {
    this.canvas.addEventListener('click', this.handleCanvasClick)
    this.canvas.addEventListener('dblclick', this.handleCanvasDoubleClick)
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
  }

  private handleCanvasClick = (e: MouseEvent) => {
    const rect = this.getCanvasRect()
    const x = e.clientX - rect.left
    const time = this.xToTime(x)
    for (const marker of this.markers) {
      const markerX = this.timeToX(marker.time)
      const labelRect = this.getLabelRect(marker)
      if (x >= labelRect.x && x <= labelRect.x + labelRect.w) {
        return
      }
      if (Math.abs(x - markerX) < 5) {
        if (this.onMarkerClick) {
          this.onMarkerClick(marker.id)
        }
        return
      }
    }
    if (this.onCanvasClick) {
      this.onCanvasClick(time, x)
    }
  }

  private handleCanvasDoubleClick = (e: MouseEvent) => {
    const rect = this.getCanvasRect()
    const x = e.clientX - rect.left
    for (const marker of this.markers) {
      const labelRect = this.getLabelRect(marker)
      if (x >= labelRect.x && x <= labelRect.x + labelRect.w) {
        if (this.onLabelDoubleClick) {
          this.onLabelDoubleClick(marker.id)
        }
        return
      }
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    const rect = this.getCanvasRect()
    const x = e.clientX - rect.left
    for (const marker of this.markers) {
      const labelRect = this.getLabelRect(marker)
      if (x >= labelRect.x && x <= labelRect.x + labelRect.w) {
        this.draggingLabelId = marker.id
        this.dragStartX = e.clientX
        this.dragStartOffset = this.getLabelOffset(marker.id)
        document.addEventListener('mousemove', this.handleMouseMove)
        document.addEventListener('mouseup', this.handleMouseUp)
        e.preventDefault()
        return
      }
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.draggingLabelId) return
    const deltaX = e.clientX - this.dragStartX
    this.setLabelOffset(this.draggingLabelId, this.dragStartOffset + deltaX)
  }

  private handleMouseUp = () => {
    if (!this.draggingLabelId) return
    const id = this.draggingLabelId
    let offset = this.getLabelOffset(id)
    const rect = this.getCanvasRect()
    const fivePercent = rect.width * 0.05
    let nearestMarkerOffset = offset
    let minDistance = Infinity
    for (const marker of this.markers) {
      if (marker.id === id) continue
      const markerX = this.timeToX(marker.time)
      const currentMarkerX = this.timeToX(this.markers.find((m) => m.id === id)!.time)
      const markerOffset = markerX - currentMarkerX
      const distance = Math.abs(offset - markerOffset)
      if (distance < minDistance) {
        minDistance = distance
        nearestMarkerOffset = markerOffset
      }
    }
    const snappedToFivePercent = Math.round(offset / fivePercent) * fivePercent
    if (minDistance < fivePercent) {
      offset = nearestMarkerOffset
    } else {
      offset = snappedToFivePercent
    }
    this.setLabelOffset(id, offset)
    if (this.onLabelDragEnd) {
      this.onLabelDragEnd(id, offset)
    }
    this.draggingLabelId = null
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }

  private getLabelRect(marker: TimeMarker): { x: number; y: number; w: number; h: number } {
    const markerX = this.timeToX(marker.time)
    const offset = this.getLabelOffset(marker.id)
    const labelX = markerX + offset
    const paddingX = 10
    const paddingY = 6
    const ctx = this.ctx
    ctx.font = '14px -apple-system, sans-serif'
    const textWidth = ctx.measureText(marker.label).width
    const labelWidth = Math.max(160, textWidth + paddingX * 2)
    const labelHeight = 32
    return {
      x: labelX - labelWidth / 2,
      y: 20,
      w: labelWidth,
      h: labelHeight,
    }
  }

  private createEditingInput(markerId: string, initialValue: string) {
    const marker = this.markers.find((m) => m.id === markerId)
    if (!marker) return
    const labelRect = this.getLabelRect(marker)
    const canvasRect = this.getCanvasRect()
    const input = document.createElement('input')
    input.type = 'text'
    input.value = initialValue || marker.label
    input.style.position = 'fixed'
    input.style.left = `${canvasRect.left + labelRect.x + 10}px`
    input.style.top = `${canvasRect.top + labelRect.y + 6}px`
    input.style.width = '160px'
    input.style.maxWidth = '160px'
    input.style.height = `${labelRect.h - 12}px`
    input.style.border = 'none'
    input.style.background = 'transparent'
    input.style.color = '#FFFFFF'
    input.style.fontSize = '14px'
    input.style.fontFamily = '-apple-system, sans-serif'
    input.style.outline = 'none'
    input.style.zIndex = '1000'
    input.style.overflow = 'hidden'
    input.style.textOverflow = 'ellipsis'
    input.style.boxSizing = 'border-box'
    input.className = 'marker-label-input'
    const submit = () => {
      if (this.onLabelSubmit) {
        this.onLabelSubmit(markerId, input.value)
      }
      this.destroyEditingInput()
    }
    input.addEventListener('blur', submit)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
      if (e.key === 'Escape') {
        this.destroyEditingInput()
      }
    })
    document.body.appendChild(input)
    input.focus()
    input.select()
    this.editingInputEl = input
  }

  private destroyEditingInput() {
    if (this.editingInputEl && this.editingInputEl.parentNode) {
      this.editingInputEl.parentNode.removeChild(this.editingInputEl)
    }
    this.editingInputEl = null
  }

  render() {
    const rect = this.getCanvasRect()
    const { width, height } = rect
    this.ctx.clearRect(0, 0, width, height)
    this.drawStaticWaveform(width, height)
    this.drawFrequencyBars(width, height)
    this.drawTimeMarkers(width, height)
    this.drawPlayhead(width, height)
  }

  private drawStaticWaveform(width: number, height: number) {
    if (this.staticWaveformData.length === 0) return
    const ctx = this.ctx
    const midY = height / 2
    const step = width / this.staticWaveformData.length
    ctx.save()
    ctx.shadowColor = 'rgba(108, 99, 255, 0.5)'
    ctx.shadowBlur = 4
    ctx.lineWidth = 1.5
    const len = this.staticWaveformData.length
    for (let i = 0; i < len - 1; i++) {
      const x1 = i * step
      const x2 = (i + 1) * step
      const amp1 = this.staticWaveformData[i]
      const amp2 = this.staticWaveformData[i + 1]
      const h1 = amp1 * height * 0.4
      const h2 = amp2 * height * 0.4
      const t = (i + 0.5) / len
      ctx.strokeStyle = lerpColor(t)
      ctx.beginPath()
      ctx.moveTo(x1, midY - h1)
      ctx.lineTo(x2, midY - h2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x1, midY + h1)
      ctx.lineTo(x2, midY + h2)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawFrequencyBars(width: number, height: number) {
    if (!this.currentFrequencyData) return
    const ctx = this.ctx
    const { frequencies } = this.currentFrequencyData
    const barCount = Math.min(64, frequencies.length)
    const step = width / barCount
    const padding = step * 0.25
    for (let i = 0; i < barCount; i++) {
      const freqIndex = Math.floor((i / barCount) * frequencies.length)
      const value = frequencies[freqIndex]
      const normalized = value / 255
      const volume = normalized
      const barWidth = 4 + volume * 4
      const barHeight = normalized * height * 0.55
      const x = i * step + padding / 2
      const y = height - barHeight
      const t = i / barCount
      const gradient = ctx.createLinearGradient(0, y, 0, height)
      gradient.addColorStop(0, lerpColor(Math.min(1, t + 0.15)))
      gradient.addColorStop(1, lerpColor(t))
      ctx.fillStyle = gradient
      const actualX = x + (step - padding - barWidth) / 2
      ctx.fillRect(actualX, y, barWidth, barHeight)
    }
  }

  private drawTimeMarkers(width: number, height: number) {
    const ctx = this.ctx
    for (const marker of this.markers) {
      const x = this.timeToX(marker.time)
      if (this.editingMarkerId !== marker.id) {
        ctx.save()
        ctx.strokeStyle = '#FFD166'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
        ctx.restore()
        this.drawLabel(marker)
      } else {
        ctx.save()
        ctx.strokeStyle = '#FFD166'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  private drawLabel(marker: TimeMarker) {
    if (this.editingMarkerId === marker.id) return
    const ctx = this.ctx
    const rect = this.getLabelRect(marker)
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.beginPath()
    const radius = 6
    ctx.moveTo(rect.x + radius, rect.y)
    ctx.lineTo(rect.x + rect.w - radius, rect.y)
    ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + radius)
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h - radius)
    ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - radius, rect.y + rect.h)
    ctx.lineTo(rect.x + radius, rect.y + rect.h)
    ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - radius)
    ctx.lineTo(rect.x, rect.y + radius)
    ctx.quadraticCurveTo(rect.x, rect.y, rect.x + radius, rect.y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(marker.label, rect.x + 10, rect.y + rect.h / 2)
    ctx.restore()
  }

  private drawPlayhead(width: number, height: number) {
    if (this.duration <= 0) return
    const x = this.timeToX(this.currentTime)
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.moveTo(x - 6, 0)
    ctx.lineTo(x + 6, 0)
    ctx.lineTo(x, 10)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  destroy() {
    this.canvas.removeEventListener('click', this.handleCanvasClick)
    this.canvas.removeEventListener('dblclick', this.handleCanvasDoubleClick)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
    this.destroyEditingInput()
  }
}

export class EnvelopeEditor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number = 1
  private points: EnvelopePoint[] = []
  private duration: number = 0
  private currentTime: number = 0
  private selectedPointId: string | null = null
  private draggingPointId: string | null = null
  private onAddPoint: ((time: number, volume: number) => void) | null = null
  private onUpdatePoint: ((id: string, time: number, volume: number) => void) | null = null
  private onSelectPoint: ((id: string | null) => void) | null = null
  private dragStartX: number = 0
  private dragStartY: number = 0
  private dragStartTime: number = 0
  private dragStartVolume: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.setupDPR()
    this.bindEvents()
  }

  private setupDPR() {
    this.dpr = window.devicePixelRatio || 1
    this.resize()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  setPoints(points: EnvelopePoint[]) {
    this.points = [...points]
  }

  setDuration(duration: number) {
    this.duration = duration
  }

  setCurrentTime(time: number) {
    this.currentTime = time
  }

  setSelectedPoint(id: string | null) {
    this.selectedPointId = id
  }

  setAddPointCallback(callback: (time: number, volume: number) => void) {
    this.onAddPoint = callback
  }

  setUpdatePointCallback(callback: (id: string, time: number, volume: number) => void) {
    this.onUpdatePoint = callback
  }

  setSelectPointCallback(callback: (id: string | null) => void) {
    this.onSelectPoint = callback
  }

  getInterpolatedVolume(time: number): number {
    if (this.points.length === 0) return 1
    if (this.points.length === 1) return this.points[0].volume
    const sorted = [...this.points].sort((a, b) => a.time - b.time)
    if (time <= sorted[0].time) return sorted[0].volume
    if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].volume
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i]
      const p2 = sorted[i + 1]
      if (time >= p1.time && time <= p2.time) {
        const t = (time - p1.time) / (p2.time - p1.time)
        return p1.volume + (p2.volume - p1.volume) * t
      }
    }
    return 1
  }

  private getCanvasRect() {
    return this.canvas.getBoundingClientRect()
  }

  private timeToX(time: number): number {
    if (this.duration <= 0) return 0
    const rect = this.getCanvasRect()
    return (time / this.duration) * rect.width
  }

  private xToTime(x: number): number {
    const rect = this.getCanvasRect()
    if (rect.width <= 0) return 0
    return (x / rect.width) * this.duration
  }

  private volumeToY(volume: number): number {
    const rect = this.getCanvasRect()
    return rect.height - volume * rect.height
  }

  private yToVolume(y: number): number {
    const rect = this.getCanvasRect()
    if (rect.height <= 0) return 1
    return Math.max(0, Math.min(1, 1 - y / rect.height))
  }

  private bindEvents() {
    this.canvas.addEventListener('click', this.handleClick)
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
  }

  private handleClick = (e: MouseEvent) => {
    if (this.draggingPointId) return
    const rect = this.getCanvasRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    for (const point of this.points) {
      const px = this.timeToX(point.time)
      const py = this.volumeToY(point.volume)
      if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) <= 10) {
        return
      }
    }
    if (this.points.length >= 10) return
    const time = this.xToTime(x)
    const volume = this.yToVolume(y)
    if (this.onAddPoint) {
      this.onAddPoint(time, volume)
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    const rect = this.getCanvasRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    for (const point of this.points) {
      const px = this.timeToX(point.time)
      const py = this.volumeToY(point.volume)
      if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) <= 10) {
        this.draggingPointId = point.id
        this.selectedPointId = point.id
        this.dragStartX = e.clientX
        this.dragStartY = e.clientY
        this.dragStartTime = point.time
        this.dragStartVolume = point.volume
        if (this.onSelectPoint) {
          this.onSelectPoint(point.id)
        }
        document.addEventListener('mousemove', this.handleMouseMove)
        document.addEventListener('mouseup', this.handleMouseUp)
        e.preventDefault()
        return
      }
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.draggingPointId) return
    const rect = this.getCanvasRect()
    const canvasY = e.clientY - rect.top
    const canvasX = e.clientX - rect.left
    const clampedX = Math.max(0, Math.min(rect.width, canvasX))
    const clampedY = Math.max(0, Math.min(rect.height, canvasY))
    const newTime = Math.max(0, Math.min(this.duration, this.xToTime(clampedX)))
    const newVolume = Math.max(0, Math.min(1, this.yToVolume(clampedY)))
    if (this.onUpdatePoint) {
      this.onUpdatePoint(this.draggingPointId, newTime, newVolume)
    }
  }

  private handleMouseUp = () => {
    this.draggingPointId = null
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }

  render() {
    const rect = this.getCanvasRect()
    const { width, height } = rect
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#222240'
    this.ctx.fillRect(0, 0, width, height)
    this.drawGrid(width, height)
    this.drawEnvelopeCurve(width, height)
    this.drawPoints(width, height)
    this.drawPlayhead(width, height)
  }

  private drawGrid(width: number, height: number) {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  }

  private drawEnvelopeCurve(width: number, height: number) {
    const ctx = this.ctx
    const sorted = [...this.points].sort((a, b) => a.time - b.time)
    ctx.save()
    ctx.strokeStyle = '#FF6584'
    ctx.lineWidth = 2
    ctx.beginPath()
    if (sorted.length === 0) {
      ctx.moveTo(0, this.volumeToY(1))
      ctx.lineTo(width, this.volumeToY(1))
    } else if (sorted.length === 1) {
      const x = this.timeToX(sorted[0].time)
      const y = this.volumeToY(sorted[0].volume)
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    } else {
      ctx.moveTo(0, this.volumeToY(sorted[0].volume))
      for (const p of sorted) {
        ctx.lineTo(this.timeToX(p.time), this.volumeToY(p.volume))
      }
      ctx.lineTo(width, this.volumeToY(sorted[sorted.length - 1].volume))
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawPoints(width: number, height: number) {
    const ctx = this.ctx
    for (const point of this.points) {
      const x = this.timeToX(point.time)
      const y = this.volumeToY(point.volume)
      const isSelected = point.id === this.selectedPointId
      ctx.save()
      if (isSelected) {
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 6
      }
      ctx.fillStyle = '#FF6584'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawPlayhead(width: number, height: number) {
    if (this.duration <= 0) return
    const x = this.timeToX(this.currentTime)
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.restore()
  }

  destroy() {
    this.canvas.removeEventListener('click', this.handleClick)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }
}
