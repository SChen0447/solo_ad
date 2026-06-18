import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MatchingEngine } from '../engine/MatchingEngine'

export interface LoadedFragmentData {
  geometry: THREE.BufferGeometry
  edgePoints: THREE.Vector3[]
  curvatures: number[]
  thumbnail: string
}

export async function loadOBJFile(
  file: File
): Promise<LoadedFragmentData> {
  const text = await file.text()

  const loader = new OBJLoader()
  const object = loader.parse(text)

  let geometry: THREE.BufferGeometry | null = null

  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && !geometry) {
      const mesh = child as THREE.Mesh
      geometry = mesh.geometry.clone()
    }
  })

  if (!geometry) {
    geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const pos = mesh.geometry.attributes.position
        if (pos) {
          for (let i = 0; i < pos.count; i++) {
            positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
          }
        }
      }
    })
    if (positions.length > 0) {
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      )
    }
  }

  geometry.center()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  const bbox = geometry.boundingBox
  if (bbox) {
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scale = 3 / maxDim
      geometry.scale(scale, scale, scale)
      geometry.center()
    }
  }

  const { edgePoints, curvatures } =
    MatchingEngine.extractEdgesAndCurvatures(geometry)

  const thumbnail = generateThumbnail(geometry)

  return {
    geometry,
    edgePoints,
    curvatures,
    thumbnail
  }
}

function generateThumbnail(geometry: THREE.BufferGeometry): string {
  const width = 128
  const height = 128

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  const positions = geometry.attributes.position
  if (!positions || positions.count < 3) {
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('无数据', width / 2, height / 2)
    return canvas.toDataURL()
  }

  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox!
  const center = new THREE.Vector3()
  bbox.getCenter(center)
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)

  const padding = 10
  const scale = (width - padding * 2) / maxDim

  const projectedPoints: { x: number; y: number; z: number }[] = []

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) - center.x
    const y = positions.getY(i) - center.y
    const z = positions.getZ(i) - center.z

    const angle = Math.PI / 6
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const rotX = x * cosA - z * sinA
    const rotZ = x * sinA + z * cosA

    const projX = width / 2 + rotX * scale
    const projY = height / 2 - y * scale + rotZ * scale * 0.3

    projectedPoints.push({ x: projX, y: projY, z: positions.getZ(i) })
  }

  const indices = geometry.index
  if (indices) {
    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i)
      const i1 = indices.getX(i + 1)
      const i2 = indices.getX(i + 2)

      if (
        i0 >= projectedPoints.length ||
        i1 >= projectedPoints.length ||
        i2 >= projectedPoints.length
      )
        continue

      const p0 = projectedPoints[i0]
      const p1 = projectedPoints[i1]
      const p2 = projectedPoints[i2]

      const avgZ = (p0.z + p1.z + p2.z) / 3
      const normalizedZ = (avgZ - bbox.min.z) / (bbox.max.z - bbox.min.z + 0.001)
      const brightness = Math.floor(100 + normalizedZ * 100)

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.closePath()
      ctx.fillStyle = `rgb(${brightness + 20}, ${brightness - 10}, ${brightness - 40})`
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 200, 150, 0.15)`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  } else {
    for (let i = 0; i < projectedPoints.length; i += 3) {
      const p0 = projectedPoints[i]
      const p1 = projectedPoints[i + 1]
      const p2 = projectedPoints[i + 2]
      if (!p0 || !p1 || !p2) continue

      const avgZ = (p0.z + p1.z + p2.z) / 3
      const normalizedZ = (avgZ - bbox.min.z) / (bbox.max.z - bbox.min.z + 0.001)
      const brightness = Math.floor(100 + normalizedZ * 100)

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.closePath()
      ctx.fillStyle = `rgb(${brightness + 20}, ${brightness - 10}, ${brightness - 40})`
      ctx.fill()
    }
  }

  return canvas.toDataURL()
}

export function validateOBJFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 20 * 1024 * 1024

  if (!file.name.toLowerCase().endsWith('.obj')) {
    return { valid: false, error: '仅支持 OBJ 格式文件' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: `文件大小不能超过 20MB (当前: ${(file.size / 1024 / 1024).toFixed(2)}MB)` }
  }

  if (file.size === 0) {
    return { valid: false, error: '文件为空' }
  }

  return { valid: true }
}
