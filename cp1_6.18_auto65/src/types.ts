import * as THREE from 'three'

export type NodeType = 'positive' | 'negative' | 'repulsive'

export interface NodeData {
  id: string
  type: NodeType
  position: THREE.Vector3
  mass: number
  charge: number
  velocity: THREE.Vector3
  createdAt: number
}

export interface ForceLine {
  id: string
  startId: string
  endId: string
  startPos: THREE.Vector3
  endPos: THREE.Vector3
  force: number
  isAttractive: boolean
}

export interface SimParams {
  gravityConstant: number
  repulsionCoefficient: number
  gridResolution: number
}

export interface NodeForceResult {
  nodeId: string
  force: THREE.Vector3
}

export interface PhysicsResult {
  nodeForces: NodeForceResult[]
  forceLines: ForceLine[]
}
