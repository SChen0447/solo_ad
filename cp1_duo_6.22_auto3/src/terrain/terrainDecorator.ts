import * as THREE from 'three'
import type { TerrainData } from './terrainGenerator'
import { getHeightAt, getSlopeAt } from './terrainGenerator'

export interface DecoratorParams {
  treeDensity: number
  houseCount: number
  seed: number
}

export interface DecorationObjects {
  trees: THREE.InstancedMesh
  houses: THREE.Group
  treeCount: number
  houseCount: number
}

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
}

function createTreeGeometry(): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
  const trunkHeight = 1.0
  const trunkRadius = 0.15
  const crownRadius = 0.6
  const crownHeight = 1.5

  const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8)
  trunkGeometry.translate(0, trunkHeight / 2, 0)

  const crownGeometry = new THREE.ConeGeometry(crownRadius, crownHeight, 8)
  crownGeometry.translate(0, trunkHeight + crownHeight / 2, 0)

  const mergedGeometry = mergeGeometries([trunkGeometry, crownGeometry])

  const trunkColor = new THREE.Color(0x5c4033)
  const crownColor = new THREE.Color(0x228b22)

  const positionCount = mergedGeometry.attributes.position.count
  const colors = new Float32Array(positionCount * 3)

  for (let i = 0; i < positionCount; i++) {
    const y = mergedGeometry.attributes.position.getY(i)
    const color = y < trunkHeight ? trunkColor : crownColor
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  mergedGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0
  })

  return { geometry: mergedGeometry, material }
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const mergedGeometry = new THREE.BufferGeometry()

  let positionCount = 0
  let indexCount = 0

  for (const geo of geometries) {
    positionCount += geo.attributes.position.count
    indexCount += geo.index ? geo.index.count : 0
  }

  const positions = new Float32Array(positionCount * 3)
  const normals = new Float32Array(positionCount * 3)
  const indices = new Uint32Array(indexCount)

  let posOffset = 0
  let idxOffset = 0
  let indexBase = 0

  for (const geo of geometries) {
    const posAttr = geo.attributes.position
    const normAttr = geo.attributes.normal

    for (let i = 0; i < posAttr.count; i++) {
      positions[(posOffset + i) * 3] = posAttr.getX(i)
      positions[(posOffset + i) * 3 + 1] = posAttr.getY(i)
      positions[(posOffset + i) * 3 + 2] = posAttr.getZ(i)

      if (normAttr) {
        normals[(posOffset + i) * 3] = normAttr.getX(i)
        normals[(posOffset + i) * 3 + 1] = normAttr.getY(i)
        normals[(posOffset + i) * 3 + 2] = normAttr.getZ(i)
      }
    }

    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices[idxOffset + i] = geo.index.getX(i) + indexBase
      }
      idxOffset += geo.index.count
    }

    posOffset += posAttr.count
    indexBase += posAttr.count
  }

  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

  return mergedGeometry
}

function createHouseGroup(): THREE.Group {
  const houseGroup = new THREE.Group()

  const wallHeight = 0.8
  const wallWidth = 1.2
  const wallDepth = 1.0

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5deb3,
    roughness: 0.8
  })

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth),
    wallMaterial
  )
  walls.position.y = wallHeight / 2
  walls.castShadow = true
  walls.receiveShadow = true
  houseGroup.add(walls)

  const roofHeight = 0.6
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc143c,
    roughness: 0.7
  })

  const roofGeometry = new THREE.ConeGeometry(wallWidth * 0.8, roofHeight, 4)
  roofGeometry.rotateY(Math.PI / 4)

  const roof = new THREE.Mesh(roofGeometry, roofMaterial)
  roof.position.y = wallHeight + roofHeight / 2
  roof.castShadow = true
  houseGroup.add(roof)

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9
  })

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.4, 0.05),
    doorMaterial
  )
  door.position.set(0, 0.2, wallDepth / 2 + 0.025)
  houseGroup.add(door)

  return houseGroup
}

export function decorateTerrain(
  terrainData: TerrainData,
  params: DecoratorParams
): DecorationObjects {
  const { width, depth } = terrainData
  const { treeDensity, houseCount, seed } = params

  const random = new SeededRandom(seed)
  const halfWidth = width / 2
  const halfDepth = depth / 2

  const { geometry: treeGeometry, material: treeMaterial } = createTreeGeometry()

  const maxTrees = Math.floor(treeDensity * 5)
  const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, maxTrees)
  trees.castShadow = true
  trees.receiveShadow = true

  const dummy = new THREE.Object3D()
  let treeIndex = 0

  const gridSize = 0.8
  const gridCols = Math.floor(width / gridSize)
  const gridRows = Math.floor(depth / gridSize)

  for (let row = 0; row < gridRows && treeIndex < maxTrees; row++) {
    for (let col = 0; col < gridCols && treeIndex < maxTrees; col++) {
      if (random.next() > treeDensity / 100) continue

      const x = -halfWidth + (col + random.next()) * gridSize
      const z = -halfDepth + (row + random.next()) * gridSize

      const height = getHeightAt(x, z, terrainData)
      const slope = getSlopeAt(x, z, terrainData)

      if (height < 0.3 || slope > 0.3) continue

      const scale = random.range(0.6, 1.4)
      const rotationY = random.range(0, Math.PI * 2)

      dummy.position.set(x, height, z)
      dummy.rotation.set(0, rotationY, 0)
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()

      trees.setMatrixAt(treeIndex, dummy.matrix)
      treeIndex++
    }
  }

  trees.count = treeIndex
  trees.instanceMatrix.needsUpdate = true

  const houses = new THREE.Group()
  const placedHouses = Math.min(houseCount, 10)
  let attempts = 0
  let housesPlaced = 0

  while (housesPlaced < placedHouses && attempts < 200) {
    attempts++

    const x = random.range(-halfWidth + 2, halfWidth - 2)
    const z = random.range(-halfDepth + 2, halfDepth - 2)

    const height = getHeightAt(x, z, terrainData)
    const slope = getSlopeAt(x, z, terrainData)

    if (height < 0.3 || slope > 0.1) continue

    const house = createHouseGroup()
    const scale = random.range(0.8, 1.2)
    house.scale.set(scale, scale, scale)
    house.position.set(x, height, z)
    house.rotation.y = random.range(0, Math.PI * 2)

    let tooClose = false
    for (const child of houses.children) {
      const dist = house.position.distanceTo(child.position)
      if (dist < 3) {
        tooClose = true
        break
      }
    }

    if (tooClose) continue

    houses.add(house)
    housesPlaced++
  }

  return {
    trees,
    houses,
    treeCount: treeIndex,
    houseCount: housesPlaced
  }
}

export function disposeDecorations(decorations: DecorationObjects): void {
  decorations.trees.geometry.dispose()
  ;(decorations.trees.material as THREE.Material).dispose()

  decorations.houses.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}
