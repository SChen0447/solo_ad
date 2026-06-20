export type TerrainType = 'grass' | 'river' | 'mountain'
export type BuildingType = 'cottage' | 'castle' | 'tower'
export type WeatherType = 'rain' | 'snow' | 'sunny' | 'cloudy'

export interface SceneData {
  terrain: TerrainType[]
  buildings: BuildingType[]
  weather: WeatherType
  keywords: string[]
  seed?: number
}

interface RainDrop { x: number; y: number; speed: number; length: number }
interface SnowFlake { x: number; y: number; speed: number; size: number; drift: number }

export class SceneRenderer {
  private rainDrops: RainDrop[] = []
  private snowFlakes: SnowFlake[] = []
  private weatherAnimationId: number | null = null
  private currentSeed: number = Date.now()

  private seededRandom(seed: number): () => number {
    let s = seed
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    scene: SceneData,
    width: number,
    height: number
  ): void {
    this.currentSeed = scene.seed || Date.now()
    this.stopWeatherAnimation()
    this.clearCanvas(ctx, width, height)
    this.drawSky(ctx, width, height, scene.weather)
    this.drawTerrain(ctx, width, height, scene.terrain)
    this.drawBuildings(ctx, width, height, scene.buildings)
    this.startWeatherAnimation(ctx, width, height, scene.weather)
  }

