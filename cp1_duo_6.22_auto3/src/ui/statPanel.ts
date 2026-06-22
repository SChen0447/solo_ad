import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

export interface StatsData {
  fps: number
  vertices: number
  drawCalls: number
}

export class StatsPanel {
  private css2dRenderer: CSS2DRenderer
  private panelDiv: HTMLElement
  private fpsSpan: HTMLElement
  private verticesSpan: HTMLElement
  private drawCallsSpan: HTMLElement
  private blinkTimerId: number | null = null
  private isWarning: boolean = false
  private blinkVisible: boolean = true
  private frameCount: number = 0
  private lastFpsTime: number = 0
  private currentFps: number = 0

  constructor(scene: THREE.Scene) {
    this.css2dRenderer = new CSS2DRenderer()
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight)
    this.css2dRenderer.domElement.style.position = 'absolute'
    this.css2dRenderer.domElement.style.top = '0'
    this.css2dRenderer.domElement.style.left = '0'
    this.css2dRenderer.domElement.style.pointerEvents = 'none'
    this.css2dRenderer.domElement.style.zIndex = '100'
    document.getElementById('app')!.appendChild(this.css2dRenderer.domElement)

    this.panelDiv = document.createElement('div')
    this.panelDiv.id = 'stats-hud'
    this.panelDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      color: #00ff88;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.6;
      min-width: 160px;
      user-select: none;
      z-index: 200;
      pointer-events: none;
    `

    const fpsRow = this.createRow('FPS')
    this.fpsSpan = fpsRow.value
    const vertRow = this.createRow('顶点数')
    this.verticesSpan = vertRow.value
    const drawRow = this.createRow('绘制调用')
    this.drawCallsSpan = drawRow.value

    this.panelDiv.appendChild(fpsRow.row)
    this.panelDiv.appendChild(vertRow.row)
    this.panelDiv.appendChild(drawRow.row)

    const css2dObj = new CSS2DObject(this.panelDiv)
    css2dObj.position.set(0, 0, 0)
    scene.add(css2dObj)

    this.lastFpsTime = performance.now()
  }

  private createRow(label: string): { row: HTMLElement; value: HTMLElement } {
    const row = document.createElement('div')
    row.style.cssText = 'display: flex; justify-content: space-between; gap: 20px;'
    const lbl = document.createElement('span')
    lbl.style.opacity = '0.8'
    lbl.textContent = label
    const val = document.createElement('span')
    val.style.fontWeight = 'bold'
    val.textContent = '--'
    row.appendChild(lbl)
    row.appendChild(val)
    return { row, value: val }
  }

  getCSS2DRenderer(): CSS2DRenderer {
    return this.css2dRenderer
  }

  tickFPS(): number {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFpsTime
    if (elapsed >= 1000) {
      this.currentFps = (this.frameCount * 1000) / elapsed
      this.frameCount = 0
      this.lastFpsTime = now
    }
    return this.currentFps
  }

  update(stats: StatsData): void {
    this.fpsSpan.textContent = stats.fps.toFixed(0)
    this.verticesSpan.textContent = this.formatNumber(stats.vertices)
    this.drawCallsSpan.textContent = stats.drawCalls.toString()

    if (stats.fps < 30 && !this.isWarning) {
      this.isWarning = true
      this.blinkVisible = true
      this.startBlink()
    } else if (stats.fps >= 30 && this.isWarning) {
      this.isWarning = false
      this.stopBlink()
      this.panelDiv.style.background = 'rgba(0, 0, 0, 0.6)'
      this.panelDiv.style.opacity = '1'
    }
  }

  private startBlink(): void {
    this.stopBlink()
    this.blinkTimerId = window.setInterval(() => {
      this.blinkVisible = !this.blinkVisible
      this.panelDiv.style.background = this.blinkVisible
        ? 'rgba(255, 0, 0, 0.6)'
        : 'rgba(255, 0, 0, 0.3)'
    }, 250)
  }

  private stopBlink(): void {
    if (this.blinkTimerId !== null) {
      clearInterval(this.blinkTimerId)
      this.blinkTimerId = null
    }
  }

  onResize(): void {
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight)
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }
}

export function createHoverTooltip(): {
  tooltip: HTMLElement
  update: (x: number, y: number, elevation: number) => void
  hide: () => void
} {
  const tooltip = document.getElementById('elevation-tooltip')!

  return {
    tooltip,
    update: (x: number, y: number, elevation: number) => {
      tooltip.style.display = 'block'
      tooltip.style.left = x + 'px'
      tooltip.style.top = y + 'px'
      tooltip.textContent = `海拔: ${elevation.toFixed(2)}`
    },
    hide: () => {
      tooltip.style.display = 'none'
    }
  }
}

export function createHighlightGrid(): {
  mesh: THREE.LineSegments
  updatePosition: (x: number, z: number, height: number, cellSize: number) => void
} {
  const geometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1))
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.LineBasicMaterial({
    color: 0xffff00,
    linewidth: 2
  })

  const mesh = new THREE.LineSegments(geometry, material)
  mesh.visible = false

  return {
    mesh,
    updatePosition: (x: number, z: number, height: number, cellSize: number) => {
      mesh.scale.set(cellSize, 1, cellSize)
      mesh.position.set(x, height + 0.05, z)
      mesh.visible = true
    }
  }
}
