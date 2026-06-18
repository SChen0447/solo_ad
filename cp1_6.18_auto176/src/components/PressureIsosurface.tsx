import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EARTH_RADIUS, GRID_WIDTH, GRID_HEIGHT } from '../types'
import { pressureToColor } from '../weatherEngine'
import { useAppStore } from '../store'

interface PressureIsosurfaceProps {
  pressureGrid: number[][]
}

export function PressureIsosurface({ pressureGrid }: PressureIsosurfaceProps) {
  const meshRef = useRef<THREE.Points>(null)
  const transitionProgress = useAppStore((state) => state.transitionProgress)

  const isosurfaces = useMemo(() => {
    const group = new THREE.Group()
    const isovalues = [990, 1000, 1010, 1020, 1030]

    isovalues.forEach((isovalue, levelIdx) => {
      const positions: number[] = []
      const colors: number[] = []

      for (let j = 0; j < GRID_HEIGHT - 1; j++) {
        for (let i = 0; i < GRID_WIDTH - 1; i++) {
          const p00 = pressureGrid[j]?.[i] || 1013
          const p10 = pressureGrid[j]?.[i + 1] || 1013
          const p01 = pressureGrid[j + 1]?.[i] || 1013
          const p11 = pressureGrid[j + 1]?.[i + 1] || 1013

          const avgP = (p00 + p10 + p01 + p11) / 4
          const deviation = Math.abs(avgP - isovalue)

          if (deviation < 2.5) {
            const lat = 90 - (j / (GRID_HEIGHT - 1)) * 180
            const lon = -180 + (i / (GRID_WIDTH - 1)) * 360

            const heightOffset = 0.02 + levelIdx * 0.015

            const phi = (90 - lat) * (Math.PI / 180)
            const theta = (lon + 180) * (Math.PI / 180)
            const r = EARTH_RADIUS * (1 + heightOffset)

            const x = -r * Math.sin(phi) * Math.cos(theta)
            const y = r * Math.cos(phi)
            const z = r * Math.sin(phi) * Math.sin(theta)

            positions.push(x, y, z)

            const color = pressureToColor(avgP)
            colors.push(color[0], color[1], color[2])
          }
        }
      }

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

        const material = new THREE.PointsMaterial({
          size: 0.03,
          vertexColors: true,
          transparent: true,
          opacity: 0.7 * transitionProgress,
          sizeAttenuation: true
        })

        const points = new THREE.Points(geometry, material)
        points.userData = { baseOpacity: 0.7, level: levelIdx }
        group.add(points)
      }
    })

    return group
  }, [pressureGrid, transitionProgress])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    meshRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Points) {
        const material = child.material as THREE.PointsMaterial
        const pulse = 0.7 + Math.sin(time * 0.8 + i * 0.5) * 0.3
        material.opacity = (child.userData.baseOpacity || 0.7) * pulse * transitionProgress
      }
    })
  })

  return <primitive object={isosurfaces} ref={meshRef} />
}
