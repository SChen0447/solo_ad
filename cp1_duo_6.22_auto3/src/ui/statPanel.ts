import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

export interface StatsData {
  fps: number
  vertices: number
  drawCalls: number
}

export class StatsPanel {
  private renderer: CSS2DRenderer
  private panelElement: HTMLElement
  private fpsElement: HTMLElement
  private verticesElement: HTMLElement
  private drawCallsElement: HTMLElement
  private cssObject: CSS2DObject
  private frameCount: number = 0
  private lastTime: number = 0
  private fps: number = 0

  constructor(camera: THREE.PerspectiveCamera) {
    this.renderer = new CSS2DRenderer()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.top = '0'
    this.renderer.domElement.style.left = '0'
    this.renderer.domElement.style.pointerEvents = 'none'
    this.renderer.domElement.style.zIndex = '100'
    document.getElementById('app')!.appendChild(this.renderer.domElement)

    this.panelElement = document.createElement('div')
    this.panelElement.style.cssText = `
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
      transition: background-color 0.3s;
      user-select: none;
    `

    const fpsRow = document.createElement('div')
    fpsRow.style.cssText = 'display: flex; justify-content: space-between; gap: 20px;'
    const fpsLabel = document.createElement('span')
    fpsLabel.style.opacity = '0.8'
    fpsLabel.textContent = 'FPS'
    this.fpsElement = document.createElement('span')
    this.fpsElement.style.fontWeight = 'bold'
    this.fpsElement.textContent = '--'
    fpsRow.appendChild(fpsLabel)
    fpsRow.appendChild(this.fpsElement)

    const vertRow = document.createElement('div')
    vertRow.style.cssText = 'display: flex; justify-content: space-between; gap: 20px;'
    const vertLabel = document.createElement('span')
    vertLabel.style.opacity = '0.8'
    vertLabel.textContent = '顶点数'
    this.verticesElement = document.createElement('span')
    this.verticesElement.style.fontWeight = 'bold'
    this.verticesElement.textContent = '--'
    vertRow.appendChild(vertLabel)
    vertRow.appendChild(this.verticesElement)

    const drawRow = document.createElement('div')
    drawRow.style.cssText = 'display: flex; justify-content: space-between; gap: 20px;'
    const drawLabel = document.createElement('span')
    drawLabel.style.opacity = '0.8'
    drawLabel.textContent = '绘制调用'
    this.drawCallsElement = document.createElement('span')
    this.drawCallsElement.style.fontWeight = 'bold'
    this.drawCallsElement.textContent = '--'
    drawRow.appendChild(drawLabel)
    drawRow.appendChild(this.drawCallsElement)

    this.panelElement.appendChild(fpsRow)
    this.panelElement.appendChild(vertRow)
    this.panelElement.appendChild(drawRow)

    this.cssObject = new CSS2DObject(this.panelElement)
    this.cssObject.position.set(0, 0, -5)
    camera.add(this.cssObject)

    this.addWarningStyle()
  }

  private addWarningStyle(): void {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes statsBlink {
        0%, 100% { background: rgba(255, 0, 0, 0.6); }
        50% { background: rgba(255, 0, 0, 0.3); }
      }
      .stats-warning {
        animation: statsBlink 0.5s infinite !important;
      }
    `
    document.head.appendChild(style)
  }

  getRenderer(): CSS2DRenderer {
    return this.renderer
  }

  getCSSObject(): CSS2DObject {
    return this.cssObject
  }

  update(stats: StatsData): void {
    this.fpsElement.textContent = stats.fps.toFixed(0)
    this.verticesElement.textContent = this.formatNumber(stats.vertices)
    this.drawCallsElement.textContent = stats.drawCalls.toString()

    if (stats.fps < 30) {
      this.panelElement.classList.add('stats-warning')
      this.panelElement.style.background = 'rgba(255, 0, 0, 0.6)'
    } else {
      this.panelElement.classList.remove('stats-warning')
      this.panelElement.style.background = 'rgba(0, 0, 0, 0.6)'
    }
  }

  calculateFPS(): number {
    const now = performance.now()
    this.frameCount++

    if (now - this.lastTime >= 1000) {
      this.fps = (this.frameCount * 1000) / (now - this.lastTime)
      this.frameCount = 0
      this.lastTime = now
    }

    return this.fps
  }

  onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
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
