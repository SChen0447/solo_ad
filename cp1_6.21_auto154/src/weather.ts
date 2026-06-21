import * as THREE from 'three'
import gsap from 'gsap'
import type { SceneManager, WeatherType } from './scene'

interface Ripple {
  mesh: THREE.Mesh
  life: number
  maxLife: number
}

export class WeatherManager {
  private scene: THREE.Scene
  private sceneManager: SceneManager

  private rainParticles!: THREE.Points
  private rainPositions: Float32Array = new Float32Array()
  private rainVelocities: number[] = []

  private snowParticles!: THREE.Points
  private snowPositions: Float32Array = new Float32Array()
  private snowVelocities: { x: number; y: number; z: number; rot: number }[] = []

  private ripples: Ripple[] = []
  private rippleGeometry!: THREE.RingGeometry
  private rippleMaterial!: THREE.MeshBasicMaterial

  private lightningMesh!: THREE.Mesh
  private lightningLight!: THREE.PointLight
  private lightningActive = false
  private nextLightningTime = 0
  private lightningDuration = 0

  private currentWeather: WeatherType = 'sunny'
  private windSpeed = 3

  private readonly MAX_PARTICLES = 2000
  private rainCount = 0
  private snowCount = 0

  private bounds = { minX: -30, maxX: 30, minY: -5, maxY: 25, minZ: -30, maxZ: 30 }

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager
    this.scene = sceneManager.scene

