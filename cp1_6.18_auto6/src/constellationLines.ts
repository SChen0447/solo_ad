import * as THREE from 'three'
import { ParticleSystem, StarData } from './particleSystem'

interface LineData {
  starA: StarData
  starB: StarData
  distance: number
}

export class ConstellationLines {
  lines: THREE.LineSegments
  geometry: THREE.BufferGeometry
  material: THREE.LineBasicMaterial
  threshold: number
  maxConnections: number = 6

  private particleSystem: ParticleSystem
  private lineData: LineData[] = []
  private positions: Float32Array
  private colors: Float32Array
  private maxLines: number = 6000
  private rebuildFrameCounter: number = 0
  private rebuildInterval: number = 10

  private readonly normalColor: THREE.Color = new THREE.Color(0x4a7fb8)
  private readonly highlightColor: THREE.Color = new THREE.Color(0x00f0ff)

  constructor(particleSystem: ParticleSystem, threshold: number) {
    this.particleSystem = particleSystem
    this.threshold = threshold

    this.positions = new Float32Array(this.maxLines * 6)
    this.colors = new Float32Array(this.maxLines * 6)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    this.lines = new THREE.LineSegments(this.geometry, this.material)
    this.lines.frustumCulled = false

    this.rebuild()
  }

  rebuild(): void {
    this.lineData = []
    const stars = this.particleSystem.stars
    const thresholdSq = this.threshold * this.threshold
    const addedPairs = new Set<string>()

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i]
      const nearby = this.particleSystem.queryNearby(star.position, this.threshold)
      
      let connections = 0
      for (const neighbor of nearby) {
        if (neighbor.id <= star.id) continue
        
        const pairKey = `${Math.min(star.id, neighbor.id)}-${Math.max(star.id, neighbor.id)}`
        if (addedPairs.has(pairKey)) continue

        const dx = star.position.x - neighbor.position.x
        const dy = star.position.y - neighbor.position.y
        const dz = star.position.z - neighbor.position.z
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq <= thresholdSq && connections < this.maxConnections) {
          this.lineData.push({
            starA: star,
            starB: neighbor,
            distance: Math.sqrt(distSq)
          })
          addedPairs.add(pairKey)
          connections++
        }
      }
    }

    this.updateGeometry()
  }

  private updateGeometry(): void {
    const lineCount = Math.min(this.lineData.length, this.maxLines)

    for (let i = 0; i < lineCount; i++) {
      const line = this.lineData[i]
      
      this.positions[i * 6] = line.starA.position.x
      this.positions[i * 6 + 1] = line.starA.position.y
      this.positions[i * 6 + 2] = line.starA.position.z
      
      this.positions[i * 6 + 3] = line.starB.position.x
      this.positions[i * 6 + 4] = line.starB.position.y
      this.positions[i * 6 + 5] = line.starB.position.z

      const distanceFactor = 1 - (line.distance / this.threshold) * 0.5
      const color = this.normalColor.clone().multiplyScalar(0.3 + distanceFactor * 0.4)
      
      this.colors[i * 6] = color.r
      this.colors[i * 6 + 1] = color.g
      this.colors[i * 6 + 2] = color.b
      
      this.colors[i * 6 + 3] = color.r
      this.colors[i * 6 + 4] = color.g
      this.colors[i * 6 + 5] = color.b
    }

    this.geometry.setDrawRange(0, lineCount * 2)
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
  }

  update(time: number, selectedId: number | null): void {
    this.rebuildFrameCounter++

    if (this.rebuildFrameCounter >= this.rebuildInterval) {
      this.rebuildFrameCounter = 0
      this.rebuild()
    } else {
      const lineCount = Math.min(this.lineData.length, this.maxLines)
      for (let i = 0; i < lineCount; i++) {
        const line = this.lineData[i]
        
        this.positions[i * 6] = line.starA.position.x
        this.positions[i * 6 + 1] = line.starA.position.y
        this.positions[i * 6 + 2] = line.starA.position.z
        
        this.positions[i * 6 + 3] = line.starB.position.x
        this.positions[i * 6 + 4] = line.starB.position.y
        this.positions[i * 6 + 5] = line.starB.position.z

        const isHighlighted = selectedId !== null && 
          (line.starA.id === selectedId || line.starB.id === selectedId)

        let color: THREE.Color
        if (isHighlighted) {
          const pulse = 0.8 + Math.sin(time * 3) * 0.2
          color = this.highlightColor.clone().multiplyScalar(pulse)
        } else {
          const distanceFactor = 1 - (line.distance / this.threshold) * 0.5
          color = this.normalColor.clone().multiplyScalar(0.3 + distanceFactor * 0.4)
        }
        
        this.colors[i * 6] = color.r
        this.colors[i * 6 + 1] = color.g
        this.colors[i * 6 + 2] = color.b
        
        this.colors[i * 6 + 3] = color.r
        this.colors[i * 6 + 4] = color.g
        this.colors[i * 6 + 5] = color.b
      }
      
      this.geometry.attributes.position.needsUpdate = true
      this.geometry.attributes.color.needsUpdate = true
    }
  }

  setThreshold(threshold: number): void {
    if (this.threshold === threshold) return
    this.threshold = threshold
    this.rebuildFrameCounter = this.rebuildInterval
    this.rebuild()
  }

  getLineCount(): number {
    return this.lineData.length
  }
}
