import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Layer, Drill } from '../data/types'

export interface SceneObjects {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  layerMeshes: THREE.Mesh[]
  drillMeshes: THREE.Group[]
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  labelContainer: HTMLElement
}

const PLANE_SIZE = 40
const SEGMENTS = 50

export function createScene(container: HTMLElement): SceneObjects {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)
  scene.fog = new THREE.Fog(0x1a1a2e, 60, 120)

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(30, 40, 30)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 10
  controls.maxDistance = 80
  controls.maxPolarAngle = Math.PI / 2.1
  controls.target.set(0, -10, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(20, 30, 20)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 100
  directionalLight.shadow.camera.left = -30
  directionalLight.shadow.camera.right = 30
  directionalLight.shadow.camera.top = 30
  directionalLight.shadow.camera.bottom = -30
  scene.add(directionalLight)

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362222, 0.3)
  scene.add(hemisphereLight)

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const labelContainer = document.createElement('div')
  labelContainer.style.position = 'absolute'
  labelContainer.style.top = '0'
  labelContainer.style.left = '0'
  labelContainer.style.width = '100%'
  labelContainer.style.height = '100%'
  labelContainer.style.pointerEvents = 'none'
  labelContainer.style.overflow = 'hidden'
  container.appendChild(labelContainer)

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  })

  return {
    scene,
    camera,
    renderer,
    controls,
    layerMeshes: [],
    drillMeshes: [],
    raycaster,
    mouse,
    labelContainer
  }
}

function createWaveGeometry(
  width: number,
  height: number,
  widthSegments: number,
  heightSegments: number,
  offsetY: number,
  frequency: number,
  amplitude: number
): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments)
  const positions = geometry.attributes.position
  const center = width / 2

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) - center
    const z = positions.getY(i)
    const distance = Math.sqrt(x * x + z * z)
    const wave = Math.sin(distance * frequency) * amplitude
    positions.setZ(i, offsetY + wave)
  }

  geometry.computeVertexNormals()
  return geometry
}

export function createGeologicalLayers(
  scene: THREE.Scene,
  layers: Layer[]
): THREE.Mesh[] {
  const layerMeshes: THREE.Mesh[] = []
  let cumulativeDepth = 0

  layers.forEach((layer, index) => {
    const frequency = 0.15 + index * 0.03
    const amplitude = 0.3 + index * 0.1

    const topGeometry = createWaveGeometry(
      PLANE_SIZE,
      PLANE_SIZE,
      SEGMENTS,
      SEGMENTS,
      cumulativeDepth,
      frequency,
      amplitude
    )

    const bottomDepth = cumulativeDepth - layer.thickness
    const bottomGeometry = createWaveGeometry(
      PLANE_SIZE,
      PLANE_SIZE,
      SEGMENTS,
      SEGMENTS,
      bottomDepth,
      frequency * 0.8,
      amplitude * 0.7
    )

    const topPositions = topGeometry.attributes.position
    const bottomPositions = bottomGeometry.attributes.position

    const layerGeometry = new THREE.BufferGeometry()
    const vertexCount = topPositions.count * 2 + 4 * (SEGMENTS * 2)
    const vertices = new Float32Array(vertexCount * 3)
    const normals = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)
    const indices: number[] = []

    let vertexIndex = 0

    for (let i = 0; i < topPositions.count; i++) {
      vertices[vertexIndex * 3] = topPositions.getX(i)
      vertices[vertexIndex * 3 + 1] = topPositions.getZ(i)
      vertices[vertexIndex * 3 + 2] = topPositions.getY(i)
      uvs[vertexIndex * 2] = topPositions.getX(i) / PLANE_SIZE + 0.5
      uvs[vertexIndex * 2 + 1] = topPositions.getY(i) / PLANE_SIZE + 0.5
      vertexIndex++
    }

    const topVertexCount = topPositions.count

    for (let i = 0; i < bottomPositions.count; i++) {
      vertices[vertexIndex * 3] = bottomPositions.getX(i)
      vertices[vertexIndex * 3 + 1] = bottomPositions.getZ(i)
      vertices[vertexIndex * 3 + 2] = bottomPositions.getY(i)
      uvs[vertexIndex * 2] = bottomPositions.getX(i) / PLANE_SIZE + 0.5
      uvs[vertexIndex * 2 + 1] = bottomPositions.getY(i) / PLANE_SIZE + 0.5
      vertexIndex++
    }

    const topIndices = topGeometry.index?.array
    if (topIndices) {
      for (let i = 0; i < topIndices.length; i += 3) {
        indices.push(topIndices[i], topIndices[i + 1], topIndices[i + 2])
      }
    }

    const bottomIndices = bottomGeometry.index?.array
    if (bottomIndices) {
      for (let i = 0; i < bottomIndices.length; i += 3) {
        indices.push(
          topVertexCount + bottomIndices[i + 2],
          topVertexCount + bottomIndices[i + 1],
          topVertexCount + bottomIndices[i]
        )
      }
    }

    for (let side = 0; side < 4; side++) {
      const segments = SEGMENTS
      for (let i = 0; i < segments; i++) {
        let top1, top2, bottom1, bottom2
        if (side === 0) {
          top1 = i
          top2 = i + 1
          bottom1 = topVertexCount + i
          bottom2 = topVertexCount + i + 1
        } else if (side === 1) {
          top1 = segments * (segments + 1) + i
          top2 = segments * (segments + 1) + i + 1
          bottom1 = topVertexCount + segments * (segments + 1) + i
          bottom2 = topVertexCount + segments * (segments + 1) + i + 1
        } else if (side === 2) {
          top1 = i * (segments + 1)
          top2 = (i + 1) * (segments + 1)
          bottom1 = topVertexCount + i * (segments + 1)
          bottom2 = topVertexCount + (i + 1) * (segments + 1)
        } else {
          top1 = i * (segments + 1) + segments
          top2 = (i + 1) * (segments + 1) + segments
          bottom1 = topVertexCount + i * (segments + 1) + segments
          bottom2 = topVertexCount + (i + 1) * (segments + 1) + segments
        }
        indices.push(top1, bottom1, top2)
        indices.push(top2, bottom1, bottom2)
      }
    }

    layerGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    layerGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    layerGeometry.setIndex(indices)
    layerGeometry.computeVertexNormals()

    const color = new THREE.Color(layer.color)
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    })

    const mesh = new THREE.Mesh(layerGeometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { type: 'layer', layer, originalColor: color.clone() }
    mesh.rotation.x = -Math.PI / 2

    scene.add(mesh)
    layerMeshes.push(mesh)

    cumulativeDepth = bottomDepth
  })

  return layerMeshes
}

