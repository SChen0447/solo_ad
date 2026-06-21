import * as THREE from 'three'
import { scaleLinear } from 'd3-scale'
import { PipeData, PipeNetwork } from './pipeNetwork'

interface ParticleState {
  t: number
  speed: number
  baseSize: number
}

const flowColorScale = scaleLinear<string>()
  .domain([0, 0.33, 0.66, 1])
  .range(['#006666', '#00cccc', '#66ffff', '#ccffff'])
  .clamp(true)

export class FlowParticles {
  public group: THREE.Group
  private pipeNetwork: PipeNetwork
  private particleSystems: Map<string, {
    points: THREE.Points
    state: ParticleState[]
    baseCount: number
  }> = new Map()
  private warningTimer: number = 0
  private warningFlash: boolean = false

  constructor(pipeNetwork: PipeNetwork) {
    this.pipeNetwork = pipeNetwork
    this.group = new THREE.Group()
  }

  public buildParticles() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0])
    }
    this.particleSystems.clear()

    this.pipeNetwork.pipes.forEach(pipe => {
      this.createParticleSystem(pipe)
    })
  }

  private createParticleSystem(pipe: PipeData) {
    const curveLen = pipe.curve.getLength()
    const baseCount = Math.min(100, Math.max(50, Math.floor(curveLen * 8)))
    const positions = new Float32Array(baseCount * 3)
    const colors = new Float32Array(baseCount * 3)
    const sizes = new Float32Array(baseCount)
    const state: ParticleState[] = []

    for (let i = 0; i < baseCount; i++) {
      const t = (i / baseCount + Math.random() * 0.02) % 1
      state.push({
        t,
        speed: 0.03 + Math.random() * 0.02,
        baseSize: 0.2 + Math.random() * 0.1
      })
      const pos = pipe.curve.getPoint(t)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
      sizes[i] = 0.3
      colors[i * 3] = 0
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * 0.95;
          float glow = smoothstep(0.5, 0.15, dist);
          vec3 finalColor = vColor + glow * 0.3;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const points = new THREE.Points(geometry, material)
    points.userData.pipeId = pipe.id
    this.group.add(points)
    this.particleSystems.set(pipe.id, { points, state, baseCount })
  }

  public update(delta: number, camera: THREE.Camera) {
    this.warningTimer += delta
    if (this.warningTimer >= 0.5) {
      this.warningTimer = 0
      this.warningFlash = !this.warningFlash
    }

    this.particleSystems.forEach((system, pipeId) => {
      const pipe = this.pipeNetwork.getPipeById(pipeId)
      if (!pipe) return

      const { points, state } = system
      const positions = points.geometry.getAttribute('position') as THREE.BufferAttribute
      const colors = points.geometry.getAttribute('color') as THREE.BufferAttribute
      const sizes = points.geometry.getAttribute('size') as THREE.BufferAttribute

      const center = pipe.curve.getPoint(0.5)
      const distToCamera = camera.position.distanceTo(center)
      const isFar = distToCamera > 20
      const activeCount = isFar ? Math.floor(system.baseCount * 0.5) : system.baseCount

      const flowNormalized = (pipe.flowRate - 0.3) / (6 - 0.3)
      const sizeScale = 0.2 + flowNormalized * 0.6
      const baseColor = new THREE.Color(flowColorScale(flowNormalized))
      const isHighPressure = pipe.pressure > 80

      let orangeBlend = 0
      if (pipe.pressure > 55) {
        orangeBlend = Math.min(1, (pipe.pressure - 55) / 45)
      }
      const orangeColor = new THREE.Color('#ff7733')
      const adjustedBase = baseColor.clone().lerp(orangeColor, orangeBlend * 0.5)

      const warningColor = new THREE.Color('#ff2222')

      for (let i = 0; i < system.baseCount; i++) {
        const isActive = i < activeCount
        const particle = state[i]
        const speedMultiplier = 0.5 + pipe.flowRate * 0.15
        particle.t = (particle.t + particle.speed * speedMultiplier * delta * 60 * 0.016 + 1) % 1

        if (isActive) {
          const pos = pipe.curve.getPoint(particle.t)
          positions.setXYZ(i, pos.x, pos.y, pos.z)

          let finalColor = adjustedBase.clone()
          if (isHighPressure && this.warningFlash) {
            finalColor = warningColor.clone().lerp(adjustedBase, 0.3)
          }

          colors.setXYZ(i, finalColor.r, finalColor.g, finalColor.b)
          const size = particle.baseSize * sizeScale * (0.85 + Math.random() * 0.3)
          sizes.setX(i, size)
        } else {
          positions.setXYZ(i, -9999, -9999, -9999)
          sizes.setX(i, 0)
        }
      }

      positions.needsUpdate = true
      colors.needsUpdate = true
      sizes.needsUpdate = true

      const mat = points.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = performance.now() * 0.001
    })
  }
}
