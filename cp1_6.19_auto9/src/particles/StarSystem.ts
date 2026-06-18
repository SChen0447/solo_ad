import * as THREE from 'three'
import { STAR_COLORS } from '../store'

export interface StarData {
  id: number
  orbitRadius: number
  orbitTiltX: number
  orbitTiltZ: number
  orbitPhase: number
  speed: number
  color: THREE.Color
  size: number
  angle: number
  positions: THREE.Vector3[]
  trailGeometry: THREE.BufferGeometry | null
}

export class StarSystem {
  private stars: StarData[] = []
  private maxTrailLength: number = 60
  private orbitScale: number = 1.0
  private speedMultiplier: number = 1.0
  private colorGradientMode: boolean = false
  private starGeometry: THREE.BufferGeometry
  private starMaterial: THREE.ShaderMaterial
  private trailGeometry: THREE.BufferGeometry
  private trailMaterial: THREE.ShaderMaterial
  private starCount: number = 0

  constructor(initialCount: number = 200) {
    this.starGeometry = new THREE.BufferGeometry()
    this.trailGeometry = new THREE.BufferGeometry()

    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: 8.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uOpacity: { value: 1.0 },
        uGlowColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec3 vColor;
        uniform float uSize;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float core = 1.0 - smoothstep(0.0, 0.2, dist);
          float glow = 1.0 - smoothstep(0.2, 0.5, dist);
          float alpha = (core + glow * 0.6) * uOpacity;
          gl_FragColor = vec4(vColor * (core + glow * 0.3), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uOpacity: { value: 0.8 },
      },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vAlpha = aAlpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.5 * uPixelRatio * (300.0 / -mvPosition.z) * vAlpha;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha * uOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    this.setStarCount(initialCount)
  }

  private createStar(id: number): StarData {
    const colorHex = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
    return {
      id,
      orbitRadius: 8 + Math.random() * 12,
      orbitTiltX: (Math.random() - 0.5) * Math.PI * (60 / 180) * 2,
      orbitTiltZ: (Math.random() - 0.5) * Math.PI * (60 / 180) * 2,
      orbitPhase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.4,
      color: new THREE.Color(colorHex),
      size: 2 + Math.random() * 2,
      angle: Math.random() * Math.PI * 2,
      positions: [],
      trailGeometry: null,
    }
  }

  setStarCount(count: number): void {
    if (count === this.stars.length) return

    if (count > this.stars.length) {
      for (let i = this.stars.length; i < count; i++) {
        this.stars.push(this.createStar(i))
      }
    } else {
      this.stars = this.stars.slice(0, count)
    }

    this.starCount = count
    this.updateGeometries()
  }

  setTrailLength(length: number): void {
    this.maxTrailLength = length
    this.stars.forEach((star) => {
      if (star.positions.length > length) {
        star.positions = star.positions.slice(0, length)
      }
    })
    this.updateTrailGeometry()
  }

  setOrbitScale(scale: number): void {
    this.orbitScale = scale
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier
  }

  setColorGradientMode(enabled: boolean): void {
    this.colorGradientMode = enabled
    this.updateStarColors()
  }

  private updateStarColors(): void {
    const colors = new Float32Array(this.stars.length * 3)

    this.stars.forEach((star, i) => {
      let color = star.color
      if (this.colorGradientMode) {
        const t = star.orbitRadius / 20
        const hue = 0.7 - t * 0.5
        color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      }
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })

    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }

  private calculatePosition(star: StarData, angle: number): THREE.Vector3 {
    const radius = star.orbitRadius * this.orbitScale
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = Math.sin(angle * 0.5 + star.orbitPhase) * 2

    const pos = new THREE.Vector3(x, y, z)

    const tiltX = new THREE.Matrix4().makeRotationX(star.orbitTiltX)
    const tiltZ = new THREE.Matrix4().makeRotationZ(star.orbitTiltZ)

    pos.applyMatrix4(tiltX)
    pos.applyMatrix4(tiltZ)

    return pos
  }

  update(deltaTime: number): void {
    const baseSpeed = 0.3

    this.stars.forEach((star) => {
      star.angle += baseSpeed * star.speed * this.speedMultiplier * deltaTime

      const position = this.calculatePosition(star, star.angle)
      star.positions.unshift(position.clone())

      if (star.positions.length > this.maxTrailLength) {
        star.positions.pop()
      }
    })

    this.updateGeometries()
  }

  private updateGeometries(): void {
    this.updateStarGeometry()
    this.updateTrailGeometry()
  }

  private updateStarGeometry(): void {
    const positions = new Float32Array(this.stars.length * 3)
    const colors = new Float32Array(this.stars.length * 3)

    this.stars.forEach((star, i) => {
      const pos = star.positions[0] || new THREE.Vector3()
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      let color = star.color
      if (this.colorGradientMode) {
        const t = star.orbitRadius / 20
        const hue = 0.7 - t * 0.5
        color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      }
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.starGeometry.attributes.position.needsUpdate = true
    this.starGeometry.attributes.color.needsUpdate = true
  }

  private updateTrailGeometry(): void {
    let totalTrailPoints = 0
    this.stars.forEach((star) => {
      totalTrailPoints += star.positions.length
    })

    const positions = new Float32Array(totalTrailPoints * 3)
    const colors = new Float32Array(totalTrailPoints * 3)
    const alphas = new Float32Array(totalTrailPoints)

    let index = 0

    this.stars.forEach((star) => {
      let color = star.color
      if (this.colorGradientMode) {
        const t = star.orbitRadius / 20
        const hue = 0.7 - t * 0.5
        color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      }

      star.positions.forEach((pos, i) => {
        const progress = 1 - i / this.maxTrailLength
        const alpha = progress * 0.8

        positions[index * 3] = pos.x
        positions[index * 3 + 1] = pos.y
        positions[index * 3 + 2] = pos.z

        colors[index * 3] = color.r
        colors[index * 3 + 1] = color.g
        colors[index * 3 + 2] = color.b

        alphas[index] = alpha

        index++
      })
    })

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.trailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    this.trailGeometry.attributes.position.needsUpdate = true
    if (this.trailGeometry.attributes.color) {
      this.trailGeometry.attributes.color.needsUpdate = true
    }
    if (this.trailGeometry.attributes.aAlpha) {
      this.trailGeometry.attributes.aAlpha.needsUpdate = true
    }
  }

  getStarPoints(): THREE.Points {
    const points = new THREE.Points(this.starGeometry, this.starMaterial)
    return points
  }

  getTrailPoints(): THREE.Points {
    const points = new THREE.Points(this.trailGeometry, this.trailMaterial)
    return points
  }

  getStarGeometry(): THREE.BufferGeometry {
    return this.starGeometry
  }

  getTrailGeometry(): THREE.BufferGeometry {
    return this.trailGeometry
  }

  getStarMaterial(): THREE.ShaderMaterial {
    return this.starMaterial
  }

  getTrailMaterial(): THREE.ShaderMaterial {
    return this.trailMaterial
  }

  dispose(): void {
    this.starGeometry.dispose()
    this.trailGeometry.dispose()
    this.starMaterial.dispose()
    this.trailMaterial.dispose()
  }
}
