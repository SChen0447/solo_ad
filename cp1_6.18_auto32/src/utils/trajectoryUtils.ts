import * as THREE from 'three'

export type OrbitType = 'spiral' | 'wave' | 'ring'

export function generateSpiralPath(
  t: number,
  index: number,
  total: number
): THREE.Vector3 {
  const offset = (index / total) * Math.PI * 2
  const angle = t * Math.PI * 4 + offset
  const radius = 3 + t * 2
  const y = (t - 0.5) * 4
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  )
}

export function generateWavePath(
  t: number,
  index: number,
  total: number
): THREE.Vector3 {
  const offset = (index / total) * Math.PI * 2
  const x = (t - 0.5) * 12
  const y = Math.sin(t * Math.PI * 3 + offset) * 2 + Math.cos(offset * 0.5) * 0.5
  const z = Math.cos(t * Math.PI * 2 + offset) * 3
  return new THREE.Vector3(x, y, z)
}

export function generateRingPath(
  t: number,
  index: number,
  total: number
): THREE.Vector3 {
  const offset = (index / total) * Math.PI * 2
  const ringAngle = t * Math.PI * 2 + offset
  const baseRadius = 5
  const wobble = Math.sin(t * Math.PI * 6 + offset) * 0.5
  const x = Math.cos(ringAngle) * (baseRadius + wobble)
  const y = Math.sin(t * Math.PI * 4 + offset) * 1.5
  const z = Math.sin(ringAngle) * (baseRadius + wobble)
  return new THREE.Vector3(x, y, z)
}

export function getOrbitPosition(
  type: OrbitType,
  t: number,
  index: number,
  total: number
): THREE.Vector3 {
  switch (type) {
    case 'spiral':
      return generateSpiralPath(t, index, total)
    case 'wave':
      return generateWavePath(t, index, total)
    case 'ring':
      return generateRingPath(t, index, total)
  }
}

export function lerpOrbitPosition(
  fromType: OrbitType,
  toType: OrbitType,
  progress: number,
  t: number,
  index: number,
  total: number
): THREE.Vector3 {
  const from = getOrbitPosition(fromType, t, index, total)
  const to = getOrbitPosition(toType, t, index, total)
  return from.lerp(to, progress)
}

export function getColorFromProgress(t: number): THREE.Color {
  const colorStart = new THREE.Color(0x6a0dad)
  const colorMid = new THREE.Color(0x4169e1)
  const colorEnd = new THREE.Color(0xff69b4)
  if (t < 0.5) {
    return colorStart.clone().lerp(colorMid, t * 2)
  }
  return colorMid.clone().lerp(colorEnd, (t - 0.5) * 2)
}

export function generateStarfieldPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80
  }
  return positions
}
