import * as THREE from 'three'

export interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
}

export function generateSpiralPositions(
  count: number,
  radius: number,
  arms: number = 3
): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const armIndex = i % arms
    const armAngle = (armIndex / arms) * Math.PI * 2
    const t = i / count
    const angle = t * Math.PI * 4 + armAngle
    const r = Math.random() * radius * 0.9 + radius * 0.1
    const spiralFactor = t * 0.8

    const x = Math.cos(angle + spiralFactor) * r * (0.5 + Math.random() * 0.5)
    const z = Math.sin(angle + spiralFactor) * r * (0.5 + Math.random() * 0.5)
    const y = (Math.random() - 0.5) * radius * 0.4 + Math.sin(t * Math.PI * 2) * radius * 0.1

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  return positions
}

export function generateSphericalPositions(
  count: number,
  radius: number
): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.pow(Math.random(), 0.5) * radius

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }

  return positions
}

export function lerpColor(
  color1: THREE.Color,
  color2: THREE.Color,
  t: number
): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t)
}

export function generateParticleColors(
  positions: Float32Array,
  radius: number,
  colorMix: number = 0.5
): Float32Array {
  const count = positions.length / 3
  const colors = new Float32Array(count * 3)
  const warmColor = new THREE.Color(0xff6b35)
  const coolColor = new THREE.Color(0x6b46c1)

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    const dist = Math.sqrt(x * x + y * y + z * z)
    const t = Math.min(dist / radius, 1)

    const adjustedT = t * (1 - colorMix * 0.3) + colorMix * 0.2
    const color = lerpColor(warmColor, coolColor, Math.min(Math.max(adjustedT, 0), 1))

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return colors
}

export function generateParticleSizes(
  count: number,
  minSize: number = 0.02,
  maxSize: number = 0.1
): Float32Array {
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    sizes[i] = minSize + Math.random() * (maxSize - minSize)
  }
  return sizes
}

export function generateParticleAlphas(
  positions: Float32Array,
  radius: number
): Float32Array {
  const count = positions.length / 3
  const alphas = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    const dist = Math.sqrt(x * x + y * y + z * z)
    const t = dist / radius
    alphas[i] = 1 - t * 0.7
  }

  return alphas
}

export function createRaycaster(): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  raycaster.params.Points.threshold = 0.3
  return raycaster
}

export function getMousePosition(
  event: MouseEvent,
  container: HTMLElement
): THREE.Vector2 {
  const rect = container.getBoundingClientRect()
  const mouse = new THREE.Vector2()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  return mouse
}

export function findNearestParticle(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  mouse: THREE.Vector2,
  points: THREE.Points,
  threshold: number = 0.3
): number {
  raycaster.setFromCamera(mouse, camera)
  const ray = raycaster.ray
  const geometry = points.geometry
  const positions = geometry.attributes.position.array as Float32Array

  const worldMatrix = points.matrixWorld
  const worldPosition = new THREE.Vector3()

  let nearestIndex = -1
  let nearestDist = Infinity

  for (let i = 0; i < positions.length / 3; i++) {
    worldPosition.set(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2]
    )
    worldPosition.applyMatrix4(worldMatrix)

    const dist = ray.distanceToPoint(worldPosition)

    if (dist < nearestDist && dist < threshold) {
      nearestDist = dist
      nearestIndex = i
    }
  }

  return nearestIndex
}

export function findParticlesInRadius(
  positions: Float32Array,
  centerIndex: number,
  radius: number
): number[] {
  const indices: number[] = []
  const cx = positions[centerIndex * 3]
  const cy = positions[centerIndex * 3 + 1]
  const cz = positions[centerIndex * 3 + 2]

  for (let i = 0; i < positions.length / 3; i++) {
    if (i === centerIndex) continue
    const dx = positions[i * 3] - cx
    const dy = positions[i * 3 + 1] - cy
    const dz = positions[i * 3 + 2] - cz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist <= radius) {
      indices.push(i)
    }
  }

  return indices
}
