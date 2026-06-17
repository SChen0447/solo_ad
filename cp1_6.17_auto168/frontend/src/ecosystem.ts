import * as THREE from 'three'

export interface CreatureType = 'riftia' | 'shrimp' | 'mussel' | 'octopus' | 'vent' | 'plume'

export interface CreatureData {
  id: string
  name: string
  commonName: string
  ecologicalRole: string
  description: string
  depthRange: string
  temperatureTolerance: string
}

export interface ClickableObject {
  mesh: THREE.Object3D
  type: CreatureType
  data?: Partial<CreatureData>
}

interface Riftia {
  group: THREE.Group
  tentacles: THREE.Mesh[]
  basePhase: number
  frequency: number
}

interface Shrimp {
  group: THREE.Group
  velocity: THREE.Vector3
  glowPoints: THREE.Mesh[]
  baseSpeed: number
  phase: number
}

interface Mussel {
  group: THREE.Group
}

interface Octopus {
  group: THREE.Group
  tentacles: THREE.Mesh[]
  extendPhase: number
  extended: boolean
}

export class Ecosystem {
  scene: THREE.Scene
  ventGroup: THREE.Group
  plumeParticles: THREE.Points
  plumePositions: Float32Array
  plumeVelocities: Float32Array
  plumeSizes: Float32Array
  plumeColors: Float32Array
  plumeLifetimes: Float32Array
  plumeConfig: any

  riftias: Riftia[]
  shrimps: Shrimp[]
  mussels: Mussel[]
  octopuses: Octopus[]

  clickableObjects: ClickableObject[]