    this.rippleGeometry = new THREE.RingGeometry(0.1, 0.3, 16)
    this.rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })

    this.createRainParticles()
    this.createSnowParticles()
    this.createLightning()
  }

  private createRainParticles() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.MAX_PARTICLES * 3)
    const sizes = new Float32Array(this.MAX_PARTICLES)

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -100
      positions[i * 3 + 2] = 0
      sizes[i] = 1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 32)
    gradient.addColorStop(0, 'rgba(200, 220, 255, 0)')
    gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 8, 32)

    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.15,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.rainParticles = new THREE.Points(geometry, material)
    this.rainPositions = positions
    this.scene.add(this.rainParticles)

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.rainVelocities.push(0)
    }
  }

  private createSnowParticles() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.MAX_PARTICLES * 3)

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -100
      positions[i * 3 + 2] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)

    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.3,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.snowParticles = new THREE.Points(geometry, material)
    this.snowPositions = positions
    this.scene.add(this.snowParticles)

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.snowVelocities.push({ x: 0, y: 0, z: 0, rot: 0 })
    }
  }

  private createLightning() {
    const geometry = new THREE.PlaneGeometry(2, 30)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    this.drawLightning(ctx, 32, 0, 32, 512, 10)

    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })

    this.lightningMesh = new THREE.Mesh(geometry, material)
    this.lightningMesh.position.set(0, 20, -15)
    this.lightningMesh.visible = false
    this.scene.add(this.lightningMesh)

    this.lightningLight = new THREE.PointLight(0xffffff, 0, 50)
    this.lightningLight.position.set(0, 15, -15)
    this.scene.add(this.lightningLight)
  }

  private drawLightning(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    displace: number
  ) {
    if (displace < 2) {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)'
      ctx.lineWidth = 8
      ctx.stroke()
    } else {
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      const offsetX = (Math.random() - 0.5) * displace
      const offsetY = (Math.random() - 0.5) * displace * 0.5

      this.drawLightning(ctx, x1, y1, midX + offsetX, midY + offsetY, displace / 2)
      this.drawLightning(ctx, midX + offsetX, midY + offsetY, x2, y2, displace / 2)

      if (Math.random() > 0.7) {
        const branchX = midX + offsetX + (Math.random() - 0.5) * 10
        const branchY = midY + offsetY + Math.random() * 30
        this.drawLightning(
          ctx,
          midX + offsetX,
          midY + offsetY,
          branchX,
          branchY,
          displace / 2
        )
      }
    }
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather
    this.sceneManager.setWeather(weather)

    const rainMaterial = this.rainParticles.material as THREE.PointsMaterial
    const snowMaterial = this.snowParticles.material as THREE.PointsMaterial

    const isRainy = weather === 'rainy' || weather === 'thunderstorm'
    const isSnowy = weather === 'snowy'

    const rainOpacity = isRainy ? (weather === 'thunderstorm' ? 0.9 : 0.6) : 0
    const snowOpacity = isSnowy ? 0.8 : 0

    gsap.to(rainMaterial, { opacity: rainOpacity, duration: 1.5 })
    gsap.to(snowMaterial, { opacity: snowOpacity, duration: 1.5 })

    const rainDensity = weather === 'thunderstorm' ? 1 : weather === 'rainy' ? 0.5 : 0
    const snowDensity = isSnowy ? 0.6 : 0

    this.rainCount = Math.floor(this.MAX_PARTICLES * rainDensity)
    this.snowCount = Math.floor(this.MAX_PARTICLES * snowDensity)

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (i < this.rainCount) {
        this.resetRainParticle(i, true)
      } else if (i < this.rainCount + 0) {
      }
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (i < this.snowCount) {
        this.resetSnowParticle(i, true)
      }
    }

    this.nextLightningTime = 3 + Math.random() * 2
  }

  private resetRainParticle(index: number, randomY = false) {
    const i = index * 3
    this.rainPositions[i] = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX)
    this.rainPositions[i + 1] = randomY
      ? this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY)
      : this.bounds.maxY
    this.rainPositions[i + 2] = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ)
    this.rainVelocities[index] = 15 + Math.random() * 10
  }

  private resetSnowParticle(index: number, randomY = false) {
    const i = index * 3
    this.snowPositions[i] = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX)
    this.snowPositions[i + 1] = randomY
      ? this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY)
      : this.bounds.maxY
    this.snowPositions[i + 2] = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ)

    this.snowVelocities[index] = {
      x: (Math.random() - 0.5) * 0.5,
      y: 1 + Math.random() * 2,
      z: (Math.random() - 0.5) * 0.3,
      rot: (Math.random() - 0.5) * 2,
    }
  }

  private createRipple(x: number, z: number) {
    const material = this.rippleMaterial.clone()
    const ripple = new THREE.Mesh(this.rippleGeometry, material)
    ripple.rotation.x = -Math.PI / 2
    ripple.position.set(x, 0.01, z)
    ripple.scale.setScalar(0.1)
    this.scene.add(ripple)

    this.ripples.push({ mesh: ripple, life: 0, maxLife: 1 })

    if (this.ripples.length > 100) {
      const old = this.ripples.shift()
      if (old) {
        this.scene.remove(old.mesh)
        const mat = old.mesh.material
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose())
        } else {
          mat.dispose()
        }
      }
    }
  }

  private triggerLightning() {
    this.lightningActive = true
    this.lightningDuration = 0.15 + Math.random() * 0.2

    const x = (Math.random() - 0.5) * 20
    const z = -10 - Math.random() * 20

    this.lightningMesh.position.set(x, 20, z)
    this.lightningMesh.rotation.y = Math.random() * Math.PI
    this.lightningLight.position.set(x, 15, z)

    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    this.drawLightning(ctx, 64, 0, 64, 1024, 20)
    const texture = new THREE.CanvasTexture(canvas)
    ;(this.lightningMesh.material as THREE.MeshBasicMaterial).map = texture
    ;(this.lightningMesh.material as THREE.MeshBasicMaterial).needsUpdate = true

    const material = this.lightningMesh.material as THREE.MeshBasicMaterial
    gsap.fromTo(material, { opacity: 0 }, { opacity: 1, duration: 0.05 })
    gsap.fromTo(
      this.lightningLight,
      { intensity: 0 },
      { intensity: 5, duration: 0.05, yoyo: true, repeat: 1 }
    )

    setTimeout(() => {
      gsap.to(material, { opacity: 0, duration: 0.1 })
      gsap.to(this.lightningLight, { intensity: 0, duration: 0.1 })
      this.lightningActive = false
    }, this.lightningDuration * 1000)

    this.nextLightningTime = 3 + Math.random() * 2
  }

  public setWindSpeed(speed: number) {
    this.windSpeed = speed
  }

  public animate(delta: number, time: number) {
    const positions = this.rainParticles.geometry.attributes.position.array as Float32Array
    const windEffect = this.windSpeed * 0.3

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3
      positions[idx + 1] -= this.rainVelocities[i] * delta
      positions[idx] += windEffect * delta

      if (positions[idx + 1] < this.bounds.minY) {
        if (this.currentWeather === 'rainy' || this.currentWeather === 'thunderstorm') {
          if (Math.random() < 0.1) {
            this.createRipple(positions[idx], positions[idx + 2])
          }
        }
        this.resetRainParticle(i)
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true

    for (let i = 0; i < this.snowCount; i++) {
      const idx = i * 3
      const vel = this.snowVelocities[i]
      positions[idx] += (vel.x + windEffect * 0.3) * delta
      positions[idx + 1] -= vel.y * delta
      positions[idx + 2] += vel.z * delta

      if (positions[idx + 1] < this.bounds.minY) {
        this.resetSnowParticle(i)
      }
    }
    this.snowParticles.geometry.attributes.position.needsUpdate = true

    if (this.currentWeather === 'thunderstorm') {
      this.nextLightningTime -= delta
      if (this.nextLightningTime <= 0 && !this.lightningActive) {
        this.triggerLightning()
      }
    }

    this.ripples.forEach((ripple, index) => {
      ripple.life += delta
      const progress = ripple.life / ripple.maxLife
      const mat = ripple.mesh.material as THREE.MeshBasicMaterial
      ripple.mesh.scale.setScalar(0.1 + progress * 0.8)
      mat.opacity = (1 - progress) * 0.4
    })

    this.ripples = this.ripples.filter((r) => r.life < r.maxLife)
  }

  public dispose() {
    this.rainParticles.geometry.dispose()
    ;(this.rainParticles.material as THREE.Material).dispose()
    this.snowParticles.geometry.dispose()
    ;(this.snowParticles.material as THREE.Material).dispose()
    this.rippleGeometry.dispose()
    this.rippleMaterial.dispose()
    this.lightningMesh.geometry.dispose()
    ;(this.lightningMesh.material as THREE.Material).dispose()
  }
}
