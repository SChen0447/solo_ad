import * as THREE from 'three'

export interface FloorInfo {
  floorIndex: number
  position: THREE.Vector3
  size: THREE.Vector3
}

interface FloorColorState {
  targetColor: THREE.Color
  startColor: THREE.Color
  blending: number
}

export class BuildingModel {
  public readonly group: THREE.Group
  public readonly floorCount: number = 6
  public readonly floorSize: THREE.Vector3 = new THREE.Vector3(6, 1.5, 4)
  public readonly floorGap: number = 0.15

  private readonly scene: THREE.Scene
  private floors: THREE.Mesh[] = []
  private floorEdges: THREE.LineSegments[] = []
  private floorLabels: THREE.Sprite[] = []
  private floorColorStates: FloorColorState[] = []
  private floorConsumptions: number[] = new Array(6).fill(0.2)
  private floorInfos: FloorInfo[] = []
  private blinkTime: number = 0
  private readonly blinkPeriod: number = 0.5
  private readonly colorTransitionDuration: number = 0.5

  private readonly colorGreen: THREE.Color = new THREE.Color(0x00ff00)
  private readonly colorYellow: THREE.Color = new THREE.Color(0xffff00)
  private readonly colorRed: THREE.Color = new THREE.Color(0xff0000)

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.name = 'BuildingModel'
    this.buildFloors()
    this.scene.add(this.group)
  }

  public getFloorInfo(floorIndex: number): FloorInfo | null {
    if (floorIndex < 0 || floorIndex >= this.floorCount) {
      return null
    }
    return this.floorInfos[floorIndex]
  }

  public getAllFloorInfos(): FloorInfo[] {
    return [...this.floorInfos]
  }

  public getFloorConsumption(floorIndex: number): number {
    if (floorIndex < 0 || floorIndex >= this.floorCount) {
      return 0
    }
    return this.floorConsumptions[floorIndex]
  }

  public updateFloorConsumption(floorIndex: number, consumption: number): void {
    if (floorIndex < 0 || floorIndex >= this.floorCount) {
      return
    }
    const clampedConsumption = Math.max(0.2, Math.min(1.0, consumption))
    this.floorConsumptions[floorIndex] = clampedConsumption

    const targetColor = this.computeHeatColor(clampedConsumption)
    const state = this.floorColorStates[floorIndex]
    const currentColor = this.getCurrentFloorColor(floorIndex)
    state.startColor.copy(currentColor)
    state.targetColor.copy(targetColor)
    state.blending = 0
  }

  public updateAllConsumptions(data: Array<{ floor: number; consumption: number }>): void {
    for (const item of data) {
      this.updateFloorConsumption(item.floor, item.consumption)
    }
  }

  public update(deltaTime: number): void {
    this.blinkTime += deltaTime

    for (let i = 0; i < this.floorCount; i++) {
      this.updateFloorColorTransition(i, deltaTime)
      this.updateFloorEdgeBlink(i)
    }
  }

  public dispose(): void {
    for (const mesh of this.floors) {
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
    for (const edges of this.floorEdges) {
      edges.geometry.dispose()
      if (Array.isArray(edges.material)) {
        edges.material.forEach(m => m.dispose())
      } else {
        edges.material.dispose()
      }
    }
    for (const label of this.floorLabels) {
      if (label.material.map) {
        label.material.map.dispose()
      }
      label.material.dispose()
    }
    this.scene.remove(this.group)
  }

  private buildFloors(): void {
    for (let i = 0; i < this.floorCount; i++) {
      const y = i * (this.floorSize.y + this.floorGap)

      const floorGroup = new THREE.Group()
      floorGroup.name = `Floor_${i}`

      const position = new THREE.Vector3(0, y + this.floorSize.y / 2, 0)
      const size = this.floorSize.clone()
      this.floorInfos.push({ floorIndex: i, position, size })

      const mainMesh = this.createFloorMesh(position, size)
      floorGroup.add(mainMesh)
      this.floors.push(mainMesh)

      this.floorColorStates.push({
        targetColor: this.colorGreen.clone(),
        startColor: new THREE.Color(0xffffff),
        blending: 1
      })

      const edges = this.createFloorEdges(position, size)
      floorGroup.add(edges)
      this.floorEdges.push(edges)

      const label = this.createFloorLabel(i, position, size)
      floorGroup.add(label)
      this.floorLabels.push(label)

      this.group.add(floorGroup)
    }

    const totalHeight = this.floorCount * this.floorSize.y + (this.floorCount - 1) * this.floorGap
    this.group.position.y = -totalHeight / 2
  }

  private createFloorMesh(position: THREE.Vector3, size: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)

    const transparentSide = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.FrontSide
    })

    const mainFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x000000,
      side: THREE.FrontSide
    })

    const materials = [
      transparentSide,
      transparentSide,
      transparentSide,
      transparentSide,
      mainFaceMaterial,
      transparentSide
    ]

    const mesh = new THREE.Mesh(geometry, materials)
    mesh.position.copy(position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private createFloorEdges(position: THREE.Vector3, size: THREE.Vector3): THREE.LineSegments {
    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(size.x, size.y, size.z)
    )
    const material = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.3
    })
    const edges = new THREE.LineSegments(geometry, material)
    edges.position.copy(position)
    return edges
  }

  private createFloorLabel(floorIndex: number, position: THREE.Vector3, size: THREE.Vector3): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 72px Arial'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${floorIndex}F`, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(0.8, 0.4, 1)
    sprite.position.set(
      position.x - size.x / 2 - 0.3,
      position.y + size.y / 2 - 0.2,
      position.z + size.z / 2 + 0.05
    )
    sprite.renderOrder = 999
    return sprite
  }

  private computeHeatColor(consumption: number): THREE.Color {
    const t = (consumption - 0.2) / 0.8

    if (t <= 0.5) {
      const localT = t / 0.5
      return new THREE.Color().lerpColors(this.colorGreen, this.colorYellow, localT)
    } else {
      const localT = (t - 0.5) / 0.5
      return new THREE.Color().lerpColors(this.colorYellow, this.colorRed, localT)
    }
  }

  private getCurrentFloorColor(floorIndex: number): THREE.Color {
    const mesh = this.floors[floorIndex]
    if (mesh.material instanceof THREE.Material) {
      return (mesh.material as THREE.MeshStandardMaterial).color.clone()
    } else if (Array.isArray(mesh.material)) {
      return (mesh.material[4] as THREE.MeshStandardMaterial).color.clone()
    }
    return new THREE.Color(0xffffff)
  }

  private updateFloorColorTransition(floorIndex: number, deltaTime: number): void {
    const state = this.floorColorStates[floorIndex]
    if (state.blending >= 1) {
      return
    }

    state.blending = Math.min(1, state.blending + deltaTime / this.colorTransitionDuration)
    const interpolatedColor = new THREE.Color().lerpColors(
      state.startColor,
      state.targetColor,
      state.blending
    )

    const mesh = this.floors[floorIndex]
    if (mesh.material instanceof THREE.Material) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.copy(interpolatedColor)
      mat.emissive.copy(interpolatedColor).multiplyScalar(0.2)
    } else if (Array.isArray(mesh.material)) {
      const mainMat = mesh.material[4] as THREE.MeshStandardMaterial
      mainMat.color.copy(interpolatedColor)
      mainMat.emissive.copy(interpolatedColor).multiplyScalar(0.2)
    }
  }

  private updateFloorEdgeBlink(floorIndex: number): void {
    const consumption = this.floorConsumptions[floorIndex]
    const edges = this.floorEdges[floorIndex]
    const material = edges.material as THREE.LineBasicMaterial

    if (consumption > 0.7) {
      const phase = (Math.sin(this.blinkTime * Math.PI * 2 / this.blinkPeriod) + 1) / 2
      material.opacity = 0.3 + phase * 0.5
      material.color.setHex(0xff5500)
    } else {
      material.opacity = 0.3
      material.color.setHex(0x00aaff)
    }
  }
}
