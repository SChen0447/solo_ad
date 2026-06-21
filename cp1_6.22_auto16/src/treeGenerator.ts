import * as THREE from 'three'

export interface TreeParams {
  height: number
  crownRadius: number
  trunkCurvature: number
}

export interface GeneratedTree {
  group: THREE.Group
  leavesMesh: THREE.InstancedMesh
  leavesCount: number
  leafPositions: THREE.Vector3[]
  leafBaseRotations: THREE.Euler[]
  trunkMesh: THREE.Mesh
  branchMeshes: THREE.Mesh[]
}

export function generateTree(params: TreeParams): GeneratedTree {
  const { height, crownRadius, trunkCurvature } = params
  const treeGroup = new THREE.Group()

  const trunkHeight = height * 0.4
  const trunkTopY = trunkHeight

  const trunkMesh = createTrunk(trunkHeight, trunkCurvature)
  trunkMesh.position.y = 0
  treeGroup.add(trunkMesh)

  const branchMeshes: THREE.Mesh[] = []
  const branchCount = Math.floor(5 + height * 0.3)
  const branchStartY = trunkHeight * 0.4

  for (let i = 0; i < branchCount; i++) {
    const t = i / (branchCount - 1)
    const y = branchStartY + (trunkHeight - branchStartY) * t
    const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5
    const length = crownRadius * (0.4 + Math.random() * 0.4) * (0.6 + t * 0.6)
    const branch = createBranch(length, y, angle, trunkCurvature, t)
    branchMeshes.push(branch)
    treeGroup.add(branch)
  }

  const crownCenterY = trunkHeight + crownRadius * 0.6
  const leafCount = Math.floor(400 + crownRadius * 200)
  const leafGeometry = new THREE.SphereGeometry(0.12, 6, 4)
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x88cc44,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  })

  const leavesMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafCount)
  leavesMesh.castShadow = true
  leavesMesh.receiveShadow = false

  const leafPositions: THREE.Vector3[] = []
  const leafBaseRotations: THREE.Euler[] = []
  const dummy = new THREE.Object3D()

  for (let i = 0; i < leafCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = crownRadius * Math.pow(Math.random(), 0.5)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = crownCenterY + r * Math.cos(phi) * 0.7
    const z = r * Math.sin(phi) * Math.sin(theta)

    const curveOffset = getTrunkOffset(y / height, trunkCurvature)

    leafPositions.push(new THREE.Vector3(x + curveOffset.x, y, z + curveOffset.z))

    const rotX = (Math.random() - 0.5) * Math.PI
    const rotY = Math.random() * Math.PI * 2
    const rotZ = (Math.random() - 0.5) * Math.PI * 0.5
    leafBaseRotations.push(new THREE.Euler(rotX, rotY, rotZ))

    const scale = 0.7 + Math.random() * 0.6

    dummy.position.set(x + curveOffset.x, y, z + curveOffset.z)
    dummy.rotation.set(rotX, rotY, rotZ)
    dummy.scale.set(scale, scale, scale)
    dummy.updateMatrix()
    leavesMesh.setMatrixAt(i, dummy.matrix)
  }

  leavesMesh.instanceMatrix.needsUpdate = true
  treeGroup.add(leavesMesh)

  return {
    group: treeGroup,
    leavesMesh,
    leavesCount: leafCount,
    leafPositions,
    leafBaseRotations,
    trunkMesh,
    branchMeshes
  }
}

function createTrunk(height: number, curvature: number): THREE.Mesh {
  const segments = 12
  const points: THREE.Vector3[] = []
  const bottomRadius = 0.2 + height * 0.04
  const topRadius = 0.08 + height * 0.015

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const r = bottomRadius + (topRadius - bottomRadius) * t
    const offset = getTrunkOffset(t, curvature)
    points.push(new THREE.Vector3(offset.x, t * height, offset.z))
  }

  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, segments, bottomRadius, 8, false)

  const material = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.95,
    metalness: 0.0
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function createBranch(
  length: number,
  baseY: number,
  angle: number,
  trunkCurvature: number,
  t: number
): THREE.Mesh {
  const baseRadius = 0.05 + length * 0.04
  const topRadius = baseRadius * 0.3

  const geometry = new THREE.ConeGeometry(baseRadius, length, 6, 1)
  geometry.translate(0, length / 2, 0)

  const material = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.95,
    metalness: 0.0
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const trunkOffset = getTrunkOffset(t, trunkCurvature)
  mesh.position.set(trunkOffset.x, baseY, trunkOffset.z)

  mesh.rotation.z = Math.PI / 2.5 + Math.random() * 0.3
  mesh.rotation.y = angle
  mesh.rotation.x = (Math.random() - 0.5) * 0.3

  return mesh
}

function getTrunkOffset(t: number, curvature: number): { x: number; z: number } {
  const x = Math.sin(t * Math.PI * 1.5) * curvature * t * 2
  const z = Math.cos(t * Math.PI * 1.2) * curvature * t * 1.5
  return { x, z }
}
