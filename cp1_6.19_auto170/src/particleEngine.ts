import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'

export interface Particle {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  baseSize: number
  color: THREE.Color
  targetColor: THREE.Color
  orbitCenter: THREE.Vector3
  orbitRadius: number
  orbitSpeed: number
  orbitAngle: number
  orbitInclination: number
  orbitPhase: number
  isSelected: boolean
  isDensityBoosted: boolean
  colorDepthFactor: number
}

export interface ColorTheme {
  name: string
  primaryColors: string[]
  transitionColors: string[]
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  aurora: {
    name: '极光青紫',
    primaryColors: ['#1e3a8a', '#6366f1', '#a855f7'],
    transitionColors: ['#818cf8', '#c084fc']
  },
  flame: {
    name: '烈焰红橙',
    primaryColors: ['#7f1d1d', '#dc2626', '#ea580c'],
    transitionColors: ['#f97316', '#fbbf24']
  },
  deepsea: {
    name: '深海蓝绿',
    primaryColors: ['#0c4a6e', '#0891b2', '#059669'],
    transitionColors: ['#22d3ee', '#34d399']
  },
  neon: {
    name: '幻彩霓虹',
    primaryColors: ['#be185d', '#7c3aed', '#2563eb'],
    transitionColors: ['#f472b6', '#a78bfa']
  }
}

export class ParticleEngine {
  private particles: Particle[] = []
  private particleCount: number = 300
  private sizeRange: [number, number] = [0.5, 2]
  private speedMultiplier: number = 1
  private currentTheme: ColorTheme = COLOR_THEMES.aurora
  private colorTransitionProgress: number = 1
  private previousTheme: ColorTheme = COLOR_THEMES.aurora
  private transitionStartTime: number = 0
  private isTransitioning: boolean = false

  constructor() {}

