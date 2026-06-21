import * as THREE from 'three'
import type { GeneratedTree } from './treeGenerator'

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonConfig {
  name: SeasonName
  density: number
  color: THREE.Color
}

export const SEASON_CONFIGS: Record<SeasonName, SeasonConfig> = {
  spring: { name: 'spring', density: 0.5, color: new THREE.Color(0x88cc44) },
  summer: { name: 'summer', density: 1.0, color: new THREE.Color(0x2d7f2d) },
  autumn: { name: 'autumn', density: 0.8, color: new THREE.Color(0xff9933) },
  winter: { name: 'winter', density: 0.2, color: new THREE.Color(0x8b7355) }
}

const TRANSITION_DURATION = 1000
const DUMMY = new THREE.Object3D()

export class LeafDensityManager {
  private tree: GeneratedTree | null = null
  private currentSeason: SeasonName = 'spring'
  private targetSeason: SeasonName = 'spring'
  private transitionStart: number = 0
  private isTransitioning: boolean = false
  private fromDensity: number = SEASON_CONFIGS.spring.density
  private toDensity: number = SEASON_CONFIGS.spring.density
  private fromColor: THREE.Color = SEASON_CONFIGS.spring.color.clone()
  private toColor: THREE.Color = SEASON_CONFIGS.spring.color.clone()
  private currentDensity: number = SEASON_CONFIGS.spring.density
  private currentColor: THREE.Color = SEASON_CONFIGS.spring.color.clone()
  private sunAzimuth: number = Math.PI
  private sunElevation: number = Math.PI / 3
  private visibleLeaves: Set<number> = new Set()
  private leafScales: number[] = []

  setTree(tree: GeneratedTree): void {
    this.tree = tree
    this.leafScales = []
    for (let i = 0; i < tree.leavesCount; i++) {
      this.leafScales.push(0.7 + Math.random() * 0.6)
    }
    this.updateVisibilityInstant()
    this.updateColorInstant()
  }

  setSeason(season: SeasonName): void {
    if (this.currentSeason === season && !this.isTransitioning) return

    const fromConfig = SEASON_CONFIGS[this.currentSeason]
    const toConfig = SEASON_CONFIGS[season]

    this.fromDensity = this.currentDensity
    this.toDensity = toConfig.density
    this.fromColor.copy(this.currentColor)
    this.toColor.copy(toConfig.color)

    this.targetSeason = season
    this.transitionStart = performance.now()
    this.isTransitioning = true
  }

  setSunPosition(azimuth: number, elevation: number): void {
    this.sunAzimuth = azimuth
    this.sunElevation = elevation
  }

  update(time: number): number {
    if (this.isTransitioning) {
      const elapsed = time - this.transitionStart
      const t = Math.min(elapsed / TRANSITION_DURATION, 1)
      const eased = this.easeInOut(t)

      this.currentDensity = this.fromDensity + (this.toDensity - this.fromDensity) * eased
      this.currentColor.lerpColors(this.fromColor, this.toColor, eased)

      this.updateVisibilityInstant()
      this.updateColorInstant()

      if (t >= 1) {
        this.isTransitioning = false
        this.currentSeason = this.targetSeason
      }
    }

    if (this.tree) {
      this.updateLeafOrientations()
    }

    return this.getVisibleLeavesCount()
  }

  getVisibleLeavesCount(): number {
    return this.tree ? Math.floor(this.tree.leavesCount * this.currentDensity) : 0
  }

  getCurrentSeason(): SeasonName {
    return this.currentSeason
  }

  isInTransition(): boolean {
    return this.isTransitioning
  }

  private updateVisibilityInstant(): void {
    if (!this.tree) return

    const { leavesMesh, leavesCount } = this.tree
    const targetVisible = Math.floor(leavesCount * this.currentDensity)

    const newVisible = new Set<number>()

    while (newVisible.size < targetVisible) {
      const idx = Math.floor(Math.random() * leavesCount)
      newVisible.add(idx)
    }

    this.visibleLeaves = newVisible

    for (let i = 0; i < leavesCount; i++) {
      const isVisible = newVisible.has(i)
      this.updateLeafMatrix(i, isVisible)
    }

    leavesMesh.instanceMatrix.needsUpdate = true
  }

  private updateColorInstant(): void {
    if (!this.tree) return

    const material = this.tree.leavesMesh.material as THREE.MeshStandardMaterial
    material.color.copy(this.currentColor)
    material.needsUpdate = true
  }

  private updateLeafOrientations(): void {
    if (!this.tree) return

    const { leavesMesh, leafPositions, leafBaseRotations } = this.tree
    const sunDir = new THREE.Vector3(
      Math.cos(this.sunElevation) * Math.sin(this.sunAzimuth),
      Math.sin(this.sunElevation),
      Math.cos(this.sunElevation) * Math.cos(this.sunAzimuth)
    )

    for (let i = 0; i < this.tree.leavesCount; i++) {
      if (!this.visibleLeaves.has(i)) continue

      const pos = leafPositions[i]
      const baseRot = leafBaseRotations[i]
      const toSun = new THREE.Vector3().subVectors(sunDir, pos).normalize()

      const phototropismAmount = Math.max(0, this.sunElevation / (Math.PI / 2)) * 0.3

      const rotX = baseRot.x + (toSun.x * phototropismAmount)
      const rotY = baseRot.y + (toSun.z * phototropismAmount)
      const rotZ = baseRot.z

      DUMMY.position.copy(pos)
      DUMMY.rotation.set(rotX, rotY, rotZ)
      const scale = this.leafScales[i]
      DUMMY.scale.set(scale, scale, scale)
      DUMMY.updateMatrix()
      leavesMesh.setMatrixAt(i, DUMMY.matrix)
    }

    leavesMesh.instanceMatrix.needsUpdate = true
  }

  private updateLeafMatrix(index: number, visible: boolean): void {
    if (!this.tree) return

    const { leavesMesh, leafPositions, leafBaseRotations } = this.tree
    const pos = leafPositions[index]
    const rot = leafBaseRotations[index]
    const scale = visible ? this.leafScales[index] : 0.001

    DUMMY.position.copy(pos)
    DUMMY.rotation.copy(rot)
    DUMMY.scale.set(scale, scale, scale)
    DUMMY.updateMatrix()
    leavesMesh.setMatrixAt(index, DUMMY.matrix)
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }
}
