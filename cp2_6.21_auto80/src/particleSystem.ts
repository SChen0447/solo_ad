import * as THREE from 'three'

interface ParticleData {
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
  birthTime: number
  lifetime: number
  baseSize: number
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitTilt: number
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
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGlobalOpacity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uGlobalOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float edge = 1.0 - smoothstep(0.35, 0.5, dist);
          float finalAlpha = vAlpha * edge * uGlobalOpacity;
          gl_FragColor = vec4(vColor, finalAlpha);
        }
      `,
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
    const orbitRadius = this.shellRadius * (0.4 + Math.random() * 0.6)
    const orbitAngle = Math.random() * Math.PI * 2
    const orbitSpeed = (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1)
    const orbitTilt = (Math.random() - 0.5) * Math.PI * 0.4

    const x = Math.cos(orbitAngle) * orbitRadius
    const y = Math.sin(orbitTilt) * orbitRadius * 0.3 + 2 + Math.random() * 4
    const z = Math.sin(orbitAngle) * orbitRadius

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
        (Math.random() - 0.5) * 0.01,
        Math.random() * 0.005 + 0.002,
        (Math.random() - 0.5) * 0.01
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.001,
        orbitSpeed * 0.01,
        (Math.random() - 0.5) * 0.001
      ),
      birthTime: time,
      lifetime: 2000,
      baseSize: size,
      orbitRadius,
      orbitAngle,
      orbitSpeed,
      orbitTilt,
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

      particle.orbitAngle += particle.orbitSpeed * speedMultiplier * 0.02

      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const spiralOffset = age * 0.0001 * speedMultiplier
      const currentRadius = particle.orbitRadius + Math.sin(spiralOffset) * 0.5
      const currentAngle = particle.orbitAngle + spiralOffset * 0.1

      this.positions[ix] = Math.cos(currentAngle) * currentRadius + particle.velocity.x * age * 0.01
      this.positions[iy] = Math.sin(particle.orbitTilt) * currentRadius * 0.3 + 2 + Math.abs(Math.sin(spiralOffset * 2)) * 3 + particle.velocity.y * age * 0.01
      this.positions[iz] = Math.sin(currentAngle) * currentRadius + particle.velocity.z * age * 0.01

      if (this.positions[iy] > 12) {
        this.positions[iy] = -1
      }

      const color = this.lowColor.clone().lerp(this.highColor, audioAmplitude)
      this.colors[ix] = color.r
      this.colors[iy] = color.g
      this.colors[iz] = color.b

      this.sizes[i] = particle.baseSize * (1 + audioAmplitude * 0.5) * (0.3 + fadeOut * 0.7)
      this.alphas[i] = fadeOut * 0.9
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute
    const alphaAttr = this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true

    this.material.uniforms.uGlobalOpacity.value = 0.8 + audioAmplitude * 0.2
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
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGlobalOpacity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uGlobalOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float edge = 1.0 - smoothstep(0.35, 0.5, dist);
          float finalAlpha = vAlpha * edge * uGlobalOpacity;
          gl_FragColor = vec4(vColor, finalAlpha);
        }
      `,
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
