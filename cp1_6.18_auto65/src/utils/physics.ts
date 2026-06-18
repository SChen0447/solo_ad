import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import type { NodeData, SimParams, ForceLine, NodeForceResult, PhysicsResult } from '../types'

const MIN_DISTANCE = 0.4
const FORCE_LINE_THRESHOLD = 0.05

export function computeForce(
  nodes: NodeData[],
  params: SimParams
): PhysicsResult {
  const { gravityConstant, repulsionCoefficient, gridResolution } = params
  const nodeForces: NodeForceResult[] = nodes.map((n) => ({
    nodeId: n.id,
    force: new THREE.Vector3(),
  }))
  const forceLines: ForceLine[] = []

  if (nodes.length < 2) {
    return { nodeForces, forceLines }
  }

  const maxLines = Math.floor((gridResolution * (gridResolution - 1)) / 2)
  const potentialLines: Array<{ line: ForceLine; magnitude: number }> = []

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]

      const diff = new THREE.Vector3().subVectors(b.position, a.position)
      const distSq = Math.max(diff.lengthSq(), MIN_DISTANCE * MIN_DISTANCE)
      const dist = Math.sqrt(distSq)
      const dir = diff.clone().normalize()

      const gravityForceMag = (gravityConstant * a.mass * b.mass) / distSq
      const chargeProduct = a.charge * b.charge
      const repulsionForceMag = chargeProduct !== 0
        ? (repulsionCoefficient * chargeProduct) / distSq
        : 0

      const totalForceMag = gravityForceMag - repulsionForceMag
      const isAttractive = totalForceMag > 0
      const magnitude = Math.abs(totalForceMag)

      const forceVec = dir.clone().multiplyScalar(totalForceMag)

      nodeForces[i].force.add(forceVec)
      nodeForces[j].force.sub(forceVec)

      if (magnitude >= FORCE_LINE_THRESHOLD) {
        const line: ForceLine = {
          id: uuidv4(),
          startId: a.id,
          endId: b.id,
          startPos: a.position.clone(),
          endPos: b.position.clone(),
          force: magnitude,
          isAttractive,
        }
        potentialLines.push({ line, magnitude })
      }
    }
  }

  potentialLines.sort((a, b) => b.magnitude - a.magnitude)
  const selectedCount = Math.min(potentialLines.length, maxLines)
  for (let i = 0; i < selectedCount; i++) {
    forceLines.push(potentialLines[i].line)
  }

  return { nodeForces, forceLines }
}

export function applyForcesToVelocities(
  nodes: NodeData[],
  nodeForces: NodeForceResult[],
  deltaTime: number,
  draggedNodeIds: Set<string> = new Set()
): Map<string, THREE.Vector3> {
  const velocityUpdates = new Map<string, THREE.Vector3>()

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (draggedNodeIds.has(node.id)) continue

    const forceResult = nodeForces.find((nf) => nf.nodeId === node.id)
    if (!forceResult) continue

    const massFactor = Math.abs(node.mass) > 0 ? 1 / Math.abs(node.mass) : 0.8
    const deltaV = forceResult.force.clone().multiplyScalar(deltaTime * massFactor * 0.5)
    const clampedDelta = deltaV.length() > 2
      ? deltaV.normalize().multiplyScalar(2)
      : deltaV

    velocityUpdates.set(node.id, node.velocity.clone().add(clampedDelta))
  }

  return velocityUpdates
}

export function generateGridSamplePoints(
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  resolution: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const step = new THREE.Vector3(
    (bounds.max.x - bounds.min.x) / resolution,
    (bounds.max.y - bounds.min.y) / resolution,
    (bounds.max.z - bounds.min.z) / resolution
  )

  for (let x = 0; x <= resolution; x++) {
    for (let y = 0; y <= resolution; y++) {
      for (let z = 0; z <= resolution; z++) {
        points.push(
          new THREE.Vector3(
            bounds.min.x + step.x * x,
            bounds.min.y + step.y * y,
            bounds.min.z + step.z * z
          )
        )
      }
    }
  }

  return points
}

export function sampleFieldAtPoint(
  point: THREE.Vector3,
  nodes: NodeData[],
  params: SimParams
): THREE.Vector3 {
  const { gravityConstant, repulsionCoefficient } = params
  const field = new THREE.Vector3()

  for (const node of nodes) {
    const diff = new THREE.Vector3().subVectors(node.position, point)
    const distSq = Math.max(diff.lengthSq(), MIN_DISTANCE * MIN_DISTANCE)
    const dir = diff.clone().normalize()

    const gravityContrib = dir.clone().multiplyScalar(
      (gravityConstant * node.mass) / distSq
    )
    field.add(gravityContrib)

    if (node.charge !== 0) {
      const repulsionContrib = dir.clone().multiplyScalar(
        (-repulsionCoefficient * node.charge) / distSq
      )
      field.add(repulsionContrib)
    }
  }

  return field
}

export function getAttractiveColor(force: number, maxForce: number): THREE.Color {
  const t = Math.min(force / maxForce, 1)
  const color = new THREE.Color()
  color.setHSL(0.02 + t * 0.1, 1, 0.45 + t * 0.2)
  return color
}

export function getRepulsiveColor(force: number, maxForce: number): THREE.Color {
  const t = Math.min(force / maxForce, 1)
  const color = new THREE.Color()
  color.setHSL(0.6 + t * 0.15, 1, 0.45 + t * 0.2)
  return color
}

export function getForceLineThickness(force: number, maxForce: number): number {
  const t = Math.min(force / maxForce, 1)
  return 0.02 + t * 0.12
}
