import * as THREE from 'three'

export interface IslandData {
  mesh: THREE.Mesh
  collisionRadius: number
  position: THREE.Vector3
  size: number
  id: number
  isFinish: boolean
}

interface IslandConfig {
  id: number
  x: number
  y: number
  z: number
  size: number
  texture: 'grass' | 'rock' | 'desert'
  isFinish: boolean
}

function createTexture(type: 'grass' | 'rock' | 'desert'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  let baseColor: string
  let detailColor: string
  let accentColor: string

  switch (type) {
    case 'grass':
      baseColor = '#3a7d44'
      detailColor = '#2d5f34'
      accentColor = '#4c9a56'
      break
    case 'rock':
      baseColor = '#6b6b6b'
      detailColor = '#4a4a4a'
      accentColor = '#8a8a8a'
      break
    case 'desert':
      baseColor = '#c9a86c'
      detailColor = '#a88b4e'
      accentColor = '#e0c48a'
      break
  }

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const size = Math.random() * 3 + 1
    ctx.fillStyle = Math.random() > 0.5 ? detailColor : accentColor
    ctx.fillRect(x, y, size, size)
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 20 + 5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = Math.random() > 0.5 ? detailColor : accentColor
    ctx.globalAlpha = 0.3
    ctx.fill()
    ctx.globalAlpha = 1
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  return texture
}

function createBottomTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, '#5a4a3a')
  gradient.addColorStop(1, '#3a2a1a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const size = Math.random() * 4 + 1
    ctx.fillStyle = Math.random() > 0.5 ? '#4a3a2a' : '#6a5a4a'
    ctx.fillRect(x, y, size, size)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  return texture
}

export function generateIslands(islandConfigs: IslandConfig[]): IslandData[] {
  const islands: IslandData[] = []

  for (const config of islandConfigs) {
    const group = new THREE.Group()

    const topTex = createTexture(config.texture)
    const bottomTex = createBottomTexture()
    const sideTex = createBottomTexture()

    const topSize = config.size
    const bottomSize = config.size * 0.5
    const height = config.size * 0.35

    const topGeom = new THREE.CylinderGeometry(topSize, topSize * 0.95, 4, 8)
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.85,
      metalness: 0.05
    })
    const topMesh = new THREE.Mesh(topGeom, topMat)
    topMesh.position.y = height / 2 - 2
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    group.add(topMesh)

    const bodyGeom = new THREE.CylinderGeometry(topSize * 0.95, bottomSize, height, 8)
    const bodyMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.95,
      metalness: 0.02
    })
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat)
    bodyMesh.castShadow = true
    bodyMesh.receiveShadow = true
    group.add(bodyMesh)

    const bottomGeom = new THREE.ConeGeometry(bottomSize, height * 0.5, 8)
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottomTex,
      roughness: 1.0,
      metalness: 0.0
    })
    const bottomMesh = new THREE.Mesh(bottomGeom, bottomMat)
    bottomMesh.position.y = -height * 0.75
    bottomMesh.castShadow = true
    group.add(bottomMesh)

    if (config.texture === 'grass' && !config.isFinish) {
      const treeCount = Math.floor(config.size / 25)
      for (let t = 0; t < treeCount; t++) {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * config.size * 0.6
        const tx = Math.cos(angle) * dist
        const tz = Math.sin(angle) * dist
        const tree = createTree()
        tree.position.set(tx, height / 2 + 2, tz)
        tree.scale.setScalar(0.8 + Math.random() * 0.6)
        group.add(tree)
      }
    }

    if (config.isFinish) {
      const finishRing = createFinishRing(config.size)
      finishRing.position.y = height / 2 + 40
      group.add(finishRing)
    }

    group.position.set(config.x, config.y, config.z)

    const mergedMesh = new THREE.Mesh(
      new THREE.BoxGeometry(config.size * 2, height * 2, config.size * 2),
      topMat
    )
    mergedMesh.visible = false
    mergedMesh.position.copy(group.position)

    islands.push({
      mesh: group as unknown as THREE.Mesh,
      collisionRadius: config.size * 1.1,
      position: new THREE.Vector3(config.x, config.y, config.z),
      size: config.size,
      id: config.id,
      isFinish: config.isFinish
    })
  }

  return islands
}

function createTree(): THREE.Group {
  const tree = new THREE.Group()

  const trunkGeom = new THREE.CylinderGeometry(1.2, 1.8, 8, 6)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 })
  const trunk = new THREE.Mesh(trunkGeom, trunkMat)
  trunk.position.y = 4
  trunk.castShadow = true
  tree.add(trunk)

  const leafColors = [0x2d5a27, 0x3a7d44, 0x4a9a54]
  for (let i = 0; i < 3; i++) {
    const leafGeom = new THREE.ConeGeometry(6 - i * 1.2, 7 - i, 7)
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColors[i],
      roughness: 0.85
    })
    const leaf = new THREE.Mesh(leafGeom, leafMat)
    leaf.position.y = 10 + i * 3.5
    leaf.castShadow = true
    tree.add(leaf)
  }

  return tree
}

function createFinishRing(islandSize: number): THREE.Group {
  const ringGroup = new THREE.Group()

  const ringGeom = new THREE.TorusGeometry(islandSize * 0.45, 3, 12, 64)
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 1.5,
    metalness: 0.9,
    roughness: 0.1
  })
  const ring = new THREE.Mesh(ringGeom, ringMat)
  ring.rotation.x = Math.PI / 2
  ringGroup.add(ring)

  const innerGeom = new THREE.TorusGeometry(islandSize * 0.38, 1, 8, 48)
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffdd66,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.8
  })
  const inner = new THREE.Mesh(innerGeom, innerMat)
  inner.rotation.x = Math.PI / 2
  ringGroup.add(inner)

  const pillarGeom = new THREE.CylinderGeometry(1.5, 2, 80, 8)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xff8800,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2
  })

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const px = Math.cos(angle) * islandSize * 0.45
    const pz = Math.sin(angle) * islandSize * 0.45
    const pillar = new THREE.Mesh(pillarGeom, pillarMat)
    pillar.position.set(px, 0, pz)
    pillar.castShadow = true
    ringGroup.add(pillar)
  }

  (ringGroup as any).isFinishRing = true
  return ringGroup
}

export function getDefaultIslandConfigs(): IslandConfig[] {
  return [
    { id: 0, x: 0, y: 80, z: 0, size: 120, texture: 'grass', isFinish: false },
    { id: 1, x: 250, y: 100, z: -120, size: 90, texture: 'rock', isFinish: false },
    { id: 2, x: 480, y: 70, z: 80, size: 110, texture: 'desert', isFinish: false },
    { id: 3, x: 620, y: 120, z: -180, size: 85, texture: 'grass', isFinish: false },
    { id: 4, x: 800, y: 90, z: 50, size: 95, texture: 'rock', isFinish: false },
    { id: 5, x: 950, y: 110, z: -220, size: 100, texture: 'grass', isFinish: false },
    { id: 6, x: 1120, y: 75, z: 100, size: 88, texture: 'desert', isFinish: false },
    { id: 7, x: 1280, y: 95, z: -150, size: 92, texture: 'rock', isFinish: false },
    { id: 8, x: 1450, y: 85, z: 30, size: 105, texture: 'grass', isFinish: false },
    { id: 9, x: 1620, y: 110, z: -100, size: 130, texture: 'grass', isFinish: true }
  ]
}

export type { IslandConfig }
