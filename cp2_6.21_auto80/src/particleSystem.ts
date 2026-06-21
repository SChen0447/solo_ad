import * as THREE from 'three'

interface ParticleData {
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
  birthTime: number
  lifetime: number
  baseSize: number
}

export class ParticleSystem {
  public points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private particles: ParticleData[] = []
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array
  private particleCount: number
  private readonly shellRadius: number = 12
  private readonly lowColor: THREE.Color = new THREE.Color(0x00bfff)
  private readonly highColor: THREE.Color = new THREE.Color(0xff8c00)
  private scene: THREE.Scene

  constructor(scene: THREE.Scene, count: number = 500) {
    this.scene = scene
    this.particleCount = count

    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.alphas = new Float32Array(count)

    this.initParticles()

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float edge = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, vAlpha * edge);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.initParticle(i, 0)
    }
  }

  private initParticle(index: number, time: number): void {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = this.shellRadius * (0.5 + Math.random() * 0.5)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.6 + 2
    const z = r * Math.cos(phi)

    this.positions[index * 3] = x
    this.positions[index * 3 + 1] = y
    this.positions[index * 3 + 2] = z

    this.colors[index * 3] = this.lowColor.r
    this.colors[index * 3 + 1] = this.lowColor.g
    this.colors[index * 3 + 2] = this.lowColor.b

    const size = 0.1 + Math.random() * 0.2
    this.sizes[index] = size

    this.alphas[index] = 1

    const particle: ParticleData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.01 + 0.005,
        (Math.random() - 0.5) * 0.02
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.002
      ),
      birthTime: time,
      lifetime: 2000,
      baseSize: size,
    }

    if (index < this.particles.length) {
      this.particles[index] = particle
    } else {
      this.particles.push(particle)
    }
  }

  public update(time: number, audioAmplitude: number): void {
    const speedMultiplier = 1 + audioAmplitude * 3

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i]
      const age = time - particle.birthTime

      if (age > particle.lifetime) {
        this.initParticle(i, time)
        continue
      }

      const lifeRatio = age / particle.lifetime
      const fadeOut = 1 - lifeRatio

      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const px = this.positions[ix]
      const py = this.positions[iy]
      const pz = this.positions[iz]

      const angle = particle.angularVelocity.y * speedMultiplier
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const newX = px * cosA - pz * sinA + particle.velocity.x * speedMultiplier
      const newZ = px * sinA + pz * cosA + particle.velocity.z * speedMultiplier
      let newY = py + particle.velocity.y * speedMultiplier

      if (newY > 10) {
        newY = -2
      }

      this.positions[ix] = newX
      this.positions[iy] = newY
      this.positions[iz] = newZ

      const color = this.lowColor.clone().lerp(this.highColor, audioAmplitude)
      this.colors[ix] = color.r
      this.colors[iy] = color.g
      this.colors[iz] = color.b

      this.sizes[i] = particle.baseSize * (1 + audioAmplitude * 0.5) * (0.5 + fadeOut * 0.5)
      this.alphas[i] = fadeOut * 0.9
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return

    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()

    this.particleCount = count
    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.alphas = new Float32Array(count)
    this.particles = []

    this.initParticles()

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float edge = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, vAlpha * edge);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }

  public getParticleCount(): number {
    return this.particleCount
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.points)
  }
}
