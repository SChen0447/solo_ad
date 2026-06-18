import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS, GRID_WIDTH, GRID_HEIGHT } from '../types'
import { temperatureToColor } from '../weatherEngine'
import { useAppStore } from '../store'

interface TemperatureOverlayProps {
  temperatureGrid: number[][]
}

export function TemperatureOverlay({ temperatureGrid }: TemperatureOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const transitionProgress = useAppStore((state) => state.transitionProgress)

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = GRID_WIDTH
    canvas.height = GRID_HEIGHT
    const ctx = canvas.getContext('2d')!

    for (let j = 0; j < GRID_HEIGHT; j++) {
      for (let i = 0; i < GRID_WIDTH; i++) {
        const temp = temperatureGrid[j]?.[i] || 0
        const [r, g, b] = temperatureToColor(temp)
        ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.6)`
        ctx.fillRect(i, j, 1, 1)
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.needsUpdate = true
    return tex
  }, [temperatureGrid])

  const contourTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = GRID_WIDTH * 2
    canvas.height = GRID_HEIGHT * 2
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let j = 1; j < GRID_HEIGHT - 1; j++) {
      for (let i = 1; i < GRID_WIDTH - 1; i++) {
        const temp = temperatureGrid[j]?.[i] || 0

        for (let level = -40; level <= 40; level += 5) {
          const prevTemp = temperatureGrid[j]?.[i - 1] || 0
          const nextTemp = temperatureGrid[j]?.[i + 1] || 0
          const upTemp = temperatureGrid[j - 1]?.[i] || 0
          const downTemp = temperatureGrid[j + 1]?.[i] || 0

          const crosses =
            (temp - level) * (prevTemp - level) < 0 ||
            (temp - level) * (nextTemp - level) < 0 ||
            (temp - level) * (upTemp - level) < 0 ||
            (temp - level) * (downTemp - level) < 0

          if (crosses) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
            ctx.fillRect(i * 2, j * 2, 2, 2)
            break
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    return tex
  }, [temperatureGrid])

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.005, 64, 64]} />
        <meshBasicMaterial
          map={texture}
          transparent={true}
          opacity={0.5 * transitionProgress}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.008, 64, 64]} />
        <meshBasicMaterial
          map={contourTexture}
          transparent={true}
          opacity={0.4 * transitionProgress}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