  private clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h)
  }

  private drawSky(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    weather: WeatherType
  ): void {
    const skyHeight = h * 0.6
    const skyGradient = ctx.createLinearGradient(0, 0, 0, skyHeight)

    switch (weather) {
      case 'sunny':
        skyGradient.addColorStop(0, '#87CEEB')
        skyGradient.addColorStop(0.7, '#B0E0E6')
        skyGradient.addColorStop(1, '#E0F6FF')
        break
      case 'cloudy':
        skyGradient.addColorStop(0, '#708090')
        skyGradient.addColorStop(0.5, '#A9A9A9')
        skyGradient.addColorStop(1, '#D3D3D3')
        break
      case 'rain':
        skyGradient.addColorStop(0, '#4A5568')
        skyGradient.addColorStop(0.5, '#718096')
        skyGradient.addColorStop(1, '#A0AEC0')
        break
      case 'snow':
        skyGradient.addColorStop(0, '#C9D6FF')
        skyGradient.addColorStop(0.5, '#E2E2E2')
        skyGradient.addColorStop(1, '#F5F5F5')
        break
      default:
        skyGradient.addColorStop(0, '#87CEEB')
        skyGradient.addColorStop(1, '#E0F6FF')
    }

    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, w, skyHeight)

    if (weather === 'sunny') {
      this.drawSun(ctx, w, h)
    }

    if (weather === 'sunny' || weather === 'cloudy') {
      this.drawClouds(ctx, w, h)
    }
  }

  private drawSun(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const sunX = w * 0.85
    const sunY = h * 0.15
    const sunR = 30
    const rand = this.seededRandom(this.currentSeed + 1)

    ctx.save()
    const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunR * 2.5)
    glow.addColorStop(0, 'rgba(255, 236, 139, 0.8)')
    glow.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)')
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6)

    ctx.fillStyle = '#FFD700'
    this.drawPixelCircle(ctx, sunX, sunY, sunR, rand)
    ctx.fillStyle = '#FFEC8B'
    this.drawPixelCircle(ctx, sunX - 5, sunY - 5, sunR * 0.5, rand)
    ctx.restore()
  }

  private drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const rand = this.seededRandom(this.currentSeed + 2)
    const cloudCount = 3 + Math.floor(rand() * 3)

    for (let i = 0; i < cloudCount; i++) {
      const cx = 50 + rand() * (w - 150)
      const cy = 30 + rand() * (h * 0.3)
      this.drawPixelCloud(ctx, cx, cy, 40 + rand() * 30, rand)
    }
  }

  private drawPixelCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rand: () => number
  ): void {
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    const pixelSize = 4

    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 1; j++) {
        if (Math.abs(i) + Math.abs(j) <= 3 && rand() > 0.1) {
          const px = x + i * size * 0.35
          const py = y + j * size * 0.4
          const s = size * (0.3 + rand() * 0.3)
          ctx.fillRect(
            Math.floor(px / pixelSize) * pixelSize,
            Math.floor(py / pixelSize) * pixelSize,
            Math.floor(s / pixelSize) * pixelSize,
            Math.floor(s * 0.6 / pixelSize) * pixelSize
          )
        }
      }
    }
    ctx.restore()
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    terrains: TerrainType[]
  ): void {
    const rand = this.seededRandom(this.currentSeed + 3)
    const groundY = h * 0.6

    if (terrains.includes('mountain')) {
      this.drawMountains(ctx, w, h, rand)
    }

    this.drawGround(ctx, w, h, groundY, rand)

    if (terrains.includes('river')) {
      this.drawRiver(ctx, w, h, groundY, rand)
    }

    if (terrains.includes('grass')) {
      this.drawGrass(ctx, w, h, groundY, rand)
    }
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    rand: () => number
  ): void {
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h)
    groundGrad.addColorStop(0, '#6B8E23')
    groundGrad.addColorStop(0.3, '#556B2F')
    groundGrad.addColorStop(1, '#3D5A1E')
    ctx.fillStyle = groundGrad

    const pixelSize = 4
    for (let x = 0; x < w; x += pixelSize) {
      const variance = Math.sin(x * 0.02) * 6 + (rand() - 0.5) * 8
      const gy = groundY + variance
      ctx.fillRect(x, Math.floor(gy / pixelSize) * pixelSize, pixelSize, h - gy)
    }
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rand: () => number
  ): void {
    const mountainCount = 3
    const colors = ['#6A7B9D', '#55667E', '#44556B']
    const baseY = h * 0.6

    for (let m = 0; m < mountainCount; m++) {
      ctx.fillStyle = colors[m % colors.length]
      const peakCount = 2 + Math.floor(rand() * 2)
      const pixelSize = 4

      for (let p = 0; p < peakCount; p++) {
        const baseX = (w / mountainCount) * m + (w / mountainCount / peakCount) * p
        const peakHeight = 80 + rand() * 80
        const peakWidth = 100 + rand() * 80
        const peakX = baseX + peakWidth / 2

        for (let layer = 0; layer < peakHeight; layer += pixelSize) {
          const layerWidth = peakWidth * (1 - layer / peakHeight)
          const startX = peakX - layerWidth / 2
          ctx.fillRect(
            Math.floor(startX / pixelSize) * pixelSize,
            Math.floor((baseY - peakHeight + layer) / pixelSize) * pixelSize,
            Math.floor(layerWidth / pixelSize) * pixelSize,
            pixelSize
          )

          if (layer < peakHeight * 0.15) {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(
              Math.floor(startX / pixelSize) * pixelSize,
              Math.floor((baseY - peakHeight + layer) / pixelSize) * pixelSize,
              Math.floor(layerWidth / pixelSize) * pixelSize,
              pixelSize
            )
            ctx.fillStyle = colors[m % colors.length]
          }
        }
      }
    }
  }

  private drawRiver(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    rand: () => number
  ): void {
    const pixelSize = 4
    const riverWidth = 40 + rand() * 30
    const startY = groundY + 20
    const endY = h - 20

    ctx.save()
    ctx.fillStyle = '#4A90D9'

    for (let y = startY; y < endY; y += pixelSize) {
      const progress = (y - startY) / (endY - startY)
      const curveOffset = Math.sin(progress * Math.PI * 2) * 40
      const centerX = w * 0.3 + curveOffset + (rand() - 0.5) * 4

      const localWidth = riverWidth + Math.sin(progress * Math.PI * 3) * 10
      ctx.fillRect(
        Math.floor((centerX - localWidth / 2) / pixelSize) * pixelSize,
        y,
        Math.floor(localWidth / pixelSize) * pixelSize,
        pixelSize
      )
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    for (let i = 0; i < 8; i++) {
      const y = startY + rand() * (endY - startY)
      const progress = (y - startY) / (endY - startY)
      const curveOffset = Math.sin(progress * Math.PI * 2) * 40
      const x = w * 0.3 + curveOffset + (rand() - 0.5) * riverWidth * 0.6
      ctx.fillRect(
        Math.floor(x / pixelSize) * pixelSize,
        Math.floor(y / pixelSize) * pixelSize,
        pixelSize * 2,
        pixelSize
      )
    }
    ctx.restore()
  }

  private drawGrass(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    rand: () => number
  ): void {
    const pixelSize = 2
    ctx.save()
    const colors = ['#7CFC00', '#32CD32', '#228B22', '#90EE90']

    for (let i = 0; i < 120; i++) {
      const gx = rand() * w
      const gy = groundY + 5 + rand() * (h - groundY - 20)
      const gHeight = 6 + rand() * 10
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)]

      for (let gy2 = 0; gy2 < gHeight; gy2 += pixelSize) {
        const sway = Math.sin(gx * 0.1 + gy2 * 0.3) * 2
        ctx.fillRect(
          Math.floor((gx + sway) / pixelSize) * pixelSize,
          Math.floor((gy - gy2) / pixelSize) * pixelSize,
          pixelSize,
          pixelSize
        )
      }
    }
    ctx.restore()
  }

  private drawBuildings(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    buildings: BuildingType[]
  ): void {
    const rand = this.seededRandom(this.currentSeed + 4)
    const groundY = h * 0.6
    const positions: { x: number; used: boolean }[] = []

    for (let i = 0; i < 5; i++) {
      positions.push({ x: 80 + (w - 200) * (i / 4), used: false })
    }

    buildings.forEach((type, idx) => {
      let posIdx = Math.floor(rand() * positions.length)
      while (positions[posIdx].used && positions.some(p => !p.used)) {
        posIdx = (posIdx + 1) % positions.length
      }
      positions[posIdx].used = true

      const x = positions[posIdx].x + (rand() - 0.5) * 40
      const y = groundY - 10

      switch (type) {
        case 'cottage':
          this.drawCottage(ctx, x, y, rand, idx)
          break
        case 'castle':
          this.drawCastle(ctx, x, y, rand, idx)
          break
        case 'tower':
          this.drawTower(ctx, x, y, rand, idx)
          break
      }
    })

    this.drawTrees(ctx, w, h, groundY, rand, positions)
  }

  private drawCottage(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rand: () => number,
    _idx: number
  ): void {
    const pixelSize = 4
    const width = 60
    const height = 45
    const roofHeight = 25

    ctx.save()
    ctx.fillStyle = '#DEB887'
    for (let row = 0; row < height; row += pixelSize) {
      const bw = width + (rand() - 0.5) * 2
      ctx.fillRect(
        Math.floor((x - bw / 2) / pixelSize) * pixelSize,
        y - row,
        Math.floor(bw / pixelSize) * pixelSize,
        pixelSize
      )
    }

    ctx.fillStyle = '#8B4513'
    for (let row = 0; row < roofHeight; row += pixelSize) {
      const rw = width + 16 - (row / roofHeight) * (width + 16)
      ctx.fillRect(
        Math.floor((x - rw / 2) / pixelSize) * pixelSize,
        y - height - row,
        Math.floor(rw / pixelSize) * pixelSize,
        pixelSize
      )
    }

    ctx.fillStyle = '#8B4513'
    const doorW = 12
    const doorH = 24
    ctx.fillRect(
      Math.floor((x - doorW / 2) / pixelSize) * pixelSize,
      y - doorH,
      Math.floor(doorW / pixelSize) * pixelSize,
      doorH
    )
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + 2, y - doorH / 2, 2, 2)

    ctx.fillStyle = '#87CEEB'
    this.drawPixelWindow(ctx, x - width / 2 + 10, y - height + 12, 12, 12, pixelSize)
    this.drawPixelWindow(ctx, x + width / 2 - 22, y - height + 12, 12, 12, pixelSize)

    if (rand() > 0.5) {
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)'
      for (let i = 0; i < 5; i++) {
        const sx = x - width / 4 + (rand() - 0.5) * 8
        const sy = y - height - roofHeight / 2 - i * 8
        ctx.fillRect(
          Math.floor(sx / pixelSize) * pixelSize,
          Math.floor(sy / pixelSize) * pixelSize,
          pixelSize * 2,
          pixelSize * 2
        )
      }
    }
    ctx.restore()
  }

  private drawCastle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rand: () => number,
    _idx: number
  ): void {
    const pixelSize = 4
    const mainW = 70
    const mainH = 60
    const towerH = 90
    const towerW = 20

    ctx.save()
    ctx.fillStyle = '#808080'
    for (let row = 0; row < mainH; row += pixelSize) {
      ctx.fillRect(x - mainW / 2, y - row, mainW, pixelSize)
    }

    ctx.fillStyle = '#A9A9A9'
    for (let t = -1; t <= 1; t += 2) {
      const tx = x + t * (mainW / 2 + towerW / 2 - 5)
      for (let row = 0; row < towerH; row += pixelSize) {
        ctx.fillRect(
          Math.floor((tx - towerW / 2) / pixelSize) * pixelSize,
          y - row,
          towerW,
          pixelSize
        )
      }

      ctx.fillStyle = '#8B0000'
      const coneH = 25
      for (let row = 0; row < coneH; row += pixelSize) {
        const cw = towerW - (row / coneH) * towerW
        ctx.fillRect(tx - cw / 2, y - towerH - row, cw, pixelSize)
      }
      ctx.fillStyle = '#A9A9A9'

      for (let c = 0; c < 3; c++) {
        const cx = tx - towerW / 2 + c * (towerW / 2)
        ctx.fillRect(cx, y - towerH, pixelSize, pixelSize * 2)
      }
    }

    ctx.fillStyle = '#696969'
    for (let c = 0; c < 5; c++) {
      const cx = x - mainW / 2 + c * (mainW / 4)
      ctx.fillRect(cx, y - mainH, pixelSize, pixelSize * 2)
    }

    ctx.fillStyle = '#2F4F4F'
    const gateW = 16
    const gateH = 32
    ctx.fillRect(x - gateW / 2, y - gateH, gateW, gateH)

    ctx.fillStyle = '#FFEB3B'
    for (let i = 0; i < 6; i++) {
      const wx = x - mainW / 2 + 10 + (i % 3) * 20
      const wy = y - mainH + 15 + Math.floor(i / 3) * 18
      this.drawPixelWindow(ctx, wx, wy, 10, 10, pixelSize)
    }

    ctx.restore()
  }

  private drawTower(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rand: () => number,
    _idx: number
  ): void {
    const pixelSize = 4
    const width = 35
    const height = 100

    ctx.save()
    ctx.fillStyle = '#9370DB'
    for (let row = 0; row < height; row += pixelSize) {
      const shrink = row > height * 0.7 ? (row - height * 0.7) * 0.1 : 0
      const w = width - shrink * 2
      ctx.fillRect(x - w / 2, y - row, w, pixelSize)
    }

    ctx.fillStyle = '#4B0082'
    const roofH = 35
    for (let row = 0; row < roofH; row += pixelSize) {
      const rw = width + 10 - (row / roofH) * (width + 10)
      ctx.fillRect(x - rw / 2, y - height - row, rw, pixelSize)
    }

    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x - 1, y - height - roofH - 8, 2, 12)
    ctx.beginPath()
    ctx.arc(x, y - height - roofH - 12, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#87CEEB'
    for (let i = 0; i < 5; i++) {
      const wy = y - height + 15 + i * 18
      this.drawPixelWindow(ctx, x - 6, wy, 12, 12, pixelSize)
    }

    if (rand() > 0.4) {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.8)'
      const lit = Math.floor(rand() * 5)
      const wy = y - height + 15 + lit * 18
      this.drawPixelWindow(ctx, x - 6, wy, 12, 12, pixelSize, '#FFD700')
    }

    ctx.restore()
  }

  private drawTrees(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    rand: () => number,
    occupied: { x: number; used: boolean }[]
  ): void {
    const pixelSize = 4
    const treeCount = 4 + Math.floor(rand() * 4)
    let placed = 0
    let attempts = 0

    while (placed < treeCount && attempts < 50) {
      attempts++
      const tx = 40 + rand() * (w - 80)
      const tooClose = occupied.some(o => o.used && Math.abs(o.x - tx) < 80)
      if (tooClose) continue

      const ty = groundY + rand() * 10
      placed++

      ctx.fillStyle = '#8B4513'
      const trunkH = 20 + rand() * 15
      ctx.fillRect(
        Math.floor((tx - 3) / pixelSize) * pixelSize,
        ty - trunkH,
        6,
        trunkH
      )

      ctx.fillStyle = rand() > 0.5 ? '#228B22' : '#2E8B57'
      const crownR = 18 + rand() * 12
      this.drawPixelCircle(ctx, tx, ty - trunkH - crownR + 5, crownR, rand)

      ctx.fillStyle = rand() > 0.5 ? '#32CD32' : '#3CB371'
      this.drawPixelCircle(ctx, tx - 5, ty - trunkH - crownR, crownR * 0.6, rand)
    }
  }

  private drawPixelWindow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pixelSize: number,
    color?: string
  ): void {
    ctx.save()
    ctx.fillStyle = color || '#87CEEB'
    ctx.fillRect(
      Math.floor(x / pixelSize) * pixelSize,
      Math.floor(y / pixelSize) * pixelSize,
      Math.floor(w / pixelSize) * pixelSize,
      Math.floor(h / pixelSize) * pixelSize
    )
    ctx.fillStyle = '#4A4A4A'
    ctx.fillRect(
      Math.floor(x / pixelSize) * pixelSize,
      Math.floor((y + h / 2 - 1) / pixelSize) * pixelSize,
      Math.floor(w / pixelSize) * pixelSize,
      2
    )
    ctx.fillRect(
      Math.floor((x + w / 2 - 1) / pixelSize) * pixelSize,
      Math.floor(y / pixelSize) * pixelSize,
      2,
      Math.floor(h / pixelSize) * pixelSize
    )
    ctx.restore()
  }

  private drawPixelCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rand: () => number
  ): void {
    const pixelSize = 4
    for (let dy = -r; dy <= r; dy += pixelSize) {
      for (let dx = -r; dx <= r; dx += pixelSize) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= r && rand() > 0.05) {
          ctx.fillRect(
            Math.floor((cx + dx) / pixelSize) * pixelSize,
            Math.floor((cy + dy) / pixelSize) * pixelSize,
            pixelSize,
            pixelSize
          )
        }
      }
    }
  }

  private startWeatherAnimation(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    weather: WeatherType
  ): void {
    if (weather !== 'rain' && weather !== 'snow') return

    if (weather === 'rain') {
      this.rainDrops = []
      for (let i = 0; i < 80; i++) {
        this.rainDrops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          speed: 8 + Math.random() * 6,
          length: 8 + Math.random() * 8
        })
      }
    } else {
      this.snowFlakes = []
      for (let i = 0; i < 60; i++) {
        this.snowFlakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          speed: 1 + Math.random() * 2,
          size: 2 + Math.random() * 3,
          drift: (Math.random() - 0.5) * 0.8
        })
      }
    }

    const animate = () => {
      ctx.save()

      if (weather === 'rain') {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.7)'
        ctx.lineWidth = 1
        this.rainDrops.forEach(drop => {
          ctx.beginPath()
          ctx.moveTo(drop.x, drop.y)
          ctx.lineTo(drop.x - 2, drop.y + drop.length)
          ctx.stroke()
          drop.y += drop.speed
          drop.x -= 1.5
          if (drop.y > h) {
            drop.y = -drop.length
            drop.x = Math.random() * w
          }
          if (drop.x < 0) drop.x = w
        })
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        this.snowFlakes.forEach(flake => {
          ctx.beginPath()
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
          ctx.fill()
          flake.y += flake.speed
          flake.x += flake.drift + Math.sin(flake.y * 0.02) * 0.3
          if (flake.y > h) {
            flake.y = -flake.size
            flake.x = Math.random() * w
          }
          if (flake.x > w) flake.x = 0
          if (flake.x < 0) flake.x = w
        })
      }

      ctx.restore()
      this.weatherAnimationId = requestAnimationFrame(animate)
    }

    animate()
  }

  stopWeatherAnimation(): void {
    if (this.weatherAnimationId !== null) {
      cancelAnimationFrame(this.weatherAnimationId)
      this.weatherAnimationId = null
    }
  }

  fadeTransition(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    direction: 'in' | 'out',
    progress: number
  ): void {
    ctx.save()
    ctx.fillStyle = `rgba(15, 15, 35, ${direction === 'out' ? progress : 1 - progress})`
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}

export const sceneRenderer = new SceneRenderer()
export default sceneRenderer
