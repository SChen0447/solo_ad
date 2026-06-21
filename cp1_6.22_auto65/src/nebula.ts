import * as THREE from 'three'
import {
  generateSpiralPositions,
  generateParticleColors,
  generateParticleSizes,
  generateParticleAlphas,
  findParticlesInRadius
} from './utils'

export class NebulaSystem {
  public points: THREE.Points
  public geometry: THREE.BufferGeometry
  public material: THREE.ShaderMaterial
  public particleCount: number

  private rotationSpeed: number = 0.2
  private sizeScale: number = 1
  private colorMix: number = 0.5
  private radius: number = 5

  private originalColors: Float32Array

  private highlightedIndex: number = -1
  private nearbyIndices: number[] = []
  private flashTimer: number = 0
  private flashDuration: number = 0.6
  private flashPeriod: number = 0.15
  private isFlashing: boolean = false

  constructor(particleCount: number = 2000, radius: number = 5) {
    this.particleCount = particleCount
    this.radius = radius

    this.geometry = new THREE.BufferGeometry()

    const positions = generateSpiralPositions(particleCount, radius)
    const colors = generateParticleColors(positions, radius, this.colorMix)
    const sizes = generateParticleSizes(particleCount, 0.02, 0.1)
    const alphas = generateParticleAlphas(positions, radius)

    this.originalColors = new Float32Array(colors)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))

    this.material = this.createShaderMaterial()

    this.points = new THREE.Points(this.geometry, this.material)
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSizeScale: { value: this.sizeScale },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uSizeScale;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale * 300.0 * uPixelRatio / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) {
            discard;
          }
          float glow = 1.0 - dist * 2.0;
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }

  public update(deltaTime: number): void {
    this.points.rotation.y += this.rotationSpeed * deltaTime

    if (this.isFlashing) {
      this.flashTimer += deltaTime
      if (this.flashTimer >= this.flashDuration) {
        this.isFlashing = false
        this.restoreParticleColors()
      } else {
        this.updateFlashEffect()
      }
    }
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed
  }

  public getRotationSpeed(): number {
    return this.rotationSpeed
  }

  public setSizeScale(scale: number): void {
    this.sizeScale = scale
    this.material.uniforms.uSizeScale.value = scale
  }

  public getSizeScale(): number {
    return this.sizeScale
  }

  public setColorMix(mix: number): void {
    this.colorMix = mix
    this.updateColors()
  }

  public getColorMix(): number {
    return this.colorMix
  }

  private updateColors(): void {
    const positions = this.geometry.attributes.position.array as Float32Array
    const colors = generateParticleColors(positions, this.radius, this.colorMix)
    const colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute
    colorAttribute.array.set(colors)
    colorAttribute.needsUpdate = true

    this.originalColors = new Float32Array(colors)
  }

  public highlightParticle(index: number): void {
    if (index < 0 || index >= this.particleCount) return

    this.restoreParticleColors()

    this.highlightedIndex = index
    const positions = this.geometry.attributes.position.array as Float32Array
    this.nearbyIndices = findParticlesInRadius(positions, index, 3)

    this.isFlashing = true
    this.flashTimer = 0

    this.applyHighlight()
  }

  private applyHighlight(): void {
    const colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute
    const colors = colorAttribute.array as Float32Array

    if (this.highlightedIndex >= 0) {
      const idx = this.highlightedIndex
      colors[idx * 3] = 1.0
      colors[idx * 3 + 1] = 1.0
      colors[idx * 3 + 2] = 1.0
    }

    colorAttribute.needsUpdate = true
  }

  private updateFlashEffect(): void {
    const colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute
    const colors = colorAttribute.array as Float32Array
    const flashPhase = Math.floor(this.flashTimer / this.flashPeriod) % 2

    for (const idx of this.nearbyIndices) {
      if (flashPhase === 0) {
        colors[idx * 3] = 0.4
        colors[idx * 3 + 1] = 0.7
        colors[idx * 3 + 2] = 1.0
      } else {
        colors[idx * 3] = this.originalColors[idx * 3]
        colors[idx * 3 + 1] = this.originalColors[idx * 3 + 1]
        colors[idx * 3 + 2] = this.originalColors[idx * 3 + 2]
      }
    }

    colorAttribute.needsUpdate = true
  }

  private restoreParticleColors(): void {
    const colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute
    colorAttribute.array.set(this.originalColors)
    colorAttribute.needsUpdate = true

    this.highlightedIndex = -1
    this.nearbyIndices = []
  }

  public getHighlightedIndex(): number {
    return this.highlightedIndex
  }

  public getParticlePosition(index: number): THREE.Vector3 {
    const positions = this.geometry.attributes.position.array as Float32Array
    return new THREE.Vector3(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2]
    )
  }

  public onWindowResize(): void {
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
