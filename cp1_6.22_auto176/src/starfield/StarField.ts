import * as THREE from 'three'
import { Star, STARS } from '../services/starData'

export interface StarFieldOptions {
  radius?: number
  starCount?: number
  backgroundColor?: number
}

export interface StarData {
  id: number
  position: THREE.Vector3
  brightness: number
  colorTemp: number
}

export class StarField {
  private scene: THREE.Scene
  private starsGeometry: THREE.BufferGeometry
  private starsMaterial: THREE.PointsMaterial
  private stars: THREE.Points
  private galaxyGeometry: THREE.BufferGeometry
  private galaxyMaterial: THREE.PointsMaterial
  private galaxyParticles: THREE.Points
  private atmosphereMesh: THREE.Mesh
  private group: THREE.Group
  private radius: number
  private starCount: number
  private starDataList: StarData[] = []
  private latitude: number = 30
  private time: number = 22
  private date: string = '2024-06-21'
  private backgroundBrightness: number = 1.0
  private showGalaxy: boolean = true

  constructor(scene: THREE.Scene, options: StarFieldOptions = {}) {
    this.scene = scene
    this.radius = options.radius || 800
    this.starCount = options.starCount || 2000

    this.group = new THREE.Group()

    this.starsGeometry = new THREE.BufferGeometry()
    this.starsMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      depthWrite: false,
    })
    this.stars = new THREE.Points(this.starsGeometry, this.starsMaterial)
    this.group.add(this.stars)

    this.galaxyGeometry = new THREE.BufferGeometry()
    this.galaxyMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      color: 0xaaaaee,
      depthWrite: false,
    })
    this.galaxyParticles = new THREE.Points(this.galaxyGeometry, this.galaxyMaterial)
    this.group.add(this.galaxyParticles)

    this.createAtmosphere()
    this.createStars()
    this.createGalaxyParticles()

    this.scene.add(this.group)

    this.updateStarPositions()
  }

  private createAtmosphere(): void {
    const geometry = new THREE.SphereGeometry(this.radius * 0.999, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1a2e) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 1.0), 1.0);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
    })

    this.atmosphereMesh = new THREE.Mesh(geometry, material)
    this.group.add(this.atmosphereMesh)
  }

  private tempToColor(temp: number): THREE.Color {
    const t = (temp - 3000) / (25000 - 3000)
    const clampedT = Math.max(0, Math.min(1, t))

    const blueWhite = new THREE.Color(0xadd8e6)
    const redOrange = new THREE.Color(0xffa07a)

    const color = new THREE.Color()
    color.lerpColors(redOrange, blueWhite, clampedT)

    return color
  }

  private brightnessToSize(brightness: number): number {
    const size = 4.0 - (brightness + 2) * 0.6
    return Math.max(0.5, Math.min(4.0, size))
  }

  private raDecToXYZ(ra: number, dec: number): THREE.Vector3 {
    const raRad = (ra / 24) * Math.PI * 2 - Math.PI / 2
    const decRad = (dec / 180) * Math.PI

    const x = this.radius * Math.cos(decRad) * Math.cos(raRad)
    const y = this.radius * Math.sin(decRad)
    const z = this.radius * Math.cos(decRad) * Math.sin(raRad)

    return new THREE.Vector3(x, y, z)
  }

  private createStars(): void {
    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []

    const starsToUse = STARS.slice(0, this.starCount)

    for (const star of starsToUse) {
      const pos = this.raDecToXYZ(star.ra, star.dec)
      const color = this.tempToColor(star.colorTemp)
      const size = this.brightnessToSize(star.brightness)

      this.starDataList.push({
        id: star.id,
        position: pos.clone(),
        brightness: star.brightness,
        colorTemp: star.colorTemp,
      })

      positions.push(pos.x, pos.y, pos.z)
      colors.push(color.r, color.g, color.b)
      sizes.push(size)
    }

    this.starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))
  }

  private createGalaxyParticles(): void {
    const positions: number[] = []
    const count = 200

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = (Math.random() - 0.5) * Math.PI * 0.8
      const r = this.radius * (0.9 + Math.random() * 0.1)

      const x = r * Math.cos(phi) * Math.cos(theta)
      const y = r * Math.sin(phi)
      const z = r * Math.cos(phi) * Math.sin(theta)

      positions.push(x, y, z)
    }

    this.galaxyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  }

  private calculateSiderealTime(): number {
    const d = new Date(this.date)
    const j2000 = new Date('2000-01-01T12:00:00Z')
    const daysSinceJ2000 = (d.getTime() - j2000.getTime()) / (1000 * 60 * 60 * 24)

    let gst = 18.697374558 + 24.06570982441908 * daysSinceJ2000
    gst += this.time
    gst = gst % 24
    if (gst < 0) gst += 24

    return gst
  }

  updateStarPositions(): void {
    const siderealTime = this.calculateSiderealTime()
    const rotYAngle = -(siderealTime / 24) * Math.PI * 2
    const latRad = (this.latitude / 180) * Math.PI
    const rotXAngle = latRad - Math.PI / 2

    const positions = this.starsGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < this.starDataList.length; i++) {
      const star = this.starDataList[i]
      const originalPos = this.raDecToXYZ(
        STARS.find((s) => s.id === star.id)!.ra,
        STARS.find((s) => s.id === star.id)!.dec
      )

      const cosY = Math.cos(rotYAngle)
      const sinY = Math.sin(rotYAngle)
      const x1 = originalPos.x * cosY + originalPos.z * sinY
      const y1 = originalPos.y
      const z1 = -originalPos.x * sinY + originalPos.z * cosY

      const cosX = Math.cos(rotXAngle)
      const sinX = Math.sin(rotXAngle)
      const x2 = x1
      const y2 = y1 * cosX - z1 * sinX
      const z2 = y1 * sinX + z1 * cosX

      const idx = i * 3
      positions[idx] = x2
      positions[idx + 1] = y2
      positions[idx + 2] = z2

      star.position.set(x2, y2, z2)
    }

    this.starsGeometry.attributes.position.needsUpdate = true

    this.updateGalaxyPositions(rotYAngle, rotXAngle)
  }

  private updateGalaxyPositions(rotYAngle: number, rotXAngle: number): void {
    const positions = this.galaxyGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]

      const cosY = Math.cos(rotYAngle + Math.PI / 4)
      const sinY = Math.sin(rotYAngle + Math.PI / 4)
      const x1 = x * cosY + z * sinY
      const y1 = y
      const z1 = -x * sinY + z * cosY

      const cosX = Math.cos(rotXAngle)
      const sinX = Math.sin(rotXAngle)
      const x2 = x1
      const y2 = y1 * cosX - z1 * sinX
      const z2 = y1 * sinX + z1 * cosX

      positions[i] = x2
      positions[i + 1] = y2
      positions[i + 2] = z2
    }

    this.galaxyGeometry.attributes.position.needsUpdate = true
  }

  setLatitude(latitude: number): void {
    this.latitude = latitude
    this.updateStarPositions()
  }

  setTime(time: number): void {
    this.time = time
    this.updateStarPositions()
  }

  setDate(date: string): void {
    this.date = date
    this.updateStarPositions()
  }

  getLatitude(): number {
    return this.latitude
  }

  getTime(): number {
    return this.time
  }

  getDate(): string {
    return this.date
  }

  setBackgroundBrightness(brightness: number): void {
    this.backgroundBrightness = Math.max(0.2, Math.min(1.0, brightness))

    const bgColor = new THREE.Color(0x0a0a1a)
    bgColor.multiplyScalar(this.backgroundBrightness)
    this.scene.background = bgColor

    const atmoMat = this.atmosphereMesh.material as THREE.ShaderMaterial
    atmoMat.uniforms.topColor.value.copy(bgColor)
  }

  getBackgroundBrightness(): number {
    return this.backgroundBrightness
  }

  setStarCount(count: number): void {
    this.starCount = count
    this.starDataList = []

    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []

    const starsToUse = STARS.slice(0, Math.min(count, STARS.length))

    for (const star of starsToUse) {
      const pos = this.raDecToXYZ(star.ra, star.dec)
      const color = this.tempToColor(star.colorTemp)
      const size = this.brightnessToSize(star.brightness)

      this.starDataList.push({
        id: star.id,
        position: pos.clone(),
        brightness: star.brightness,
        colorTemp: star.colorTemp,
      })

      positions.push(pos.x, pos.y, pos.z)
      colors.push(color.r, color.g, color.b)
      sizes.push(size)
    }

    this.starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    this.updateStarPositions()
  }

  getStarCount(): number {
    return this.starCount
  }

  setShowGalaxy(show: boolean): void {
    this.showGalaxy = show
    this.galaxyParticles.visible = show
  }

  getShowGalaxy(): boolean {
    return this.showGalaxy
  }

  getStarById(id: number): StarData | undefined {
    return this.starDataList.find((s) => s.id === id)
  }

  getGroup(): THREE.Group {
    return this.group
  }

  getRadius(): number {
    return this.radius
  }

  getStarMesh(): THREE.Points {
    return this.stars
  }

  dispose(): void {
    this.starsGeometry.dispose()
    this.starsMaterial.dispose()
    this.galaxyGeometry.dispose()
    this.galaxyMaterial.dispose()
    this.atmosphereMesh.geometry.dispose()
    ;(this.atmosphereMesh.material as THREE.Material).dispose()
    this.scene.remove(this.group)
  }
}
