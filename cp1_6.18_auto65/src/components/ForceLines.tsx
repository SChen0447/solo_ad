import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { NodeData, SimParams, ForceLine as ForceLineType } from '../types'
import {
  computeForce,
  applyForcesToVelocities,
  getAttractiveColor,
  getRepulsiveColor,
  getForceLineThickness,
} from '../utils/physics'

const SEGMENTS_PER_LINE = 8
const MAX_FORCE_LINES = 1225

export function ForceLines() {
  const lineSegmentsRef = useRef<THREE.LineSegments>(null)
  const prevPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const lastForceLinesRef = useRef<ForceLineType[]>([])
  const maxForceRef = useRef(1)

  const nodes = useStore((s) => s.nodes)
  const params = useStore((s) => s.params)
  const isDragging = useStore((s) => s.isDragging)
  const selectedNodeIds = useStore((s) => s.selectedNodeIds)
  const updateNodeVelocity = useStore((s) => s.updateNodeVelocity)
  const applyVelocities = useStore((s) => s.applyVelocities)
  const animationTime = useStore((s) => s.animationTime)

  const { geometry, colors } = useMemo(() => {
    const totalVertices = MAX_FORCE_LINES * SEGMENTS_PER_LINE * 2
    const positions = new Float32Array(totalVertices * 3)
    const colorArray = new Float32Array(totalVertices * 3)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    geom.setDrawRange(0, 0)
    return { geometry: geom, colors: colorArray }
  }, [])

  const positions = geometry.attributes.position.array as Float32Array

  useEffect(() => {
    prevPositionsRef.current.clear()
    nodes.forEach((n) => {
      prevPositionsRef.current.set(n.id, n.position.clone())
    })
  }, [])

  useFrame((state, delta) => {
    if (nodes.length < 2) {
      geometry.setDrawRange(0, 0)
      geometry.attributes.position.needsUpdate = true
      return
    }

    const { nodeForces, forceLines } = computeForce(nodes, params)

    if (forceLines.length > 0) {
      const maxF = Math.max(...forceLines.map((l) => l.force))
      maxForceRef.current = THREE.MathUtils.lerp(maxForceRef.current, maxF, 0.1)
    }

    if (!isDragging) {
      const velocityUpdates = applyForcesToVelocities(
        nodes,
        nodeForces,
        delta,
        selectedNodeIds
      )
      velocityUpdates.forEach((vel, id) => {
        updateNodeVelocity(id, vel)
      })
      applyVelocities(delta, 0.985)
    }

    const lerpFactor = isDragging ? 0.4 : 0.2
    const nodePositionMap = new Map<string, THREE.Vector3>()
    nodes.forEach((n) => {
      const prev = prevPositionsRef.current.get(n.id) || n.position.clone()
      const lerped = prev.clone().lerp(n.position, lerpFactor)
      nodePositionMap.set(n.id, lerped)
      prevPositionsRef.current.set(n.id, lerped.clone())
    })

    const activeLineCount = Math.min(forceLines.length, MAX_FORCE_LINES)
    const vertexCount = activeLineCount * SEGMENTS_PER_LINE * 2
    geometry.setDrawRange(0, vertexCount)

    const displayedLines = forceLines.slice(0, activeLineCount)

    for (let lineIdx = 0; lineIdx < displayedLines.length; lineIdx++) {
      const line = displayedLines[lineIdx]
      const startPos = nodePositionMap.get(line.startId) || line.startPos
      const endPos = nodePositionMap.get(line.endId) || line.endPos

      const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5)
      const distance = startPos.distanceTo(endPos)
      const curvature = Math.min(0.15, line.force * 0.02)
      const perpendicular = new THREE.Vector3(
        Math.sin(lineIdx * 1.7 + animationTime * 0.3) * 0.5,
        Math.cos(lineIdx * 2.3 + animationTime * 0.2) * 0.3,
        Math.sin(lineIdx * 1.1 + animationTime * 0.25) * 0.5
      ).normalize().multiplyScalar(distance * curvature)
      const curveControl = midPoint.clone().add(perpendicular)

      let baseColor: THREE.Color
      if (line.isAttractive) {
        baseColor = getAttractiveColor(line.force, maxForceRef.current)
      } else {
        baseColor = getRepulsiveColor(line.force, maxForceRef.current)
      }

      const thickness = getForceLineThickness(line.force, maxForceRef.current)

      for (let seg = 0; seg < SEGMENTS_PER_LINE; seg++) {
        const t0 = seg / SEGMENTS_PER_LINE
        const t1 = (seg + 1) / SEGMENTS_PER_LINE

        const p0 = quadraticBezier(startPos, curveControl, endPos, t0)
        const p1 = quadraticBezier(startPos, curveControl, endPos, t1)

        const flowOffset = (animationTime * 0.5 + lineIdx * 0.07) % 1
        const segT = (seg / SEGMENTS_PER_LINE + flowOffset) % 1
        const pulseAlpha = Math.sin(segT * Math.PI)
        const alpha = 0.25 + pulseAlpha * 0.55 * (line.force / maxForceRef.current)

        const segColor = baseColor.clone().offsetHSL(
          pulseAlpha * 0.05 * (line.isAttractive ? 1 : -1),
          0,
          pulseAlpha * 0.1
        )

        const startVertexIdx = lineIdx * SEGMENTS_PER_LINE * 6 + seg * 6
        positions[startVertexIdx] = p0.x
        positions[startVertexIdx + 1] = p0.y
        positions[startVertexIdx + 2] = p0.z
        positions[startVertexIdx + 3] = p1.x
        positions[startVertexIdx + 4] = p1.y
        positions[startVertexIdx + 5] = p1.z

        colors[startVertexIdx] = segColor.r * alpha
        colors[startVertexIdx + 1] = segColor.g * alpha
        colors[startVertexIdx + 2] = segColor.b * alpha
        colors[startVertexIdx + 3] = segColor.r * alpha
        colors[startVertexIdx + 4] = segColor.g * alpha
        colors[startVertexIdx + 5] = segColor.b * alpha
      }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    lastForceLinesRef.current = forceLines
  })

  return (
    <lineSegments ref={lineSegmentsRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={2}
      />
    </lineSegments>
  )
}

function quadraticBezier(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const invT = 1 - t
  const invTSq = invT * invT
  const tSq = t * t
  return new THREE.Vector3(
    invTSq * p0.x + 2 * invT * t * p1.x + tSq * p2.x,
    invTSq * p0.y + 2 * invT * t * p1.y + tSq * p2.y,
    invTSq * p0.z + 2 * invT * t * p1.z + tSq * p2.z
  )
}
