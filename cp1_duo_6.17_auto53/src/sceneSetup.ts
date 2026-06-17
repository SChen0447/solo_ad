import * as THREE from 'three'
import { generateIslands, getDefaultIslandConfigs, type IslandData, validateIslandFaceCount } from './terrainGenerator'
import { generateEnergyRings, createVehicle, createRecommendedPath, type EnergyRing, validateVehicleFaceCount } from './energyRing'

export interface SceneSetupResult {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  islands: IslandData[]
  rings: EnergyRing[]
  vehicle: THREE.Group
  bodyMeshes: THREE.Mesh[]
  recommendedLine: THREE.Line
  recommendedArrows: THREE.Group[]
  startPosition: THREE.Vector3
}

export function setupScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): SceneSetupResult {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d0221)
  scene.fog = new THREE.FogExp2(0x0d0221, 0.0006)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const ambientLight = new THREE.AmbientLight(0x6b4c8a, 0.55)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
  directionalLight.position.set(200, 400, 150)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.set(2048, 2048)
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 2000
  directionalLight.shadow.camera.left = -800
  directionalLight.shadow.camera.right = 1600
  directionalLight.shadow.camera.top = 800
  directionalLight.shadow.camera.bottom = -800
  directionalLight.shadow.bias = -0.0005
  scene.add(directionalLight)

  const fillLight = new THREE.DirectionalLight(0x8866ff, 0.35)
  fillLight.position.set(-150, 200, -100)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xff88cc, 0.2)
  rimLight.position.set(-50, 100, 300)
  scene.add(rimLight)

  const hemisphereLight = new THREE.HemisphereLight(0x8866ff, 0x2a1a4a, 0.3)
  scene.add(hemisphereLight)

  const islandConfigs = getDefaultIslandConfigs()
  const islands = generateIslands(islandConfigs)
  for (const island of islands) {
    scene.add(island.mesh)
  }

  const ringCounts = [4, 3, 4, 3, 5, 3, 4, 3, 4, 0]
  const rings = generateEnergyRings(islands, ringCounts)
  for (const ring of rings) {
    scene.add(ring.mesh)
  }

  const { group: vehicle, bodyMeshes } = createVehicle()
  const startPos = new THREE.Vector3(0, 140, 0)
  vehicle.position.copy(startPos)
  scene.add(vehicle)

  const { line: recommendedLine, arrows: recommendedArrows } = createRecommendedPath(islands, rings)
  scene.add(recommendedLine)
  for (const arrow of recommendedArrows) {
    scene.add(arrow)
  }

  createClouds(scene, islands)
  createStars(scene)
  createAtmosphere(scene)

  validateIslandFaceCount(islands)
  validateVehicleFaceCount(vehicle)

  return {
    scene,
    renderer,
    islands,
    rings,
    vehicle,
    bodyMeshes,
    recommendedLine,
    recommendedArrows,
    startPosition: startPos
  }
}

function createClouds(scene: THREE.Scene, islands: IslandData[]): void {
  const cloudGroup = new THREE.Group()
  const cloudCount = 30

  const maxX = Math.max(...islands.map(i => i.position.x)) + 300
  const minX = Math.min(...islands.map(i => i.position.x)) - 200
  const maxZ = Math.max(...islands.map(i => i.position.z)) + 300
  const minZ = Math.min(...islands.map(i => i.position.z)) - 300

  for (let c = 0; c < cloudCount; c++) {
    const cloud = new THREE.Group()
    const puffCount = 4 + Math.floor(Math.random() * 5)

    for (let p = 0; p < puffCount; p++) {
      const size = 12 + Math.random() * 20
      const geom = new THREE.SphereGeometry(size, 7, 6)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55 + Math.random() * 0.2,
        roughness: 1.0
      })
      const puff = new THREE.Mesh(geom, mat)
      puff.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 40
      )
      puff.scale.y = 0.5 + Math.random() * 0.3
      cloud.add(puff)
    }

    cloud.position.set(
      minX + Math.random() * (maxX - minX),
      180 + Math.random() * 150,
      minZ + Math.random() * (maxZ - minZ)
    )
    cloudGroup.add(cloud)
  }

  scene.add(cloudGroup)
}

function createStars(scene: THREE.Scene): void {
  const starCount = 600
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3
    const radius = 2500 + Math.random() * 800
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.5 + 0.1

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.cos(phi)
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    const brightness = 0.6 + Math.random() * 0.4
    const tint = Math.random()
    if (tint > 0.9) {
      colors[i3] = brightness
      colors[i3 + 1] = brightness * 0.7
      colors[i3 + 2] = brightness * 0.5
    } else if (tint > 0.8) {
      colors[i3] = brightness * 0.7
      colors[i3 + 1] = brightness * 0.8
      colors[i3 + 2] = brightness
    } else {
      colors[i3] = brightness
      colors[i3 + 1] = brightness
      colors[i3 + 2] = brightness
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false
  })

  const stars = new THREE.Points(geom, mat)
  scene.add(stars)
}

function createAtmosphere(scene: THREE.Scene): void {
  const groundGeom = new THREE.PlaneGeometry(8000, 8000)
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0x1a0a3e,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  })
  const ground = new THREE.Mesh(groundGeom, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -100
  scene.add(ground)

  const fogLayers = [
    { y: -20, color: 0x1a0a3e, opacity: 0.3, size: 5000 },
    { y: -50, color: 0x0d0221, opacity: 0.4, size: 6000 }
  ]

  for (const layer of fogLayers) {
    const geom = new THREE.PlaneGeometry(layer.size, layer.size, 20, 20)
    const positions = geom.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const zAttr = positions.getZ(i)
      positions.setZ(i, zAttr + (Math.random() - 0.5) * 30)
    }
    geom.computeVertexNormals()

    const mat = new THREE.MeshBasicMaterial({
      color: layer.color,
      transparent: true,
      opacity: layer.opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const plane = new THREE.Mesh(geom, mat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = layer.y
    scene.add(plane)
  }
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): void {
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}
