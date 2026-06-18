import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../store'
import { StreamLine, STREAMLINE_POINTS } from '../types'

interface WindFieldProps {
  streamLines: StreamLine[]
}

export function WindField({ streamLines }: WindFieldProps) {
  const linesRef = useRef<THREE.Group>(null)
  const transitionProgress = useAppStore((state) => state.transitionProgress)

  const lineObjects = useMemo(() => {
    const group = new THREE.Group()

    streamLines.forEach((line, idx) => {
      if (line.points.length < 2) return

      const points: THREE.Vector3[] = []
      line.points.forEach((p) => {
        points.push(new THREE.Vector3(p.x, p.y, p.z))
      })

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const color = new THREE.Color(line.color)

      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8 * transitionProgress
      })

      const lineObj = new THREE.Line(geometry, material)
      lineObj.userData = { speed: line.speed, baseOpacity: 0.8 }
      group.add(lineObj)

      if (points.length > 1) {
        const lastIdx = points.length - 1
        const dir = new THREE.Vector3()
          .subVectors(points[lastIdx], points[Math.max(0, lastIdx - 1)])
          .normalize()

        const arrowGeom = new THREE.ConeGeometry(0.01, 0.04, 6)
        const arrowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9 * transitionProgress
        })
        const arrow = new THREE.Mesh(arrowGeom, arrowMat)
        arrow.position.copy(points[lastIdx])
        arrow.lookAt(points[lastIdx].clone().add(dir))
        arrow.rotateX(Math.PI / 2)
        arrow.userData = { parentIdx: idx }
        group.add(arrow)
      }
    })

    return group
  }, [streamLines, transitionProgress])

  useFrame((state) => {
    if (!linesRef.current) return
    const time = state.clock.elapsedTime

    linesRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Line) {
        const speed = child.userData.speed || 5
        const material = child.material as THREE.LineBasicMaterial
        const pulse = 0.6 + Math.sin(time * 1.5 + i * 0.3) * 0.2
        material.opacity = (child.userData.baseOpacity || 0.8) * pulse * transitionProgress
      }
    })
  })

  return <primitive object={lineObjects} ref={linesRef} />
}