export function createDrillMarkers(
  scene: THREE.Scene,
  drills: Drill[],
  labelContainer: HTMLElement
): THREE.Group[] {
  const drillGroups: THREE.Group[] = []

  drills.forEach((drill) => {
    const group = new THREE.Group()
    group.position.set(drill.x, -drill.depth / 2, drill.z)
    group.userData = { type: 'drill', drill }

    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, drill.depth, 16)
    const cylinderMaterial = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x330000,
      emissiveIntensity: 0.2
    })
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    cylinder.castShadow = true
    cylinder.userData = { parentGroup: group }
    group.add(cylinder)

    const topGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x661111,
      emissiveIntensity: 0.3
    })
    const top = new THREE.Mesh(topGeometry, topMaterial)
    top.position.y = drill.depth / 2 + 0.2
    top.userData = { parentGroup: group }
    group.add(top)

    const label = document.createElement('div')
    label.className = 'drill-label'
    label.innerHTML = `
      <div style="font-weight: bold;">${drill.wellNo}</div>
      <div>深度: ${drill.depth.toFixed(1)}m</div>
      <div>${drill.sampleTime}</div>
    `
    label.style.transform = 'translate(-50%, -100%)'
    label.style.padding = '4px 8px'
    label.style.background = 'rgba(0, 0, 0, 0.6)'
    label.style.borderRadius = '4px'
    labelContainer.appendChild(label)
    group.userData.labelElement = label

    const glowGeometry = new THREE.CylinderGeometry(0.4, 0.4, drill.depth, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.userData = { isGlow: true }
    group.add(glow)

    scene.add(group)
    drillGroups.push(group)
  })

  return drillGroups
}

export function updateDrillLabels(
  drillMeshes: THREE.Group[],
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): void {
  const widthHalf = renderer.domElement.clientWidth / 2
  const heightHalf = renderer.domElement.clientHeight / 2

  drillMeshes.forEach((group) => {
    const drill = group.userData.drill as Drill
    const label = group.userData.labelElement as HTMLElement
    if (!label) return

    const vector = new THREE.Vector3(drill.x, drill.depth + 2, drill.z)
    vector.project(camera)

    const screenX = (vector.x * widthHalf) + widthHalf
    const screenY = -(vector.y * heightHalf) + heightHalf

    if (vector.z < 1) {
      label.style.left = `${screenX}px`
      label.style.top = `${screenY}px`
      label.style.display = 'block'
    } else {
      label.style.display = 'none'
    }
  })
}

export function startAnimation(
  sceneObjects: SceneObjects,
  onFrame?: () => void
): () => void {
  const { scene, camera, renderer, controls } = sceneObjects
  let animationId: number

  function animate() {
    animationId = requestAnimationFrame(animate)
    controls.update()

    if (onFrame) {
      onFrame()
    }

    updateDrillLabels(sceneObjects.drillMeshes, camera, renderer)
    renderer.render(scene, camera)
  }

  animate()

  return () => {
    cancelAnimationFrame(animationId)
  }
}