  init(count: number = 300): Particle[] {
    this.particleCount = count
    this.particles = []
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle())
    }
    return this.particles
  }

  private createParticle(): Particle {
    const phi = Math.random() * Math.PI * 2
    const theta = Math.acos(2 * Math.random() - 1)
    const radius = 5 + Math.random() * 8

    const x = radius * Math.sin(theta) * Math.cos(phi)
    const y = radius * Math.sin(theta) * Math.sin(phi)
    const z = radius * Math.cos(theta)

    const baseSize = this.sizeRange[0] + Math.random() * (this.sizeRange[1] - this.sizeRange[0])
    const orbitSpeed = (2 * Math.PI) / (8 + Math.random() * 7)

    return {
      id: uuidv4(),
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      size: baseSize,
      baseSize,
      color: this.getRandomColorFromTheme(this.currentTheme),
      targetColor: this.getRandomColorFromTheme(this.currentTheme),
      orbitCenter: new THREE.Vector3(0, 0, 0),
      orbitRadius: radius,
      orbitSpeed,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitInclination: (Math.random() - 0.5) * Math.PI * 0.3,
      orbitPhase: Math.random() * Math.PI * 2,
      isSelected: false,
      isDensityBoosted: false,
      colorDepthFactor: 1
    }
  }

  private getRandomColorFromTheme(theme: ColorTheme): THREE.Color {
    const allColors = [...theme.primaryColors, ...theme.transitionColors]
    const colorStr = allColors[Math.floor(Math.random() * allColors.length)]
    return new THREE.Color(colorStr)
  }

  update(deltaTime: number, gravityPoint: THREE.Vector3, gravityStrength: number): Particle[] {
    const dt = deltaTime * this.speedMultiplier

    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStartTime
      const progress = Math.min(elapsed / 1500, 1)
      this.colorTransitionProgress = progress
      if (progress >= 1) {
        this.isTransitioning = false
      }
    }

    for (const particle of this.particles) {
      this.updateOrbit(particle, dt)
      this.applyGravity(particle, gravityPoint, gravityStrength, dt)
      this.updateColor(particle)
      this.updateSize(particle, deltaTime)
    }

    return this.particles
  }

  private updateOrbit(particle: Particle, dt: number) {
    particle.orbitAngle += particle.orbitSpeed * dt

    const r = particle.orbitRadius
    const angle = particle.orbitAngle
    const incl = particle.orbitInclination

    const baseX = r * Math.cos(angle)
    const baseZ = r * Math.sin(angle)
    const baseY = r * Math.sin(angle * 0.5 + particle.orbitPhase) * 0.3

    const x = baseX
    const y = baseY * Math.cos(incl) - baseZ * Math.sin(incl)
    const z = baseZ * Math.cos(incl) + baseY * Math.sin(incl)

    const targetPos = new THREE.Vector3(
      particle.orbitCenter.x + x,
      particle.orbitCenter.y + y,
      particle.orbitCenter.z + z
    )

    particle.position.lerp(targetPos, 0.05)
  }

  private applyGravity(particle: Particle, gravityPoint: THREE.Vector3, strength: number, dt: number) {
    if (strength <= 0) return

    const direction = new THREE.Vector3().subVectors(gravityPoint, particle.position)
    const distance = direction.length()

    if (distance < 0.1) return

    const force = (strength * 0.5) / Math.max(distance * distance, 1)
    direction.normalize().multiplyScalar(force * dt)
    particle.position.add(direction)

    if (distance < 3) {
      const colorFactor = 1 - distance / 3
      particle.color.lerp(new THREE.Color('#ffffff'), colorFactor * 0.3 * dt)
    }
  }

  private updateColor(particle: Particle) {
    if (this.isTransitioning) {
      const progress = this.colorTransitionProgress
      particle.color.lerpColors(particle.color, particle.targetColor, 0.02)
    }

    if (particle.colorDepthFactor !== 1) {
      particle.color.multiplyScalar(particle.colorDepthFactor)
    }
  }

  private updateSize(particle: Particle, deltaTime: number) {
    let targetSize = particle.baseSize

    if (particle.isSelected) {
      const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.02)
      targetSize = particle.baseSize * 1.5 * pulse
    }

    particle.size += (targetSize - particle.size) * 0.1
  }

  setParticleCount(count: number): Particle[] {
    const diff = count - this.particles.length
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.particles.push(this.createParticle())
      }
    } else if (diff < 0) {
      this.particles.splice(0, -diff)
    }
    this.particleCount = count
    return this.particles
  }

  setSizeRange(min: number, max: number) {
    this.sizeRange = [min, max]
    for (const particle of this.particles) {
      particle.baseSize = min + Math.random() * (max - min)
    }
  }

  setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = multiplier
  }

  setTheme(themeKey: string) {
    const theme = COLOR_THEMES[themeKey]
    if (!theme || theme === this.currentTheme) return

    this.previousTheme = this.currentTheme
    this.currentTheme = theme
    this.isTransitioning = true
    this.transitionStartTime = performance.now()
    this.colorTransitionProgress = 0

    for (const particle of this.particles) {
      particle.targetColor = this.getRandomColorFromTheme(theme)
    }
  }

  getParticles(): Particle[] {
    return this.particles
  }

  getParticleById(id: string): Particle | undefined {
    return this.particles.find(p => p.id === id)
  }

  selectParticle(id: string) {
    for (const p of this.particles) {
      p.isSelected = p.id === id
    }
  }

  deselectAll() {
    for (const p of this.particles) {
      p.isSelected = false
    }
  }

  applyConnectionEffect(particleA: Particle, particleB: Particle) {
    const connectionCenter = new THREE.Vector3()
      .addVectors(particleA.position, particleB.position)
      .multiplyScalar(0.5)

    const connectionDir = new THREE.Vector3()
      .subVectors(particleB.position, particleA.position)
      .normalize()

    for (const particle of this.particles) {
      const toCenter = new THREE.Vector3().subVectors(particle.position, connectionCenter)
      const distToLine = Math.abs(
        new THREE.Vector3().crossVectors(toCenter, connectionDir).length()
      )

      if (distToLine < 3 && particle !== particleA && particle !== particleB) {
        const projection = connectionCenter.clone().add(
          connectionDir.clone().multiplyScalar(toCenter.dot(connectionDir))
        )
        const offset = connectionDir
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
          .multiplyScalar((Math.random() - 0.5) * 1)

        particle.orbitCenter = projection.add(offset)
        particle.colorDepthFactor = 0.7
        particle.isDensityBoosted = true

        setTimeout(() => {
          particle.colorDepthFactor = 1
          particle.isDensityBoosted = false
          particle.orbitCenter = new THREE.Vector3(0, 0, 0)
        }, 2000)
      }
    }
  }
}
