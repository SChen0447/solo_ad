import * as THREE from 'three'

export type ThemeType = 'rainbow' | 'fire' | 'ocean' | 'aurora'

interface ThemeColors {
  colors: number[]
  name: ThemeType
}

const THEMES: Record<ThemeType, ThemeColors> = {
  rainbow: {
    name: 'rainbow',
    colors: [0xff0080, 0xff8c00, 0xffd700, 0x40e0d0, 0x7b68ee, 0xff69b4]
  },
  fire: {
    name: 'fire',
    colors: [0xff4500, 0xff6347, 0xffd700, 0xff8c00, 0xdc143c, 0xffff00]
  },
  ocean: {
    name: 'ocean',
    colors: [0x00bfff, 0x1e90ff, 0x00ced1, 0x4169e1, 0x00ffff, 0x87ceeb]
  },
  aurora: {
    name: 'aurora',
    colors: [0x00ff7f, 0x00ffff, 0x9370db, 0x7fffd4, 0xd8bfd8, 0x98fb98]
  }
}

export interface ParticleSystemConfig {
  attractionRadius?: number
  attractionStrength?: number
  swirlStrength?: number
  glowIntensity?: number
}

export class ParticleSystem {
  private scene: THREE.Scene
  private particles: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private colors: Float32Array
  private targetColors: Float32Array
  private sizes: Float32Array
  private originalPositions: Float32Array
  private particleAngles: Float32Array
  private particleCount: number
  private currentTheme: ThemeType = 'rainbow'
  private attractPosition: THREE.Vector3 | null = null
  private isFist: boolean = false
  private attractionRadius: number
  private attractionStrength: number
  private swirlStrength: number
  private glowIntensity: number
  private time: number = 0
  private colorTransitionProgress: number = 1
  private fistRadius: number = 80

  constructor(scene: THREE.Scene, count: number = 5000, config: ParticleSystemConfig = {}) {
    this.scene = scene
    this.particleCount = count
    this.attractionRadius = config.attractionRadius ?? 100
    this.attractionStrength = config.attractionStrength ?? 0.05
    this.swirlStrength = config.swirlStrength ?? 0.8
    this.glowIntensity = config.glowIntensity ?? 1.0

    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.targetColors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.originalPositions = new Float32Array(count * 3)
    this.particleAngles = new Float32Array(count)

    this.initParticles()

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        glowIntensity: { value: this.glowIntensity }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vDistance;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDistance = -mvPosition.z;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float glowIntensity;
        varying vec3 vColor;
        varying float vDistance;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

          float distanceFactor = 300.0 / max(vDistance, 1.0);
          float intensity = glowIntensity * distanceFactor;
          intensity = clamp(intensity, 0.3, 2.5);

          vec3 finalColor = vColor * intensity;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  private initParticles(): void {
    const themeColors = THEMES[this.currentTheme].colors

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      const radius = 200 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      this.positions[i3] = x
      this.positions[i3 + 1] = y
      this.positions[i3 + 2] = z

      this.originalPositions[i3] = x
      this.originalPositions[i3 + 1] = y
      this.originalPositions[i3 + 2] = z

      this.velocities[i3] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2

      const colorIdx = Math.floor(Math.random() * themeColors.length)
      const color = new THREE.Color(themeColors[colorIdx])
      this.colors[i3] = color.r
      this.colors[i3 + 1] = color.g
      this.colors[i3 + 2] = color.b

      this.targetColors[i3] = color.r
      this.targetColors[i3 + 1] = color.g
      this.targetColors[i3 + 2] = color.b

      this.sizes[i] = 1 + Math.random() * 3
      this.particleAngles[i] = Math.random() * Math.PI * 2
    }
  }

  setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return
    this.currentTheme = theme
    this.colorTransitionProgress = 0