  time: number
  submersiblePosition: THREE.Vector3
  onCreatureClick: ((obj: ClickableObject) => void

  plumeCenterColor: THREE.Color
  plumeEdgeColor: THREE.Color
  plumeCenterTemp: number
  plumeEdgeTemp: number

  constructor(scene: THREE.Scene, plumeConfig?: any) {
    this.scene = scene
    this.time = 0
    this.riftias = []
    this.shrimps = []
    this.mussels = []
    this.octopuses = []
    this.clickableObjects = []
    this.submersiblePosition = new THREE.Vector3(50, 20, 50)
    this.onCreatureClick = () => {}
    this.plumeConfig = plumeConfig || {
      particleCount: 1200,
      velocityBase: 2.5,
      velocityVariation: 0.8,
      particleSizeMin: 0.5,
      particleSizeMax: 3.0,
      temperatureCenter: 350,
      temperatureEdge: 5,
      colorCenter: [1.0, 0.27, 0.0],
      colorEdge: [0.1, 0.1, 0.25],
      lifetime: 6.0,
      spreadAngle: 0.35
    }

    this.plumeCenterColor = new THREE.Color(
      this.plumeConfig.colorCenter[0],
      this.plumeConfig.colorCenter[1],
      this.plumeConfig.colorCenter[2]
    )
    this.plumeEdgeColor = new THREE.Color(
      this.plumeConfig.colorEdge[0],
      this.plumeConfig.colorEdge[1],
      this.plumeConfig.colorEdge[2]
    )
    this.plumeCenterTemp = this.plumeConfig.temperatureCenter
    this.plumeEdgeTemp = this.plumeConfig.temperatureEdge

    this.ventGroup = new THREE.Group()
    this.scene.add(this.ventGroup)

    this.plumePositions = new Float32Array(this.plumeConfig.particleCount * 3)
    this.plumeVelocities = new Float32Array(this.plumeConfig.particleCount * 3)
    this.plumeSizes = new Float32Array(this.plumeConfig.particleCount)
    this.plumeColors = new Float32Array(this.plumeConfig.particleCount * 3)
    this.plumeLifetimes = new Float32Array(this.plumeConfig.particleCount)

    this.plumeParticles = this.createPlumeSystem()
    this.ventGroup.add(this.plumeParticles)

    this.createVentStructure()
    this.createRiftias()
    this.createShrimps()
    this.createMussels()
    this.createOctopuses()
  }

  createVentStructure() {
    const chimneyGeo = new THREE.ConeGeometry(4, 8, 12, 4, true)
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    })
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat)
    chimney.position.y = 4
    chimney.userData.type = 'vent'
    this.ventGroup.add(chimney)
    this.clickableObjects.push({
      mesh: chimney,
      type: 'vent'
    })

    const holeCount = 60
    for (let i = 0; i < holeCount; i++) {
      const heightRatio = Math.random()
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + heightRatio * 3.5
      const bumpSize = 0.1 + Math.random() * 0.4
      const bumpGeo = new THREE.SphereGeometry(bumpSize, 4, 3)
      const bumpMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.05 + Math.random() * 0.1),
        roughness: 0.95
      })
      const bump = new THREE.Mesh(bumpGeo, bumpMat)
      bump.position.set(
        Math.cos(angle) * radius,
        heightRatio * 8,
        Math.sin(angle) * radius
      )
      chimney.add(bump)
    }

    const baseGeo = new THREE.CylinderGeometry(8, 12, 3, 16)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 1.5
    this.ventGroup.add(base)

    for (let r = 0; r < 25; r++) {
      const rockSize = 0.5 + Math.random() * 1.5
      const rockGeo = new THREE.DodecahedronGeometry(rockSize, 0)
      const rockMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.02 + Math.random() * 0.08),
        roughness: 0.9,
        flatShading: true
      })
      const rock = new THREE.Mesh(rockGeo, rockMat)
      const rockAngle = Math.random() * Math.PI * 2
      const rockDist = 9 + Math.random() * 12
      rock.position.set(
        Math.cos(rockAngle) * rockDist,
        rockSize * 0.3,
        Math.sin(rockAngle) * rockDist
      )
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      this.ventGroup.add(rock)
    }
  }

  createPlumeSystem(): THREE.Points {
    const particleCount = this.plumeConfig.particleCount
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      this.resetPlumeParticle(i)
      positions[i * 3] = this.plumePositions[i * 3]
      positions[i * 3 + 1] = this.plumePositions[i * 3 + 1]
      positions[i * 3 + 2] = this.plumePositions[i * 3 + 2]
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.plumeColors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.plumeSizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
          if (gl_FragColor.a < 0.1) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.userData.type = 'plume'
    this.clickableObjects.push({
      mesh: points,
      type: 'plume'
    })
    return points
  }

  createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  resetPlumeParticle(index: number) {
    const i3 = index * 3
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 1.5
    this.plumePositions[i3] = Math.cos(angle) * radius
    this.plumePositions[i3 + 1] = 8.5 + Math.random() * 0.5
    this.plumePositions[i3 + 2] = Math.sin(angle) * radius

    const spreadAngle = this.plumeConfig.spreadAngle
    const vAngle = (Math.random() - 0.5) * spreadAngle
    const vBaseSpeed = this.plumeConfig.velocityBase +
      (Math.random() - 0.5) * this.plumeConfig.velocityVariation
    this.plumeVelocities[i3] = Math.sin(vAngle) * Math.cos(angle) * vBaseSpeed * 0.3
    this.plumeVelocities[i3 + 1] = Math.cos(vAngle) * vBaseSpeed
    this.plumeVelocities[i3 + 2] = Math.sin(vAngle) * Math.sin(angle) * vBaseSpeed * 0.3

    const size = this.plumeConfig.particleSizeMin +
      Math.random() * (this.plumeConfig.particleSizeMax - this.plumeConfig.particleSizeMin)
    this.plumeSizes[index] = size

    this.plumeColors[i3] = this.plumeCenterColor.r
    this.plumeColors[i3 + 1] = this.plumeCenterColor.g
    this.plumeColors[i3 + 2] = this.plumeCenterColor.b

    this.plumeLifetimes[index] = Math.random() * this.plumeConfig.lifetime
  }

  createRiftias() {
    const count = 14
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group()
      const tubeHeight = 2.5 + Math.random() * 3
      const tubeGeo = new THREE.CylinderGeometry(0.25, 0.4, tubeHeight, 8)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.6
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      tube.position.y = tubeHeight / 2
      group.add(tube)

      const tentacleCount = 12
      const tentacles: THREE.Mesh[] = []
      for (let j = 0; j < tentacleCount; j++) {
        const tentacleGeo = new THREE.ConeGeometry(0.08, 1.2, 4)
        const tentacleMat = new THREE.MeshStandardMaterial({
          color: 0xff3333,
          emissive: 0x880000,
          emissiveIntensity: 0.3,
          roughness: 0.5
        })
        const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat)
        const a = (j / tentacleCount) * Math.PI * 2
        tentacle.position.set(
          Math.cos(a) * 0.2,
          tubeHeight + 0.4,
          Math.sin(a) * 0.2
        )
        tentacle.rotation.z = Math.cos(a) * 0.4
        tentacle.rotation.x = Math.sin(a) * 0.4
        tentacles.push(tentacle)
        group.add(tentacle)
      }

      const angle = Math.random() * Math.PI * 2
      const dist = 5.5 + Math.random() * 4
      group.position.set(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist
      )
      group.rotation.y = Math.random() * Math.PI * 2
      this.ventGroup.add(group)

      const riftia: Riftia = {
        group,
        tentacles,
        basePhase: Math.random() * Math.PI * 2,
        frequency: 1.0
      }
      this.riftias.push(riftia)

      this.clickableObjects.push({
        mesh: group,
        type: 'riftia'
      })
    }
  }

  createShrimps() {
    const count = 18
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group()

      const bodyGeo = new THREE.SphereGeometry(0.4, 8, 6)
      bodyGeo.scale(1, 0.6, 1.5)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        transparent: true,
        opacity: 0.7,
        roughness: 0.3,
        metalness: 0.1
      })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      group.add(body)

      const headGeo = new THREE.SphereGeometry(0.25, 6, 5)
      const head = new THREE.Mesh(headGeo, bodyMat)
      head.position.z = 0.6
      group.add(head)

      const tailGeo = new THREE.ConeGeometry(0.2, 0.6, 4)
      const tail = new THREE.Mesh(tailGeo, bodyMat)
      tail.position.z = -0.7
      tail.rotation.x = Math.PI
      group.add(tail)

      for (let k = 0; k < 3; k++) {
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 3)
        const leg = new THREE.Mesh(legGeo, bodyMat)
        leg.position.set(-0.3, -0.2, -0.2 + k * 0.2)
        leg.rotation.z = 0.3
        group.add(leg)
        const legR = leg.clone()
        legR.position.x = 0.3
        legR.rotation.z = -0.3
        group.add(legR)
      }

      const glowPoints: THREE.Mesh[] = []
      for (let g = 0; g < 5; g++) {
        const glowGeo = new THREE.SphereGeometry(0.05, 6, 6)
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x00bfff,
          transparent: true,
          opacity: 0.9
        })
        const glow = new THREE.Mesh(glowGeo, glowMat)
        glow.position.set(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.2) * 0.3,
          (Math.random() - 0.3) * 0.8
        )
        group.add(glow)
        glowPoints.push(glow)
      }

      const angle = Math.random() * Math.PI * 2
      const dist = 3 + Math.random() * 12
      const height = 1 + Math.random() * 12
      group.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      )
      this.ventGroup.add(group)

      const baseSpeed = 2 + Math.random() * 2
      const shrimp: Shrimp = {
        group,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * baseSpeed,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * baseSpeed
        ),
        glowPoints,
        baseSpeed,
        phase: Math.random() * Math.PI * 2
      }
      this.shrimps.push(shrimp)
      this.clickableObjects.push({
        mesh: group,
        type: 'shrimp'
      })
    }
  }

  createMussels() {
    const clusterCount = 8
    for (let c = 0; c < clusterCount; c++) {
      const clusterAngle = Math.random() * Math.PI * 2
      const clusterDist = 6 + Math.random() * 8
      const clusterX = Math.cos(clusterAngle) * clusterDist
      const clusterZ = Math.sin(clusterAngle) * clusterDist

      const perCluster = 4 + Math.floor(Math.random() * 5)
      for (let i = 0; i < perCluster; i++) {
        const group = new THREE.Group()
        const shellGeo = new THREE.SphereGeometry(0.35, 8, 6)
        shellGeo.scale(1, 0.6, 1.4)
        const shellMat = new THREE.MeshStandardMaterial({
          color: 0x2a1810,
          roughness: 0.85
        })
        const shellL = new THREE.Mesh(shellGeo, shellMat)
        shellL.position.z = 0.1
        shellL.rotation.y = 0.2
        group.add(shellL)
        const shellR = new THREE.Mesh(shellGeo, shellMat)
        shellR.position.z = -0.1
        shellR.rotation.y = -0.2
        group.add(shellR)

        const offsetAngle = Math.random() * Math.PI * 2
        const offsetDist = Math.random() * 1.2
        group.position.set(
          clusterX + Math.cos(offsetAngle) * offsetDist,
          0.15 + Math.random() * 0.5,
          clusterZ + Math.sin(offsetAngle) * offsetDist
        )
        group.rotation.set(
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.4
        )
        this.ventGroup.add(group)

        this.mussels.push({ group })
        this.clickableObjects.push({
          mesh: group,
          type: 'mussel'
        })
      }
    }
  }

  createOctopuses() {
    const count = 4
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group()

      const headGeo = new THREE.SphereGeometry(0.8, 10, 8)
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xffb6c1,
        transparent: true,
        opacity: 0.75,
        roughness: 0.4,
        metalness: 0.1
      })
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.y = 0.6
      group.add(head)

      const tentacles: THREE.Mesh[] = []
      for (let t = 0; t < 8; t++) {
        const tentacleCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.2, -0.6, 0),
          new THREE.Vector3(0.5, -1.1, 0.1),
          new THREE.Vector3(0.8, -1.4, -0.1)
        ])
        const tentacleGeo = new THREE.TubeGeometry(tentacleCurve, 8, 0.08, 4, false)
        const tentacleMat = new THREE.MeshStandardMaterial({
          color: 0xffc0cb,
          transparent: true,
          opacity: 0.8
        })
        const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat)
        const a = (t / 8) * Math.PI * 2
        tentacle.rotation.y = a
        tentacles.push(tentacle)
        group.add(tentacle)
      }

      const angle = Math.random() * Math.PI * 2
      const dist = 10 + Math.random() * 8
      group.position.set(
        Math.cos(angle) * dist,
        1,
        Math.sin(angle) * dist
      )
      this.ventGroup.add(group)

      this.octopuses.push({
        group,
        tentacles,
        extendPhase: Math.random() * Math.PI * 2,
        extended: false
      })
      this.clickableObjects.push({
        mesh: group,
        type: 'octopus'
      })
    }
  }

  update(dt: number) {
    this.time += dt
    this.updatePlume(dt)
    this.updateRiftias(dt)
    this.updateShrimps(dt)
    this.updateOctopuses(dt)
  }

  updatePlume(dt: number) {
    const count = this.plumeConfig.particleCount
    const positions = this.plumeParticles.geometry.attributes.position.array as Float32Array
    const colors = this.plumeParticles.geometry.attributes.color.array as Float32Array
    const sizes = this.plumeParticles.geometry.attributes.size.array as Float32Array

    const velFluct = 1 + Math.sin(this.time * 2) * 0.15

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      this.plumeLifetimes[i] += dt

      if (this.plumeLifetimes[i] > this.plumeConfig.lifetime) {
        this.resetPlumeParticle(i)
      }

      this.plumePositions[i3] += this.plumeVelocities[i3] * dt * velFluct
      this.plumePositions[i3 + 1] += this.plumeVelocities[i3 + 1] * dt * velFluct
      this.plumePositions[i3 + 2] += this.plumeVelocities[i3 + 2] * dt * velFluct

      this.plumeVelocities[i3 + 1] -= dt * 0.15

      positions[i3] = this.plumePositions[i3]
      positions[i3 + 1] = this.plumePositions[i3 + 1]
      positions[i3 + 2] = this.plumePositions[i3 + 2]

      const lifeRatio = this.plumeLifetimes[i] / this.plumeConfig.lifetime
      const curSize = this.plumeSizes[i] * (1 + lifeRatio * 1.5)
      sizes[i] = curSize

      const colorT = Math.min(lifeRatio * 1.3, 1)
      colors[i3] = this.lerp(this.plumeCenterColor.r, this.plumeEdgeColor.r, colorT)
      colors[i3 + 1] = this.lerp(this.plumeCenterColor.g, this.plumeEdgeColor.g, colorT)
      colors[i3 + 2] = this.lerp(this.plumeCenterColor.b, this.plumeEdgeColor.b, colorT)
    }

    this.plumeParticles.geometry.attributes.position.needsUpdate = true
    this.plumeParticles.geometry.attributes.color.needsUpdate = true
    this.plumeParticles.geometry.attributes.size.needsUpdate = true
  }

  updateRiftias(dt: number) {
    const subDist = this.riftias[0]?.group.position.distanceTo(this.submersiblePosition) || 100
    const nearSub = subDist < 5

    for (const riftia of this.riftias) {
      const dist = riftia.group.position.distanceTo(this.submersiblePosition)
      const freq = dist < 5 ? 3.5 : 1.0
      riftia.frequency += (freq - riftia.frequency) * Math.min(dt * 2, 1)

      for (let i = 0; i < riftia.tentacles.length; i++) {
        const t = riftia.tentacles[i]
        const a = (i / riftia.tentacles.length) * Math.PI * 2
        const wobble = Math.sin(this.time * riftia.frequency + riftia.basePhase + a) * 0.4
        t.rotation.z = Math.cos(a) * (0.4 + wobble * 0.5)
        t.rotation.x = Math.sin(a) * (0.4 + wobble * 0.5)
      }
    }
  }

  updateShrimps(dt: number) {
    for (const shrimp of this.shrimps) {
      const dist = shrimp.group.position.distanceTo(this.submersiblePosition)
      const speedMul = dist < 5 ? 2.5 : 1

      const pos = shrimp.group.position
      const distFromCenter = Math.sqrt(pos.x ** 2 + pos.z ** 2)

      if (distFromCenter > 25) {
        const dir = new THREE.Vector3(-pos.x, 0, -pos.z).normalize()
        shrimp.velocity.x += dir.x * dt * 2
        shrimp.velocity.z += dir.z * dt * 2
      } else if (distFromCenter < 3) {
        const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize()
        shrimp.velocity.x += dir.x * dt * 2
        shrimp.velocity.z += dir.z * dt * 2
      }

      if (dist < 5) {
        const away = new THREE.Vector3().subVectors(shrimp.group.position, this.submersiblePosition).normalize()
        shrimp.velocity.addScaledVector(away, dt * 8)
      }

      const maxSpeed = shrimp.baseSpeed * speedMul
      const spd = shrimp.velocity.length()
      if (spd > maxSpeed) {
        shrimp.velocity.multiplyScalar(maxSpeed / spd)
      }

      pos.addScaledVector(shrimp.velocity, dt)

      if (pos.y < 0.5) {
        pos.y = 0.5
        shrimp.velocity.y = Math.abs(shrimp.velocity.y) * 0.5
      }
      if (pos.y > 18) {
        pos.y = 18
        shrimp.velocity.y = -Math.abs(shrimp.velocity.y) * 0.5
      }

      const targetRotY = Math.atan2(shrimp.velocity.x, shrimp.velocity.z)
      const curRotY = shrimp.group.rotation.y
      let diff = targetRotY - curRotY
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      shrimp.group.rotation.y += diff * Math.min(dt * 4, 1)

      shrimp.phase += dt * 2
      for (const glow of shrimp.glowPoints) {
        const mat = glow.material as THREE.MeshBasicMaterial
        mat.opacity = 0.5 + Math.sin(shrimp.phase + glow.position.x * 5) * 0.4
      }
    }
  }

  updateOctopuses(dt: number) {
    for (const octo of this.octopuses) {
      octo.extendPhase += dt * 0.6
      if (Math.sin(octo.extendPhase) > 0.3 && !octo.extended) {
        octo.extended = true
      } else if (Math.sin(octo.extendPhase) < -0.3 && octo.extended) {
        octo.extended = false
      }

      for (let t = 0; t < octo.tentacles.length; t++) {
        const tentacle = octo.tentacles[t]
        const phase = octo.extendPhase + (t / octo.tentacles.length) * Math.PI * 0.5
        const extendAmt = octo.extended ? 1 : 0.3
        const wobble = Math.sin(phase * 2) * 0.5

        const tentacle.rotation.z = (t / octo.tentacles.length) * Math.PI * 2 + wobble
        tentacle.scale.setScalar(extendAmt + 0.5)
      }

      const targetY = 1 + Math.sin(octo.extendPhase * 0.3) * 0.3
      octo.group.position.y += (targetY - octo.group.position.y) * Math.min(dt, 1)
    }
  }

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  getEnvironmentData(position: THREE.Vector3): { temperature: number; pH: number; depth: number } {
    const distFromVent = Math.sqrt(
      position.x ** 2 + position.z ** 2 + (position.y - 5) ** 2
    )
    const t = Math.max(0, Math.min(1, distFromVent / 40))
    const temperature = this.lerp(this.plumeCenterTemp, 2, t)
    const pH = this.lerp(2.0, 7.5, t)
    const depth = 2500 + (55 - Math.max(0, position.y)) * 15
    return { temperature, pH, depth }
  }

  setSubmersiblePosition(pos: THREE.Vector3) {
    this.submersiblePosition.copy(pos)
  }

  handleClick(intersects: THREE.Intersection[]): ClickableObject | null {
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        for (const clickable of this.clickableObjects) {
          if (clickable.mesh === obj || obj === clickable.mesh) {
            return clickable
          }
        }
        obj = obj.parent
      }
    }
    return null
  }

  getClickableObjects(): THREE.Object3D[] {
    return this.clickableObjects.map(c => c.mesh)
  }
}
