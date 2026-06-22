import * as THREE from 'three'

export interface GalaxyData {
  positions: Float32Array
  velocities: Float32Array
  colors: Float32Array
  sizes: Float32Array
  count: number
}

export class Galaxy {
  public points: THREE.Points
  public data: GalaxyData
  public particleCount: number
  public center: THREE.Vector3
  public material: THREE.PointsMaterial
  public geometry: THREE.BufferGeometry

  constructor(
    particleCount: number = 5000,
    center: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    rotation: number = 0,
    hueShift: number = 0
  ) {
    this.particleCount = particleCount
    this.center = center.clone()

    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    const arms = 4
    const armSpread = 0.4
    const spiralTightness = 0.8
    const maxRadius = 6

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      const armIndex = Math.floor(Math.random() * arms)
      const armAngle = (armIndex / arms) * Math.PI * 2 + rotation

      const radiusFactor = Math.pow(Math.random(), 0.7)
      const radius = radiusFactor * maxRadius

      const spiralAngle = radius * spiralTightness + armAngle
      const spread = armSpread * (1 - radiusFactor * 0.5)

      const angleOffset = (Math.random() - 0.5) * spread
      const finalAngle = spiralAngle + angleOffset

      const radialOffset = (Math.random() - 0.5) * 0.5 * (1 + radiusFactor * 0.5)
      const finalRadius = radius + radialOffset

      const x = Math.cos(finalAngle) * finalRadius
      const y = (Math.random() - 0.5) * 0.3 * (1 - radiusFactor * 0.8)
      const z = Math.sin(finalAngle) * finalRadius

      positions[i3] = x + center.x
      positions[i3 + 1] = y + center.y
      positions[i3 + 2] = z + center.z

      const dir = new THREE.Vector3(-Math.sin(finalAngle), 0, Math.cos(finalAngle))
      const speed = 0.4 + (1 - radiusFactor) * 1.5
      velocities[i3] = dir.x * speed
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 2] = dir.z * speed

      const t = radius / maxRadius
      const hue = 0.65 + hueShift + (Math.random() - 0.5) * 0.1 - t * 0.15
      const saturation = 0.7 + Math.random() * 0.3
      const lightness = 0.4 + (1 - t) * 0.3 + Math.random() * 0.2

      const color = new THREE.Color().setHSL(
        Math.min(Math.max(hue, 0.55), 0.85),
        saturation,
        Math.min(lightness, 0.8)
      )
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = 0.01 + Math.random() * 0.04
    }

    this.data = { positions, velocities, colors, sizes, count: particleCount }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, this.material)
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = opacity
  }

  public updatePositionsFromData(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    posAttr.array.set(this.data.positions)
    posAttr.needsUpdate = true
  }

  public getCenter(): THREE.Vector3 {
    let cx = 0, cy = 0, cz = 0
    for (let i = 0; i < this.particleCount; i++) {
      cx += this.data.positions[i * 3]
      cy += this.data.positions[i * 3 + 1]
      cz += this.data.positions[i * 3 + 2]
    }
    return new THREE.Vector3(
      cx / this.particleCount,
      cy / this.particleCount,
      cz / this.particleCount
    )
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
