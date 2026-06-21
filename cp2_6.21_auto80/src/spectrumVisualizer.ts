import * as THREE from 'three'

export interface ColorTheme {
  lowFrequency: number
  highFrequency: number
}

export class SpectrumVisualizer {
  public group: THREE.Group
  private bars: THREE.Mesh[] = []
  private barTopParticles: THREE.Mesh[] = []
  private barVelocities: number[] = []
  private barTargetHeights: number[] = []
  private barCurrentHeights: number[] = []
  private readonly barCount: number = 128
  private readonly baseRadius: number = 0.3
  private readonly minHeight: number = 0.5
  private readonly maxHeight: number = 8
  private readonly damping: number = 0.8
  private colorTheme: ColorTheme = {
    lowFrequency: 0xff3366,
    highFrequency: 0x33ffff,
  }
  private arrangementRadius: number = 6
  private rotationSpeed: number = 0.02
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.createBars()
  }

  private createBars(): void {
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2
      const x = Math.cos(angle) * this.arrangementRadius
      const z = Math.sin(angle) * this.arrangementRadius

      const barGeometry = new THREE.CylinderGeometry(
        this.baseRadius,
        this.baseRadius,
        this.minHeight,
        16,
        1
      )
      const color = this.getBarColor(i / this.barCount)
      const barMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.6,
        roughness: 0.2,
        emissive: color,
        emissiveIntensity: 0.3,
      })

      const bar = new THREE.Mesh(barGeometry, barMaterial)
      bar.position.set(x, this.minHeight / 2, z)
      bar.castShadow = true
      bar.receiveShadow = true
      this.group.add(bar)
      this.bars.push(bar)

      const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8)
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
      })
      const particle = new THREE.Mesh(particleGeometry, particleMaterial)
      particle.position.set(x, this.minHeight + 0.1, z)
      this.group.add(particle)
      this.barTopParticles.push(particle)

      this.barVelocities.push(0)
      this.barTargetHeights.push(this.minHeight)
      this.barCurrentHeights.push(this.minHeight)
    }
  }

  private getBarColor(frequencyRatio: number): number {
    const lowColor = new THREE.Color(this.colorTheme.lowFrequency)
    const highColor = new THREE.Color(this.colorTheme.highFrequency)
    const color = lowColor.clone().lerp(highColor, frequencyRatio)
    return color.getHex()
  }

  public update(frequencyData: Uint8Array, time: number): void {
    this.group.rotation.y += this.rotationSpeed

    for (let i = 0; i < this.barCount; i++) {
      const amplitude = frequencyData[i] / 255
      const targetHeight = this.minHeight + amplitude * (this.maxHeight - this.minHeight)
      this.barTargetHeights[i] = targetHeight

      const acceleration = (this.barTargetHeights[i] - this.barCurrentHeights[i]) * 0.5
      this.barVelocities[i] = (this.barVelocities[i] + acceleration) * this.damping
      this.barCurrentHeights[i] += this.barVelocities[i]

      let currentHeight = this.barCurrentHeights[i]

      const lowFreqThreshold = Math.floor(this.barCount * 0.2)
      if (i < lowFreqThreshold) {
        const shakeAmount = Math.sin(time * 0.01 + i * 0.5) * 0.3 * amplitude
        currentHeight += shakeAmount
      }

      currentHeight = Math.max(this.minHeight, Math.min(this.maxHeight * 1.1, currentHeight))

      const bar = this.bars[i]
      bar.scale.y = currentHeight / this.minHeight
      bar.position.y = currentHeight / 2

      const particle = this.barTopParticles[i]
      particle.position.y = currentHeight + 0.1
      const particleMaterial = particle.material as THREE.MeshBasicMaterial
      particleMaterial.opacity = 0.4 + amplitude * 0.6

      const barMaterial = bar.material as THREE.MeshStandardMaterial
      barMaterial.emissiveIntensity = 0.2 + amplitude * 0.8
    }
  }

  public setColorTheme(theme: ColorTheme): void {
    this.colorTheme = theme
    for (let i = 0; i < this.barCount; i++) {
      const color = this.getBarColor(i / this.barCount)
      const barMaterial = this.bars[i].material as THREE.MeshStandardMaterial
      barMaterial.color.setHex(color)
      barMaterial.emissive.setHex(color)
      const particleMaterial = this.barTopParticles[i].material as THREE.MeshBasicMaterial
      particleMaterial.color.setHex(color)
    }
  }

  public setArrangementRadius(radius: number): void {
    this.arrangementRadius = radius
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      this.bars[i].position.x = x
      this.bars[i].position.z = z
      this.barTopParticles[i].position.x = x
      this.barTopParticles[i].position.z = z
    }
  }

  public getArrangementRadius(): number {
    return this.arrangementRadius
  }

  public getBarCount(): number {
    return this.barCount
  }

  public getBaseRadius(): number {
    return this.baseRadius
  }

  public getMaxHeight(): number {
    return this.maxHeight
  }

  public getMinHeight(): number {
    return this.minHeight
  }

  public dispose(): void {
    this.bars.forEach((bar) => {
      bar.geometry.dispose()
      ;(bar.material as THREE.Material).dispose()
    })
    this.barTopParticles.forEach((particle) => {
      particle.geometry.dispose()
      ;(particle.material as THREE.Material).dispose()
    })
    this.bars = []
    this.barTopParticles = []
    this.scene.remove(this.group)
  }
}
