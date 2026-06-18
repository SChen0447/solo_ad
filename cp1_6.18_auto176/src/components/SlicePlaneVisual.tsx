import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../store'
import { EARTH_RADIUS, GRID_WIDTH, GRID_HEIGHT } from '../types'
import { temperatureToColor } from '../weatherEngine'

export function SlicePlaneVisual() {
  const meshRef = useRef<THREE.Mesh>(null)
  const planeGroupRef = useRef<THREE.Group>(null)
  const slicePlane = useAppStore((state) => state.slicePlane)
  const temperatureGrid = useAppStore((state) => state.temperatureGrid)

  const planeSize = EARTH_RADIUS * 2.5

  const sliceTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const nx = (x / 127) * 2 - 1
        const ny = (y / 127) * 2 - 1
        const dist = Math.sqrt(nx * nx + ny * ny)

        if (dist <= 1) {
          const angle = Math.atan2(ny, nx)
          const lat = 90 - (angle / Math.PI) * 180 * (slicePlane.height / 10)
          const lon = dist * 180

          const gridX = Math.floor(((lon + 180) / 360) * GRID_WIDTH)
          const gridY = Math.floor(((90 - lat) / 180) * GRID_HEIGHT)

          const gx = Math.max(0, Math.min(GRID_WIDTH - 1, gridX))
          const gy = Math.max(0, Math.min(GRID_HEIGHT - 1, gridY))

          const temp = temperatureGrid[gy]?.[gx] || 0
          const [r, g, b] = temperatureToColor(temp)

          const edgeFade = 1 - Math.pow(dist, 3)
          ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${0.6 * edgeFade})`
          ctx.fillRect(x, y, 1, 1)
        } else {
          ctx.clearRect(x, y, 1, 1)
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [temperatureGrid, slicePlane.height])

  useFrame(() => {
    if (planeGroupRef.current) {
      const heightNorm = slicePlane.height / 10
      const radius = EARTH_RADIUS * (1 + heightNorm * 0.3)
      planeGroupRef.current.position.y = 0
      planeGroupRef.current.rotation.x = (slicePlane.rotationX * Math.PI) / 180
      planeGroupRef.current.rotation.y = (slicePlane.rotationY * Math.PI) / 180
    }
  })

  if (!slicePlane.enabled) return null

  return (
    <group ref={planeGroupRef}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <planeGeometry args={[planeSize, planeSize, 1, 1]} />
        <meshBasicMaterial
          map={sliceTexture}
          transparent={true}
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[planeSize * 0.49, planeSize * 0.5, 64]} />
        <meshBasicMaterial
          color={0x44aaff}
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