    const themeColors = THEMES[theme].colors
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const colorIdx = Math.floor(Math.random() * themeColors.length)
      const color = new THREE.Color(themeColors[colorIdx])
      this.targetColors[i3] = color.r
      this.targetColors[i3 + 1] = color.g
      this.targetColors[i3 + 2] = color.b
    }
  }

  setAttractPosition(position: THREE.Vector3 | null): void {
    this.attractPosition = position
  }

  setFist(isFist: boolean): void {
    this.isFist = isFist
  }

  reset(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const radius = 200 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      this.originalPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.originalPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.originalPositions[i3 + 2] = radius * Math.cos(phi)

      this.velocities[i3] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime * 0.8)
      this.interpolateColors()
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      const vx = this.velocities[i3]
      const vy = this.velocities[i3 + 1]
      const vz = this.velocities[i3 + 2]

      this.positions[i3] += vx
      this.positions[i3 + 1] += vy
      this.positions[i3 + 2] += vz

      if (this.attractPosition) {
        const dx = this.attractPosition.x - this.positions[i3]
        const dy = this.attractPosition.y - this.positions[i3 + 1]
        const dz = this.attractPosition.z - this.positions[i3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < this.attractionRadius && dist > 0.1) {
          const t = 1 - dist / this.attractionRadius
          const force = this.attractionStrength * t
          const normDx = dx / dist
          const normDy = dy / dist
          const normDz = dz / dist

          this.velocities[i3] += normDx * force
          this.velocities[i3 + 1] += normDy * force
          this.velocities[i3 + 2] += normDz * force

          this.particleAngles[i] += deltaTime * (2 + t * 6) * this.swirlStrength
          const angle = this.particleAngles[i]
          const cosA = Math.cos(angle)
          const sinA = Math.sin(angle)

          const upX = 0, upY = 1, upZ = 0
          let tanX = upY * normDz - upZ * normDy
          let tanY = upZ * normDx - upX * normDz
          let tanZ = upX * normDy - upY * normDx
          const tanLen = Math.sqrt(tanX * tanX + tanY * tanY + tanZ * tanZ)
          if (tanLen > 0.001) {
            tanX /= tanLen
            tanY /= tanLen
            tanZ /= tanLen
          } else {
            tanX = 1; tanY = 0; tanZ = 0
          }

          let biX = normDy * tanZ - normDz * tanY
          let biY = normDz * tanX - normDx * tanZ
          let biZ = normDx * tanY - normDy * tanX

          const swirlForce = this.swirlStrength * force * (0.5 + t * 0.8)
          const swirlX = (tanX * cosA + biX * sinA) * swirlForce
          const swirlY = (tanY * cosA + biY * sinA) * swirlForce
          const swirlZ = (tanZ * cosA + biZ * sinA) * swirlForce

          this.velocities[i3] += swirlX
          this.velocities[i3 + 1] += swirlY
          this.velocities[i3 + 2] += swirlZ

          const verticalForce = (Math.sin(this.time * 1.5 + i * 0.01) * 0.5) * force * 0.3
          this.velocities[i3 + 1] += verticalForce
        }

        if (this.isFist && dist < this.fistRadius && dist > 0.1) {
          const t = 1 - dist / this.fistRadius
          const attractForce = this.attractionStrength * 3 * t
          this.velocities[i3] += (dx / dist) * attractForce
          this.velocities[i3 + 1] += (dy / dist) * attractForce
          this.velocities[i3 + 2] += (dz / dist) * attractForce

          this.particleAngles[i] += deltaTime * 12
        }
      } else {
        const ox = this.originalPositions[i3]
        const oy = this.originalPositions[i3 + 1]
        const oz = this.originalPositions[i3 + 2]
        const returnForce = 0.005
        this.velocities[i3] += (ox - this.positions[i3]) * returnForce
        this.velocities[i3 + 1] += (oy - this.positions[i3 + 1]) * returnForce
        this.velocities[i3 + 2] += (oz - this.positions[i3 + 2]) * returnForce

        this.particleAngles[i] += deltaTime * 0.5
      }

      const damping = 0.98
      this.velocities[i3] *= damping
      this.velocities[i3 + 1] *= damping
      this.velocities[i3 + 2] *= damping

      const maxSpeed = this.isFist ? 3 : 6
      const speed = Math.sqrt(
        this.velocities[i3] ** 2 +
        this.velocities[i3 + 1] ** 2 +
        this.velocities[i3 + 2] ** 2
      )
      if (speed > maxSpeed) {
        this.velocities[i3] = (this.velocities[i3] / speed) * maxSpeed
        this.velocities[i3 + 1] = (this.velocities[i3 + 1] / speed) * maxSpeed
        this.velocities[i3 + 2] = (this.velocities[i3 + 2] / speed) * maxSpeed
      }
    }

    if (this.isFist && this.attractPosition) {
      const pulseIntensity = 0.4 + Math.sin(this.time * 10) * 0.25
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3
        const dx = this.attractPosition!.x - this.positions[i3]
        const dy = this.attractPosition!.y - this.positions[i3 + 1]
        const dz = this.attractPosition!.z - this.positions[i3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 40) {
          const brightness = pulseIntensity * (1 - dist / 40)
          this.colors[i3] = Math.min(1, this.targetColors[i3] * (1 + brightness * 1.5))
          this.colors[i3 + 1] = Math.min(1, this.targetColors[i3 + 1] * (1 + brightness * 1.5))
          this.colors[i3 + 2] = Math.min(1, this.targetColors[i3 + 2] * (1 + brightness * 1.5))
        }
      }
    }

    const geometry = this.particles.geometry
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }

  private interpolateColors(): void {
    const t = this.colorTransitionProgress
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      this.colors[i3] += (this.targetColors[i3] - this.colors[i3]) * 0.05
      this.colors[i3 + 1] += (this.targetColors[i3 + 1] - this.colors[i3 + 1]) * 0.05
      this.colors[i3 + 2] += (this.targetColors[i3 + 2] - this.colors[i3 + 2]) * 0.05
    }
  }

  getParticles(): THREE.Points {
    return this.particles
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme
  }

  setAttractionRadius(radius: number): void {
    this.attractionRadius = radius
  }

  setAttractionStrength(strength: number): void {
    this.attractionStrength = strength
  }

  setSwirlStrength(strength: number): void {
    this.swirlStrength = strength
  }

  setGlowIntensity(intensity: number): void {
    this.glowIntensity = intensity
    const material = this.particles.material as THREE.ShaderMaterial
    if (material.uniforms && material.uniforms.glowIntensity) {
      material.uniforms.glowIntensity.value = intensity
    }
  }

  dispose(): void {
    this.scene.remove(this.particles)
    this.particles.geometry.dispose()
    if (this.particles.material instanceof THREE.Material) {
      this.particles.material.dispose()
    }
  }
}
