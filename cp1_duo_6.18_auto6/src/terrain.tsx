import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useWeatherStore } from './store'

const GRID_SIZE = 40
const TERRAIN_SCALE = 60
const HEIGHT_SCALE = 12

class PerlinNoise {
  private permutation: number[] = []

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed)
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = []
    for (let i = 0; i < 256; i++) p[i] = i
    let s = seed
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647
      const j = s % (i + 1)
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    return [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = this.fade(x)
    const v = this.fade(y)
    const A = this.permutation[X] + Y
    const B = this.permutation[X + 1] + Y
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    )
  }

  octaveNoise2D(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= 2
    }
    return total / maxValue
  }
}

const noise = new PerlinNoise(42)

function getTerrainHeight(x: number, z: number): number {
  const nx = x / TERRAIN_SCALE
  const nz = z / TERRAIN_SCALE
  const base = noise.octaveNoise2D(nx + 100, nz + 100, 5, 0.5)
  const detail = noise.octaveNoise2D(nx * 3 + 200, nz * 3 + 200, 3, 0.5) * 0.3
  return (base + detail) * HEIGHT_SCALE
}

function getTerrainColor(height: number, normalizedHeight: number): THREE.Color {
  const deepGreen = new THREE.Color(0x1a3d1a)
  const green = new THREE.Color(0x3d6b3d)
  const lightGreen = new THREE.Color(0x6b8e4e)
  const brown = new THREE.Color(0x8b7355)
  const gray = new THREE.Color(0xaaaaaa)
  const white = new THREE.Color(0xf5f5f5)

  let color = new THREE.Color()
  if (normalizedHeight < 0.2) {
    color.copy(deepGreen).lerp(green, normalizedHeight / 0.2)
  } else if (normalizedHeight < 0.45) {
    color.copy(green).lerp(lightGreen, (normalizedHeight - 0.2) / 0.25)
  } else if (normalizedHeight < 0.65) {
    color.copy(lightGreen).lerp(brown, (normalizedHeight - 0.45) / 0.2)
  } else if (normalizedHeight < 0.85) {
    color.copy(brown).lerp(gray, (normalizedHeight - 0.65) / 0.2)
  } else {
    color.copy(gray).lerp(white, (normalizedHeight - 0.85) / 0.15)
  }
  return color
}

export default function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const setTerrainHeightFn = useWeatherStore((state) => state.setTerrainHeightFn)

  useEffect(() => {
    setTerrainHeightFn(getTerrainHeight)
  }, [setTerrainHeightFn])

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SCALE * 2, TERRAIN_SCALE * 2, GRID_SIZE, GRID_SIZE)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const colors = new Float32Array(positions.count * 3)
    let minH = Infinity
    let maxH = -Infinity

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const h = getTerrainHeight(x, z)
      positions.setY(i, h)
      minH = Math.min(minH, h)
      maxH = Math.max(maxH, h)
    }

    const range = maxH - minH || 1
    for (let i = 0; i < positions.count; i++) {
      const h = positions.getY(i)
      const normalized = (h - minH) / range
      const color = getTerrainColor(h, normalized)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    return geo
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const distance = state.camera.position.length()
    const material = meshRef.current.material as THREE.MeshStandardMaterial
    const lodLevel = Math.min(1, Math.max(0, (distance - 20) / 80))
    material.roughness = 0.7 + lodLevel * 0.2
    material.metalness = 0.1 - lodLevel * 0.05
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        const pos = e.point
        setTimeout(() => {
          useWeatherStore.getState().addLightning([pos.x, pos.y, pos.z])
          useWeatherStore.getState().addShockwave([pos.x, pos.y, pos.z])
        }, 1000)
      }}
    >
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        flatShading={false}
        roughness={0.8}
        metalness={0.05}
      />
    </mesh>
  )
}

export { getTerrainHeight }
