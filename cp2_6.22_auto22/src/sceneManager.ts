import type { Material } from './materialLibrary'

interface SceneState {
  floor: Material | null
  wall: Material | null
  curtain: Material | null
}

interface RoomGeometry {
  wallTop: number
  wallBottom: number
  wallLeft: number
  wallRight: number
  floorTop: number
  floorBottom: number
  vanishingPoint: { x: number; y: number }
  windowLeft: number
  windowRight: number
  windowTop: number
  windowBottom: number
  curtainLeft: number
  curtainRight: number
  curtainWidth: number
}

const PATTERN_CACHE = new Map<string, CanvasPattern>()

export class SceneManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private state: SceneState
  private animationFrameId: number | null = null
  private needsRender: boolean = false
  private dpr: number = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取Canvas 2D上下文')
    this.ctx = ctx
    this.state = {
      floor: null,
      wall: null,
      curtain: null
    }
    this.dpr = window.devicePixelRatio || 1
    this.resize()
  }

  setFloor(material: Material): void {
    this.state.floor = material
    this.requestRender()
  }

  setWall(material: Material): void {
    this.state.wall = material
    this.requestRender()
  }

  setCurtain(material: Material): void {
    this.state.curtain = material
    this.requestRender()
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.scale(this.dpr, this.dpr)
    this.requestRender()
  }

  requestRender(): void {
    this.needsRender = true
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.render()
        this.animationFrameId = null
      })
    }
  }

  render(): void {
    if (!this.needsRender) return
    this.needsRender = false

    const width = this.canvas.width / this.dpr
    const height = this.canvas.height / this.dpr
    const geom = this.calculateGeometry(width, height)

    this.ctx.clearRect(0, 0, width, height)

    this.drawBackground(width, height)
    this.drawFloor(geom)
    this.drawWall(geom)
    this.drawWindow(geom)
    this.drawCurtains(geom)
    this.drawFloorGrid(geom)
  }

  private calculateGeometry(width: number, height: number): RoomGeometry {
    const centerX = width / 2
    const horizonY = height * 0.42

    const wallTop = height * 0.08
    const wallBottom = horizonY
    const wallLeft = width * 0.15
    const wallRight = width * 0.85

    const floorTop = horizonY
    const floorBottom = height

    const windowRatio = 0.28
    const windowWidth = (wallRight - wallLeft) * windowRatio
    const windowLeft = wallLeft + (wallRight - wallLeft) * 0.08
    const windowRight = windowLeft + windowWidth
    const windowHeight = (wallBottom - wallTop) * 0.55
    const windowTop = wallTop + (wallBottom - wallTop - windowHeight) / 2
    const windowBottom = windowTop + windowHeight

    const curtainWidth = windowWidth * 0.35
    const curtainLeft = windowLeft - curtainWidth * 0.3
    const curtainRight = windowRight + curtainWidth * 0.3

    return {
      wallTop,
      wallBottom,
      wallLeft,
      wallRight,
      floorTop,
      floorBottom,
      vanishingPoint: { x: centerX, y: horizonY },
      windowLeft,
      windowRight,
      windowTop,
      windowBottom,
      curtainLeft,
      curtainRight,
      curtainWidth
    }
  }

  private drawBackground(width: number, height: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#F8FAFC')
    gradient.addColorStop(1, '#E2E8F0')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)
  }

  private drawFloor(geom: RoomGeometry): void {
    if (!this.state.floor) return

    const { floorTop, floorBottom, wallLeft, wallRight } = geom

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.moveTo(0, floorBottom)
    this.ctx.lineTo(wallLeft, floorTop)
    this.ctx.lineTo(wallRight, floorTop)
    this.ctx.lineTo(this.canvas.width / this.dpr, floorBottom)
    this.ctx.closePath()
    this.ctx.clip()

    const pattern = this.createFloorPattern(this.state.floor)
    if (pattern) {
      this.ctx.fillStyle = pattern
    } else {
      this.ctx.fillStyle = this.state.floor.color
    }
    this.ctx.fillRect(0, floorTop, this.canvas.width / this.dpr, floorBottom - floorTop)

    this.ctx.restore()

    this.ctx.save()
    const shadowGradient = this.ctx.createLinearGradient(0, floorTop, 0, floorTop + 30)
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.15)')
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    this.ctx.fillStyle = shadowGradient
    this.ctx.fillRect(wallLeft, floorTop, wallRight - wallLeft, 30)
    this.ctx.restore()
  }

  private createFloorPattern(material: Material): CanvasPattern | null {
    const cacheKey = `floor-${material.id}-${this.dpr}`
    if (PATTERN_CACHE.has(cacheKey)) {
      return PATTERN_CACHE.get(cacheKey)!
    }

    const patternCanvas = document.createElement('canvas')
    const pctx = patternCanvas.getContext('2d')
    if (!pctx) return null

    const tileWidth = 80
    const tileHeight = 16
    patternCanvas.width = tileWidth
    patternCanvas.height = tileHeight

    pctx.fillStyle = material.color
    pctx.fillRect(0, 0, tileWidth, tileHeight)

    if (material.pattern === 'wood' && material.secondaryColor) {
      pctx.strokeStyle = material.secondaryColor
      pctx.lineWidth = 1
      
      for (let i = 0; i < 3; i++) {
        const y = (tileHeight / 4) * (i + 1)
        pctx.beginPath()
        pctx.moveTo(0, y + (Math.random() - 0.5) * 2)
        for (let x = 0; x <= tileWidth; x += 10) {
          pctx.lineTo(x, y + (Math.random() - 0.5) * 3)
        }
        pctx.stroke()
      }

      pctx.strokeStyle = material.secondaryColor
      pctx.lineWidth = 0.5
      pctx.beginPath()
      pctx.moveTo(tileWidth * 0.3, 0)
      pctx.lineTo(tileWidth * 0.3, tileHeight)
      pctx.stroke()
      pctx.beginPath()
      pctx.moveTo(tileWidth * 0.7, 0)
      pctx.lineTo(tileWidth * 0.7, tileHeight)
      pctx.stroke()
    } else if (material.pattern === 'tile' && material.secondaryColor) {
      pctx.strokeStyle = material.secondaryColor
      pctx.lineWidth = 2
      pctx.strokeRect(1, 1, tileWidth - 2, tileHeight - 2)
      
      const midX = tileWidth / 2
      pctx.beginPath()
      pctx.moveTo(midX, 0)
      pctx.lineTo(midX, tileHeight)
      pctx.stroke()
    } else if (material.pattern === 'marble' && material.secondaryColor) {
      pctx.strokeStyle = material.secondaryColor
      pctx.lineWidth = 0.8
      pctx.globalAlpha = 0.5
      
      for (let i = 0; i < 4; i++) {
        const startX = Math.random() * tileWidth
        pctx.beginPath()
        pctx.moveTo(startX, 0)
        let x = startX
        for (let y = 0; y <= tileHeight; y += 4) {
          x += (Math.random() - 0.5) * 8
          pctx.lineTo(x, y)
        }
        pctx.stroke()
      }
      pctx.globalAlpha = 1
    }

    const pattern = this.ctx.createPattern(patternCanvas, 'repeat')
    if (pattern) {
      PATTERN_CACHE.set(cacheKey, pattern)
    }
    return pattern
  }

  private drawFloorGrid(geom: RoomGeometry): void {
    const { floorTop, floorBottom, wallLeft, wallRight, vanishingPoint } = geom
    
    this.ctx.save()
    this.ctx.strokeStyle = '#CBD5E1'
    this.ctx.lineWidth = 1
    this.ctx.globalAlpha = 0.6

    const gridLines = 10
    for (let i = 1; i <= gridLines; i++) {
      const t = i / (gridLines + 1)
      const y = floorTop + (floorBottom - floorTop) * (t * t)
      
      const leftX = wallLeft + (0 - wallLeft) * t
      const rightX = wallRight + (this.canvas.width / this.dpr - wallRight) * t

      this.ctx.beginPath()
      this.ctx.moveTo(leftX, y)
      this.ctx.lineTo(rightX, y)
      this.ctx.stroke()
    }

    const perspectiveLines = 8
    for (let i = 1; i < perspectiveLines; i++) {
      const x = wallLeft + ((wallRight - wallLeft) * i) / perspectiveLines
      this.ctx.beginPath()
      this.ctx.moveTo(x, floorTop)
      this.ctx.lineTo(
        x + (vanishingPoint.x - x) * 1.5,
        floorBottom
      )
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  private drawWall(geom: RoomGeometry): void {
    if (!this.state.wall) return

    const { wallTop, wallBottom, wallLeft, wallRight } = geom

    this.ctx.save()
    
    const pattern = this.createWallPattern(this.state.wall, geom)
    if (pattern) {
      this.ctx.fillStyle = pattern
    } else {
      const gradient = this.ctx.createLinearGradient(wallLeft, wallTop, wallRight, wallTop)
      gradient.addColorStop(0, this.adjustBrightness(this.state.wall.color, -10))
      gradient.addColorStop(0.5, this.state.wall.color)
      gradient.addColorStop(1, this.adjustBrightness(this.state.wall.color, -5))
      this.ctx.fillStyle = gradient
    }
    
    this.ctx.fillRect(wallLeft, wallTop, wallRight - wallLeft, wallBottom - wallTop)
    this.ctx.restore()

    this.ctx.save()
    const topShadow = this.ctx.createLinearGradient(wallLeft, wallTop, wallLeft, wallTop + 20)
    topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.1)')
    topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    this.ctx.fillStyle = topShadow
    this.ctx.fillRect(wallLeft, wallTop, wallRight - wallLeft, 20)
    this.ctx.restore()
  }

  private createWallPattern(material: Material, _geom: RoomGeometry): CanvasPattern | null {
    if (material.pattern === 'plain') return null

    const cacheKey = `wall-${material.id}-${this.dpr}`
    if (PATTERN_CACHE.has(cacheKey)) {
      return PATTERN_CACHE.get(cacheKey)!
    }

    const patternCanvas = document.createElement('canvas')
    const pctx = patternCanvas.getContext('2d')
    if (!pctx) return null

    if (material.pattern === 'brick' && material.secondaryColor) {
      const brickW = 40
      const brickH = 20
      const gap = 3
      patternCanvas.width = brickW * 2 + gap * 3
      patternCanvas.height = brickH + gap

      pctx.fillStyle = material.color
      pctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height)

      pctx.fillStyle = material.secondaryColor
      
      pctx.fillRect(gap, gap, brickW, brickH - gap)
      pctx.fillRect(brickW + gap * 2, gap, brickW, brickH - gap)
      
      pctx.fillRect(0, 0, gap / 2, patternCanvas.height)
      pctx.fillRect(brickW + gap, 0, gap, patternCanvas.height)
      pctx.fillRect(patternCanvas.width - gap / 2, 0, gap / 2, patternCanvas.height)
      
      pctx.fillRect(0, 0, patternCanvas.width, gap / 2)
      pctx.fillRect(0, brickH - gap / 2, patternCanvas.width, gap / 2)
    } else {
      return null
    }

    const pattern = this.ctx.createPattern(patternCanvas, 'repeat')
    if (pattern) {
      PATTERN_CACHE.set(cacheKey, pattern)
    }
    return pattern
  }

  private drawWindow(geom: RoomGeometry): void {
    const { windowLeft, windowRight, windowTop, windowBottom } = geom

    this.ctx.save()
    
    const windowGradient = this.ctx.createLinearGradient(windowLeft, windowTop, windowLeft, windowBottom)
    windowGradient.addColorStop(0, '#87CEEB')
    windowGradient.addColorStop(1, '#B0E0E6')
    this.ctx.fillStyle = windowGradient
    this.ctx.fillRect(windowLeft, windowTop, windowRight - windowLeft, windowBottom - windowTop)

    this.ctx.strokeStyle = '#F8FAFC'
    this.ctx.lineWidth = 6
    
    const midX = (windowLeft + windowRight) / 2
    this.ctx.beginPath()
    this.ctx.moveTo(midX, windowTop)
    this.ctx.lineTo(midX, windowBottom)
    this.ctx.stroke()

    const midY = (windowTop + windowBottom) / 2
    this.ctx.beginPath()
    this.ctx.moveTo(windowLeft, midY)
    this.ctx.lineTo(windowRight, midY)
    this.ctx.stroke()

    this.ctx.strokeStyle = '#E2E8F0'
    this.ctx.lineWidth = 4
    this.ctx.strokeRect(windowLeft - 2, windowTop - 2, windowRight - windowLeft + 4, windowBottom - windowTop + 4)

    this.ctx.restore()
  }

  private drawCurtains(geom: RoomGeometry): void {
    if (!this.state.curtain) return

    const { windowTop, windowBottom, windowLeft, windowRight, curtainWidth } = geom

    const leftCurtainX = windowLeft - curtainWidth * 0.2
    const rightCurtainX = windowRight + curtainWidth * 0.2

    this.drawSingleCurtain(leftCurtainX, windowTop, curtainWidth, windowBottom - windowTop, 'left', this.state.curtain)
    this.drawSingleCurtain(rightCurtainX - curtainWidth, windowTop, curtainWidth, windowBottom - windowTop, 'right', this.state.curtain)
  }

  private drawSingleCurtain(
    x: number,
    y: number,
    width: number,
    height: number,
    side: 'left' | 'right',
    material: Material
  ): void {
    this.ctx.save()

    const folds = 7
    const foldWidth = width / folds

    for (let i = 0; i < folds; i++) {
      const foldX = x + i * foldWidth
      const t = i / (folds - 1)
      
      const brightness = side === 'left' 
        ? -15 + t * 30
        : 15 - t * 30
      
      const foldColor = this.adjustBrightness(material.color, brightness)
      
      this.ctx.fillStyle = foldColor
      this.ctx.beginPath()
      this.ctx.moveTo(foldX, y)
      this.ctx.lineTo(foldX + foldWidth, y)
      this.ctx.lineTo(foldX + foldWidth * 0.8, y + height)
      this.ctx.lineTo(foldX + foldWidth * 0.2, y + height)
      this.ctx.closePath()
      this.ctx.fill()
    }

    this.ctx.fillStyle = this.adjustBrightness(material.color, -20)
    this.ctx.fillRect(x - 2, y - 6, width + 4, 8)

    this.ctx.restore()
  }

  private adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, Math.min(255, (num >> 16) + amt))
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt))
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`
  }

  getScreenshot(): string {
    const tempCanvas = document.createElement('canvas')
    const maxWidth = 800
    const scale = Math.min(1, maxWidth / this.canvas.width)
    tempCanvas.width = this.canvas.width * scale
    tempCanvas.height = this.canvas.height * scale
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return ''
    tempCtx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height)
    return tempCanvas.toDataURL('image/jpeg', 0.7)
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    PATTERN_CACHE.clear()
  }
}
