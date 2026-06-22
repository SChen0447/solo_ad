import * as THREE from 'three'
import { StarField } from '../starfield/StarField'

export interface ConstellationData {
  id: string
  name: string
  chineseName: string
  story: string
  fullStory: string
  starIds: number[]
  lines: [number, number][]
  mainStarId: number
  visible: boolean
}

export interface ConstellationLine {
  line: THREE.Line
  constellationId: string
}

export interface ConstellationBubble {
  sprite: THREE.Sprite
  constellationId: string
  isHovered: boolean
}

export class ConstellationManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private starField: StarField
  private constellations: ConstellationData[] = []
  private lines: Map<string, ConstellationLine[]> = new Map()
  private bubbles: Map<string, ConstellationBubble> = new Map()
  private detectionRadius: number = 150
  private showBubbles: boolean = true
  private glowEnabled: boolean = true
  private lineGroup: THREE.Group
  private bubbleGroup: THREE.Group

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, starField: StarField) {
    this.scene = scene
    this.camera = camera
    this.starField = starField

    this.lineGroup = new THREE.Group()
    this.bubbleGroup = new THREE.Group()

    this.scene.add(this.lineGroup)
    this.scene.add(this.bubbleGroup)
  }

  setConstellations(constellations: ConstellationData[]): void {
    this.constellations = constellations
    this.updateConstellationLines()
  }

  private createGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(224, 224, 255, 1)')
    gradient.addColorStop(0.4, 'rgba(224, 224, 255, 0.5)')
    gradient.addColorStop(1, 'rgba(224, 224, 255, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private createBubbleTexture(name: string, story: string, isHovered: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const scale = 2

    const paddingX = 14 * scale
    const paddingY = 8 * scale
    const fontSize = isHovered ? 13 * scale : 14 * scale
    const arrowSize = 10 * scale

    const maxWidth = isHovered ? 300 : 200

    ctx.font = `${fontSize}px sans-serif`
    const nameWidth = ctx.measureText(name).width
    const words = story.split('')
    let line = ''
    const lines: string[] = []

    for (const word of words) {
      const testLine = line + word
      const testWidth = ctx.measureText(testLine).width
      if (testWidth > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      lines.push(line)
    }

    const contentWidth = Math.max(nameWidth, maxWidth)
    const contentHeight = fontSize * 1.5 + lines.length * fontSize * 1.3
    const totalWidth = contentWidth + paddingX * 2
    const totalHeight = contentHeight + paddingY * 2 + arrowSize

    canvas.width = totalWidth
    canvas.height = totalHeight

    const drawCtx = canvas.getContext('2d')!

    drawCtx.fillStyle = 'rgba(10, 10, 30, 0.7)'
    this.roundRect(drawCtx, 0, 0, totalWidth, totalHeight - arrowSize, 8 * scale)
    drawCtx.fill()

    drawCtx.beginPath()
    drawCtx.moveTo(totalWidth / 2 - arrowSize / 2, totalHeight - arrowSize)
    drawCtx.lineTo(totalWidth / 2, totalHeight)
    drawCtx.lineTo(totalWidth / 2 + arrowSize / 2, totalHeight - arrowSize)
    drawCtx.closePath()
    drawCtx.fillStyle = 'rgba(10, 10, 30, 0.7)'
    drawCtx.fill()

    drawCtx.fillStyle = '#f0f0ff'
    drawCtx.font = `bold ${fontSize}px sans-serif`
    drawCtx.textBaseline = 'top'
    drawCtx.fillText(name, paddingX, paddingY)

    drawCtx.font = `${fontSize * 0.85}px sans-serif`
    drawCtx.fillStyle = 'rgba(240, 240, 255, 0.85)'
    lines.forEach((line, i) => {
      drawCtx.fillText(line, paddingX, paddingY + fontSize * 1.5 + i * fontSize * 1.3)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  private updateConstellationLines(): void {
    this.lines.forEach((lineList) => {
      lineList.forEach((cl) => {
        this.lineGroup.remove(cl.line)
        if (cl.line.geometry) cl.line.geometry.dispose()
        if (cl.line.material) {
          if (Array.isArray(cl.line.material)) {
            cl.line.material.forEach((m) => m.dispose())
          } else {
            cl.line.material.dispose()
          }
        }
      })
    })
    this.lines.clear()

    this.bubbles.forEach((bubble) => {
      this.bubbleGroup.remove(bubble.sprite)
      if (bubble.sprite.material) {
        if (Array.isArray(bubble.sprite.material)) {
          bubble.sprite.material.forEach((m) => m.dispose())
        } else {
          bubble.sprite.material.dispose()
        }
      }
      if (bubble.sprite.map) bubble.sprite.map.dispose()
    })
    this.bubbles.clear()

    for (const constellation of this.constellations) {
      if (!constellation.visible) continue

      const lineList: ConstellationLine[] = []

      for (const line of constellation.lines) {
        const star1 = this.starField.getStarById(line[0])
        const star2 = this.starField.getStarById(line[1])

        if (!star1 || !star2) continue

        const points = []
        points.push(star1.position.clone())
        points.push(star2.position.clone())

        const geometry = new THREE.BufferGeometry().setFromPoints(points)

        const material = new THREE.LineBasicMaterial({
          color: 0xe0e0ff,
          transparent: true,
          opacity: this.glowEnabled ? 0.9 : 0.6,
          linewidth: 2,
        })

        const lineMesh = new THREE.Line(geometry, material)
        this.lineGroup.add(lineMesh)

        lineList.push({
          line: lineMesh,
          constellationId: constellation.id,
        })
      }

      if (lineList.length > 0) {
        this.lines.set(constellation.id, lineList)
      }
    }
  }

  private isConstellationInCenter(constellation: ConstellationData): boolean {
    let centerStarPos: THREE.Vector3 | null = null
    const mainStar = this.starField.getStarById(constellation.mainStarId)
    if (mainStar) {
      centerStarPos = mainStar.position.clone()
    } else {
      const avgPos = new THREE.Vector3()
      let count = 0
      for (const starId of constellation.starIds) {
        const star = this.starField.getStarById(starId)
        if (star) {
          avgPos.add(star.position)
          count++
        }
      }
      if (count > 0) {
        avgPos.divideScalar(count)
        centerStarPos = avgPos
      }
    }

    if (!centerStarPos) return false

    const screenPos = centerStarPos.clone().project(this.camera)
    const screenX = (screenPos.x + 1) / 2 * window.innerWidth
    const screenY = (-screenPos.y + 1) / 2 * window.innerHeight

    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    const distance = Math.sqrt(
      Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2)
    )

    return distance < this.detectionRadius
  }

  update(): void {
    if (!this.showBubbles) return

    for (const constellation of this.constellations) {
      if (!constellation.visible) continue

      const inCenter = this.isConstellationInCenter(constellation)
      const existingBubble = this.bubbles.get(constellation.id)

      if (inCenter && !existingBubble) {
        this.createBubble(constellation)
      } else if (!inCenter && existingBubble) {
        this.removeBubble(constellation.id)
      }
    }

    this.updateBubblePositions()
  }

  private createBubble(constellation: ConstellationData): void {
    const mainStar = this.starField.getStarById(constellation.mainStarId)
    if (!mainStar) return

    const texture = this.createBubbleTexture(constellation.chineseName, constellation.story, false)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(120, 80, 1)

    const offset = new THREE.Vector3(0, 30, 0)
    sprite.position.copy(mainStar.position).add(offset)

    this.bubbleGroup.add(sprite)

    this.bubbles.set(constellation.id, {
      sprite,
      constellationId: constellation.id,
      isHovered: false,
    })
  }

  private removeBubble(constellationId: string): void {
    const bubble = this.bubbles.get(constellationId)
    if (bubble) {
      this.bubbleGroup.remove(bubble.sprite)
      if (bubble.sprite.material) {
        if (Array.isArray(bubble.sprite.material)) {
          bubble.sprite.material.forEach((m) => m.dispose())
        } else {
          bubble.sprite.material.dispose()
        }
      }
      if (bubble.sprite.map) bubble.sprite.map.dispose()
      this.bubbles.delete(constellationId)
    }
  }

  private updateBubblePositions(): void {
    this.bubbles.forEach((bubble, id) => {
      const constellation = this.constellations.find((c) => c.id === id)
      if (!constellation) return

      const mainStar = this.starField.getStarById(constellation.mainStarId)
      if (!mainStar) return

      const offset = new THREE.Vector3(0, 30, 0)
      bubble.sprite.position.copy(mainStar.position).add(offset)
    })
  }

  setShowBubbles(show: boolean): void {
    this.showBubbles = show
    this.bubbleGroup.visible = show
    if (!show) {
      this.bubbles.forEach((_, id) => this.removeBubble(id))
    }
  }

  getShowBubbles(): boolean {
    return this.showBubbles
  }

  setGlowEnabled(enabled: boolean): void {
    this.glowEnabled = enabled
    this.lines.forEach((lineList) => {
      lineList.forEach((cl) => {
        const material = cl.line.material as THREE.LineBasicMaterial
        material.opacity = enabled ? 0.9 : 0.6
      })
    })
  }

  getGlowEnabled(): boolean {
    return this.glowEnabled
  }

  setDetectionRadius(radius: number): void {
    this.detectionRadius = radius
  }

  getDetectionRadius(): number {
    return this.detectionRadius
  }

  getLineGroup(): THREE.Group {
    return this.lineGroup
  }

  getBubbleGroup(): THREE.Group {
    return this.bubbleGroup
  }

  handleMouseMove(mouseX: number, mouseY: number): void {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    mouse.x = (mouseX / window.innerWidth) * 2 - 1
    mouse.y = -(mouseY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, this.camera)

    this.bubbles.forEach((bubble, id) => {
      const intersects = raycaster.intersectObject(bubble.sprite)
      const isHovered = intersects.length > 0

      if (isHovered !== bubble.isHovered) {
        bubble.isHovered = isHovered

        const constellation = this.constellations.find((c) => c.id === id)
        if (constellation) {
          const story = isHovered ? constellation.fullStory : constellation.story
          const newTexture = this.createBubbleTexture(constellation.chineseName, story, isHovered)

          if (bubble.sprite.material) {
            const materials = Array.isArray(bubble.sprite.material)
              ? bubble.sprite.material
              : [bubble.sprite.material]
            materials.forEach((m) => {
              const mat = m as THREE.SpriteMaterial
              if (mat.map) mat.map.dispose()
              mat.map = newTexture
              mat.needsUpdate = true
            })
          }

          const scale = isHovered ? 1.1 : 1.0
          bubble.sprite.scale.set(120 * scale, 80 * scale, 1)
        }

        document.body.style.cursor = isHovered ? 'pointer' : 'default'
      }
    })
  }

  dispose(): void {
    this.lines.forEach((lineList) => {
      lineList.forEach((cl) => {
        this.lineGroup.remove(cl.line)
        if (cl.line.geometry) cl.line.geometry.dispose()
        if (cl.line.material) {
          if (Array.isArray(cl.line.material)) {
            cl.line.material.forEach((m) => m.dispose())
          } else {
            cl.line.material.dispose()
          }
        }
      })
    })
    this.lines.clear()

    this.bubbles.forEach((bubble) => {
      this.bubbleGroup.remove(bubble.sprite)
      if (bubble.sprite.material) {
        if (Array.isArray(bubble.sprite.material)) {
          bubble.sprite.material.forEach((m) => m.dispose())
        } else {
          bubble.sprite.material.dispose()
        }
      }
      if (bubble.sprite.map) bubble.sprite.map.dispose()
    })
    this.bubbles.clear()

    this.scene.remove(this.lineGroup)
    this.scene.remove(this.bubbleGroup)
  }
}
