import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { SonarPingSystem, type EchoRing, type PointCloudPoint, type HitParticle, type HitKind } from './SonarPing'
import { TargetMarkerApi, type TargetMarkerData, type TargetType, TARGET_COLORS } from '../dashboard/TargetMarker'
import { sonarApi } from '../../services/sonarApi'

interface SonarSceneProps {
  onSonarDataUpdate: (depth: number, temp: number) => void
  onShipMove: (x: number, z: number) => void
  onTargetsUpdate: (targets: TargetMarkerData[]) => void
  onTargetAdded: (target: TargetMarkerData) => void
  selectedTarget: TargetMarkerData | null
  onTargetFocusComplete: () => void
  highlightTargetId: string | null
  onHighlightComplete: () => void
}

const TERRAIN_SIZE = 100
const TERRAIN_SEGMENTS = 50
const MAX_POINT_CLOUD = 1500

function generateHeight(x: number, z: number): number {
  let h = 0
  h += Math.sin(x * 0.3) * Math.cos(z * 0.3) * 5
  h += Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.15) * 8
  h -= 15
  return h
}

function getTerrainColor(height: number): THREE.Color {
  const depth = Math.abs(height)
  if (depth < 5) {
    return new THREE.Color(0xd4b895)
  } else if (depth < 15) {
    const t = (depth - 5) / 10
    const color = new THREE.Color()
    color.lerpColors(new THREE.Color(0xd4b895), new THREE.Color(0x2e86ab), t)
    return color
  } else {
    const t = Math.min((depth - 15) / 25, 1)
    const color = new THREE.Color()
    color.lerpColors(new THREE.Color(0x2e86ab), new THREE.Color(0x1b3a5c), t)
    return color
  }
}

const SonarScene: React.FC<SonarSceneProps> = ({
  onSonarDataUpdate,
  onShipMove,
  onTargetsUpdate,
  onTargetAdded,
  selectedTarget,
  onTargetFocusComplete,
  highlightTargetId,
  onHighlightComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const shipRef = useRef<THREE.Group | null>(null)
  const waterMeshRef = useRef<THREE.Mesh | null>(null)
  const terrainMeshRef = useRef<THREE.Mesh | null>(null)
  const pointCloudGroupRef = useRef<THREE.Group | null>(null)
  const scanConeRef = useRef<THREE.Mesh | null>(null)
  const echoRingsRef = useRef<EchoRing[]>([])
  const targetsGroupRef = useRef<THREE.Group | null>(null)
  const targetMarkersRef = useRef<Map<string, THREE.Group>>(new Map())
  const hitParticlesRef = useRef<HitParticle[]>([])
  const targetMarkerMaterialsRef = useRef<Map<string, { original: THREE.MeshStandardMaterial; glow: THREE.MeshBasicMaterial; baseScale: THREE.Vector3 }>>(new Map())

  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 25 })
  const cameraVelocityRef = useRef({ theta: 0, phi: 0 })
  const shipVelocityRef = useRef({ x: 0, z: 0 })
  const keysRef = useRef<Set<string>>(new Set())
  const sonarSystemRef = useRef(new SonarPingSystem())
  const pointCloudDataRef = useRef<PointCloudPoint[]>([])
  const lastSonarFetchRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const clockRef = useRef(new THREE.Clock())
  const focusAnimationRef = useRef<{ active: boolean; startTime: number; duration: number; startPos: THREE.Vector3; startAngle: { theta: number; phi: number; radius: number }; endPos: THREE.Vector3; endAngle: { theta: number; phi: number; radius: number } } | null>(null)
  const waterPulseRef = useRef<{ active: boolean; startTime: number; duration: number } | null>(null)
  const blinkAnimationRef = useRef<{ active: boolean; startTime: number; duration: number; targetId: string } | null>(null)

  const [showMarkerDialog, setShowMarkerDialog] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<{ x: number; y: number; z: number } | null>(null)
  const [markerName, setMarkerName] = useState('')
  const [markerType, setMarkerType] = useState<TargetType>('unidentified')
  const [targets, setTargets] = useState<TargetMarkerData[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a132f)
    scene.fog = new THREE.Fog(0x0a132f, 10, 50)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x404060, 0.4)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(20, 30, 20)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 100
    dirLight.shadow.camera.left = -50
    dirLight.shadow.camera.right = 50
    dirLight.shadow.camera.top = 50
    dirLight.shadow.camera.bottom = -50
    scene.add(dirLight)

    const pointLight = new THREE.PointLight(0x2e86ab, 1.0, 50)
    pointLight.position.set(0, 10, 0)
    scene.add(pointLight)

    const waterGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE * 1.5, TERRAIN_SIZE * 1.5, 50, 50)
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e86ab,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      wireframe: false,
    })
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = 0
    scene.add(water)
    waterMeshRef.current = water

    const gridHelper = new THREE.GridHelper(TERRAIN_SIZE * 1.5, 30, 0x40a0ff, 0x2060a0)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.3
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    const terrainGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS)
    const positions = terrainGeometry.attributes.position
    const colors: number[] = []

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const y = generateHeight(x, z)
      positions.setY(i, y)
      const color = getTerrainColor(y)
      colors.push(color.r, color.g, color.b)
    }

    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    terrainGeometry.computeVertexNormals()

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1,
    })
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial)
    terrain.rotation.x = -Math.PI / 2
    terrain.receiveShadow = true
    scene.add(terrain)
    terrainMeshRef.current = terrain

    const ship = createShipModel()
    ship.position.set(0, 0.5, 0)
    scene.add(ship)
    shipRef.current = ship

    const coneGeometry = new THREE.ConeGeometry(8, 20, 32, 1, true)
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      wireframe: false,
    })
    const scanCone = new THREE.Mesh(coneGeometry, coneMaterial)
    scanCone.visible = false
    scene.add(scanCone)
    scanConeRef.current = scanCone

    const pointCloudGroup = new THREE.Group()
    scene.add(pointCloudGroup)
    pointCloudGroupRef.current = pointCloudGroup

    const targetsGroup = new THREE.Group()
    scene.add(targetsGroup)
    targetsGroupRef.current = targetsGroup

    loadTargets()
    updateCameraPosition()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMouseRef.current.x
        const deltaY = e.clientY - lastMouseRef.current.y
        cameraVelocityRef.current.theta = -deltaX * 0.005
        cameraVelocityRef.current.phi = -deltaY * 0.005
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      cameraAngleRef.current.radius = Math.max(
        15,
        Math.min(40, cameraAngleRef.current.radius + e.deltaY * 0.02)
      )
    }
    const handleDoubleClick = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !shipRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, cameraRef.current)
      const intersects = raycaster.intersectObject(terrainMeshRef.current!)
      if (intersects.length > 0) {
        const point = intersects[0].point
        const shipPos = shipRef.current.position
        const dist = Math.sqrt(
          Math.pow(point.x - shipPos.x, 2) + Math.pow(point.z - shipPos.z, 2)
        )
        if (dist <= 30) {
          setMarkerPosition({ x: point.x, y: point.y, z: point.z })
          setShowMarkerDialog(true)
        }
      }
    }
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })
    renderer.domElement.addEventListener('dblclick', handleDoubleClick)
    window.addEventListener('resize', handleResize)

    let animFrameId: number
    const animate = () => {
      animFrameId = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      const elapsed = clockRef.current.elapsedTime

      updateShip(delta)
      updateCamera(delta, elapsed)
      updateWater(elapsed)
      updateWaterOpacity(elapsed)
      updateSonar(delta, elapsed)
      updateEchoRings(elapsed)
      updateScanCone(elapsed)
      updateFocusAnimation(elapsed)
      updateHitParticles(elapsed)
      updateBlinkAnimation(elapsed)

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('mousedown', handleMouseDown)
        rendererRef.current.domElement.removeEventListener('wheel', handleWheel)
        rendererRef.current.domElement.removeEventListener('dblclick', handleDoubleClick)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    onTargetsUpdate(targets)
  }, [targets, onTargetsUpdate])

  useEffect(() => {
    if (selectedTarget && cameraRef.current && shipRef.current) {
      const shipPos = shipRef.current.position
      const targetPos = new THREE.Vector3(selectedTarget.x, selectedTarget.y, selectedTarget.z)

      const dx = targetPos.x - shipPos.x
      const dz = targetPos.z - shipPos.z
      const targetTheta = Math.atan2(dx, dz)
      const targetPhi = Math.PI / 4
      const targetRadius = 20

      const camAngle = cameraAngleRef.current
      focusAnimationRef.current = {
        active: true,
        startTime: clockRef.current.elapsedTime,
        duration: 2.0,
        startPos: cameraRef.current.position.clone(),
        startAngle: { theta: camAngle.theta, phi: camAngle.phi, radius: camAngle.radius },
        endPos: new THREE.Vector3(
          targetPos.x + targetRadius * Math.sin(targetTheta) * Math.cos(targetPhi),
          targetPos.y + targetRadius * Math.sin(targetPhi),
          targetPos.z + targetRadius * Math.cos(targetTheta) * Math.cos(targetPhi)
        ),
        endAngle: { theta: targetTheta, phi: targetPhi, radius: targetRadius },
      }
    }
  }, [selectedTarget])

  useEffect(() => {
    if (highlightTargetId && targetMarkersRef.current.has(highlightTargetId)) {
      blinkAnimationRef.current = {
        active: true,
        startTime: clockRef.current.elapsedTime,
        duration: 3.0,
        targetId: highlightTargetId,
      }
    }
  }, [highlightTargetId])

  const loadTargets = async () => {
    try {
      const loadedTargets = await TargetMarkerApi.getAll()
      setTargets(loadedTargets)
      for (const target of loadedTargets) {
        addTargetMarkerToScene(target)
      }
    } catch (error) {
      console.error('Failed to load targets:', error)
    }
  }

  const addTargetMarkerToScene = (target: TargetMarkerData) => {
    if (!targetsGroupRef.current) return
    const group = createTargetMarker(target)
    group.position.set(target.x, target.y + 0.5, target.z)
    targetsGroupRef.current.add(group)
    targetMarkersRef.current.set(target.id, group)
  }

  const createShipModel = (): THREE.Group => {
    const group = new THREE.Group()
    const hullGeometry = new THREE.BoxGeometry(2, 0.6, 4)
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 })
    const hull = new THREE.Mesh(hullGeometry, hullMaterial)
    hull.position.y = 0
    hull.castShadow = true
    group.add(hull)

    const cabinGeometry = new THREE.BoxGeometry(1.2, 0.5, 1.5)
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial)
    cabin.position.set(0, 0.55, -0.3)
    cabin.castShadow = true
    group.add(cabin)

    const mastGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5)
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f })
    const mast = new THREE.Mesh(mastGeometry, mastMaterial)
    mast.position.set(0, 1.3, -0.3)
    group.add(mast)

    return group
  }

  const createTargetMarker = (target: TargetMarkerData): THREE.Group => {
    const group = new THREE.Group()
    const color = TARGET_COLORS[target.type]

    let geometry: THREE.BufferGeometry
    if (target.type === 'shipwreck') {
      geometry = new THREE.ConeGeometry(0.6, 1.2, 3)
    } else if (target.type === 'coral') {
      geometry = new THREE.ConeGeometry(0.5, 1.0, 6)
      const branches = 3
      for (let i = 0; i < branches; i++) {
        const branchGeom = new THREE.ConeGeometry(0.2, 0.6, 4)
        const branch = new THREE.Mesh(
          branchGeom,
          new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 })
        )
        const angle = (i / branches) * Math.PI * 2
        branch.position.set(Math.cos(angle) * 0.3, 0.3, Math.sin(angle) * 0.3)
        branch.rotation.z = Math.cos(angle) * 0.5
        branch.rotation.x = Math.sin(angle) * 0.5
        group.add(branch)
      }
    } else {
      geometry = new THREE.SphereGeometry(0.5, 16, 16)
    }

    const mainMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.15,
      roughness: 0.7,
    })
    const mainMesh = new THREE.Mesh(geometry, mainMaterial)
    mainMesh.position.y = 0.5
    mainMesh.castShadow = true
    group.add(mainMesh)

    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.15,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.y = 0.5
    group.add(glow)

    targetMarkerMaterialsRef.current.set(target.id, {
      original: mainMaterial,
      glow: glowMaterial,
      baseScale: group.scale.clone(),
    })

    return group
  }

  const updateShip = (delta: number) => {
    if (!shipRef.current) return
    const speed = 2.0
    const keys = keysRef.current

    const angle = cameraAngleRef.current.theta
    const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle))

    let moveX = 0
    let moveZ = 0

    if (keys.has('w')) {
      moveX += forward.x * speed * delta
      moveZ += forward.z * speed * delta
    }
    if (keys.has('s')) {
      moveX -= forward.x * speed * delta
      moveZ -= forward.z * speed * delta
    }

    shipRef.current.position.x += moveX
    shipRef.current.position.z += moveZ

    if (moveX !== 0 || moveZ !== 0) {
      shipRef.current.rotation.y = Math.atan2(moveX, moveZ)
    }

    onShipMove(shipRef.current.position.x, shipRef.current.position.z)
  }

  const updateCameraPosition = () => {
    if (!cameraRef.current || !shipRef.current) return
    const { theta, phi, radius } = cameraAngleRef.current
    const shipPos = shipRef.current.position
    cameraRef.current.position.set(
      shipPos.x + radius * Math.sin(theta) * Math.cos(phi),
      shipPos.y + radius * Math.sin(phi) + 5,
      shipPos.z + radius * Math.cos(theta) * Math.cos(phi)
    )
    cameraRef.current.lookAt(shipPos.x, shipPos.y - 2, shipPos.z)
    sonarSystemRef.current.setCameraDistance(radius)
  }

  const updateCamera = (delta: number, elapsed: number) => {
    if (focusAnimationRef.current?.active) return

    cameraAngleRef.current.theta += cameraVelocityRef.current.theta
    cameraAngleRef.current.phi = Math.max(
      0.2,
      Math.min(Math.PI / 2 - 0.1, cameraAngleRef.current.phi + cameraVelocityRef.current.phi)
    )
    cameraVelocityRef.current.theta *= 0.9
    cameraVelocityRef.current.phi *= 0.9

    updateCameraPosition()
  }

  const updateWater = (elapsed: number) => {
    if (!waterMeshRef.current || !shipRef.current) return
    const positions = waterMeshRef.current.geometry.attributes.position
    const shipPos = shipRef.current.position

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      let y = Math.sin(x * 0.5 + elapsed * 1.5) * 0.15
      y += Math.cos(z * 0.5 + elapsed * 1.2) * 0.1

      const dist = Math.sqrt(Math.pow(x - shipPos.x, 2) + Math.pow(z - shipPos.z, 2))
      if (dist < 8 && dist > 0.1) {
        y += Math.sin(dist * 3 - elapsed * 5) * 0.25 * Math.exp(-dist * 0.3)
      }

      positions.setY(i, y)
    }
    positions.needsUpdate = true
    waterMeshRef.current.geometry.computeVertexNormals()
  }

  const updateSonar = async (delta: number, elapsed: number) => {
    if (!shipRef.current || !cameraRef.current) return

    const prevLastPing = sonarSystemRef.current.getLastPingTime()
    sonarSystemRef.current.update(delta)
    const newLastPing = sonarSystemRef.current.getLastPingTime()

    if (newLastPing !== prevLastPing) {
      waterPulseRef.current = {
        active: true,
        startTime: elapsed,
        duration: 0.6,
      }
    }

    const now = Date.now()

    if (now - lastSonarFetchRef.current >= 1000) {
      lastSonarFetchRef.current = now
      const shipPos = shipRef.current.position
      const scanAngle = sonarSystemRef.current.getScanAngle()

      try {
        const response = await sonarApi.simulateSonar(shipPos.x, shipPos.z, 20, scanAngle, 45)
        onSonarDataUpdate(response.currentDepth, response.waterTemperature)

        const cameraPos = cameraRef.current.position
        pointCloudDataRef.current = sonarSystemRef.current.processSonarPoints(
          response.points,
          pointCloudDataRef.current,
          cameraPos
        )
        rebuildPointCloud()

        for (let idx = 0; idx < Math.min(response.points.length, 5); idx++) {
          const point = response.points[idx]
          const pos = new THREE.Vector3(point.x, point.y, point.z)

          const ring = sonarSystemRef.current.createEchoRing(pos, elapsed)
          echoRingsRef.current.push(ring)
          if (sceneRef.current) {
            sceneRef.current.add(ring.mesh)
          }

          let hitKind: HitKind = 'terrain'
          const nearbyTarget = targets.find(t => {
            const dx = t.x - point.x
            const dy = t.y - point.y
            const dz = t.z - point.z
            return Math.sqrt(dx * dx + dy * dy + dz * dz) < 2.0
          })
          if (nearbyTarget) {
            hitKind = nearbyTarget.type
          }

          const burst = sonarSystemRef.current.createHitBurst(
            pos,
            elapsed,
            hitKind,
            hitKind === 'terrain' ? 8 : 14
          )
          for (const particle of burst) {
            hitParticlesRef.current.push(particle)
            if (sceneRef.current) {
              sceneRef.current.add(particle.mesh)
            }
          }
        }
      } catch (e) {
        console.error('Sonar update failed:', e)
      }
    }
  }

  const rebuildPointCloud = () => {
    if (!pointCloudGroupRef.current) return

    while (pointCloudGroupRef.current.children.length > 0) {
      const child = pointCloudGroupRef.current.children[0] as THREE.Mesh
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
      pointCloudGroupRef.current.remove(child)
    }

    const points = pointCloudDataRef.current
    for (let i = Math.max(0, points.length - MAX_POINT_CLOUD); i < points.length; i++) {
      const p = points[i]
      const geometry = new THREE.BoxGeometry(p.size, p.size, p.size)
      const material = new THREE.MeshBasicMaterial({ color: p.color })
      const cube = new THREE.Mesh(geometry, material)
      cube.position.copy(p.position)
      pointCloudGroupRef.current.add(cube)
    }
  }

  const updateEchoRings = (elapsed: number) => {
    const rings = echoRingsRef.current
    for (let i = rings.length - 1; i >= 0; i--) {
      const alive = sonarSystemRef.current.updateEchoRing(rings[i], elapsed)
      if (!alive && sceneRef.current) {
        sceneRef.current.remove(rings[i].mesh)
        rings[i].mesh.geometry.dispose()
        ;(rings[i].mesh.material as THREE.Material).dispose()
        rings.splice(i, 1)
      }
    }
  }

  const updateScanCone = (elapsed: number) => {
    if (!scanConeRef.current || !shipRef.current) return
    const shipPos = shipRef.current.position
    const scanAngle = sonarSystemRef.current.getScanAngle()

    scanConeRef.current.visible = true
    scanConeRef.current.position.set(shipPos.x, shipPos.y - 1, shipPos.z)
    scanConeRef.current.rotation.z = (scanAngle * Math.PI) / 180
    scanConeRef.current.rotation.x = Math.PI

    const pulse = 0.15 + Math.sin(elapsed * 4) * 0.08
    ;(scanConeRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
  }

  const updateFocusAnimation = (elapsed: number) => {
    if (!focusAnimationRef.current?.active || !cameraRef.current) return

    const anim = focusAnimationRef.current
    const t = Math.min((elapsed - anim.startTime) / anim.duration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    cameraAngleRef.current.theta = anim.startAngle.theta + (anim.endAngle.theta - anim.startAngle.theta) * eased
    cameraAngleRef.current.phi = anim.startAngle.phi + (anim.endAngle.phi - anim.startAngle.phi) * eased
    cameraAngleRef.current.radius = anim.startAngle.radius + (anim.endAngle.radius - anim.startAngle.radius) * eased

    if (t >= 1) {
      focusAnimationRef.current.active = false
      onTargetFocusComplete()
    }

    updateCameraPosition()
  }

  const updateWaterOpacity = (elapsed: number) => {
    if (!waterMeshRef.current) return
    const baseOpacity = 0.4

    if (waterPulseRef.current?.active) {
      const pulse = waterPulseRef.current
      const t = (elapsed - pulse.startTime) / pulse.duration
      if (t >= 1) {
        waterPulseRef.current.active = false
        ;(waterMeshRef.current.material as THREE.MeshStandardMaterial).opacity = baseOpacity
      } else {
        const pulseCurve = Math.exp(-t * 6)
        const opacity = baseOpacity - pulseCurve * 0.2
        ;(waterMeshRef.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0.2, opacity)
      }
    } else {
      ;(waterMeshRef.current.material as THREE.MeshStandardMaterial).opacity = baseOpacity
    }
  }

  const updateHitParticles = (elapsed: number) => {
    const particles = hitParticlesRef.current
    for (let i = particles.length - 1; i >= 0; i--) {
      const alive = sonarSystemRef.current.updateHitParticle(particles[i], elapsed)
      if (!alive && sceneRef.current) {
        sceneRef.current.remove(particles[i].mesh)
        particles[i].mesh.geometry.dispose()
        ;(particles[i].mesh.material as THREE.Material).dispose()
        particles.splice(i, 1)
      }
    }
  }

  const updateBlinkAnimation = (elapsed: number) => {
    const anim = blinkAnimationRef.current
    if (!anim?.active) return

    const t = (elapsed - anim.startTime) / anim.duration
    if (t >= 1) {
      anim.active = false
      const materialInfo = targetMarkerMaterialsRef.current.get(anim.targetId)
      const markerGroup = targetMarkersRef.current.get(anim.targetId)
      if (materialInfo) {
        materialInfo.original.emissiveIntensity = 0.15
        materialInfo.glow.opacity = 0.15
      }
      if (markerGroup && materialInfo) {
        markerGroup.scale.copy(materialInfo.baseScale)
      }
      onHighlightComplete()
      return
    }

    const materialInfo = targetMarkerMaterialsRef.current.get(anim.targetId)
    const markerGroup = targetMarkersRef.current.get(anim.targetId)
    if (!materialInfo || !markerGroup) return

    const blinkCount = 3
    const blinkProgress = (t * blinkCount) % 1
    const isVisible = blinkProgress < 0.5
    const blinkPulse = Math.sin(blinkProgress * Math.PI * 2) * 0.5 + 0.5

    if (isVisible) {
      materialInfo.original.emissiveIntensity = 0.15 + blinkPulse * 0.85
      materialInfo.glow.opacity = 0.15 + blinkPulse * 0.55
      const scale = materialInfo.baseScale.x * (1 + blinkPulse * 0.25)
      markerGroup.scale.setScalar(scale)
    } else {
      materialInfo.original.emissiveIntensity = 0.02
      materialInfo.glow.opacity = 0.02
      markerGroup.scale.copy(materialInfo.baseScale)
    }
  }

  const handleMarkerConfirm = useCallback(async () => {
    if (!markerPosition || !markerName.trim()) return

    try {
      const newTarget = await TargetMarkerApi.create({
        name: markerName.trim(),
        type: markerType,
        x: markerPosition.x,
        y: markerPosition.y,
        z: markerPosition.z,
      })

      setTargets(prev => [...prev, newTarget])
      onTargetAdded(newTarget)
      addTargetMarkerToScene(newTarget)
    } catch (error) {
      console.error('Failed to create target:', error)
    }

    setShowMarkerDialog(false)
    setMarkerPosition(null)
    setMarkerName('')
    setMarkerType('unidentified')
  }, [markerPosition, markerName, markerType, onTargetAdded])

  const handleMarkerCancel = useCallback(() => {
    setShowMarkerDialog(false)
    setMarkerPosition(null)
    setMarkerName('')
    setMarkerType('unidentified')
  }, [])

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {showMarkerDialog && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#00000080',
            animation: 'fadeIn 0.3s ease-in-out',
            zIndex: 100,
          }}
          onClick={handleMarkerCancel}
        >
          <div
            style={{
              backgroundColor: 'rgba(10, 19, 47, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 191, 255, 0.25)',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '320px',
              color: 'white',
              boxShadow: '0 0 20px rgba(0, 191, 255, 0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#00BFFF' }}>
              添加目标标记
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#aaa' }}>
                目标名称
              </label>
              <input
                type="text"
                value={markerName}
                onChange={e => setMarkerName(e.target.value)}
                placeholder="请输入目标名称"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 191, 255, 0.3)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#aaa' }}>
                目标类型
              </label>
              <select
                value={markerType}
                onChange={e => setMarkerType(e.target.value as TargetType)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 191, 255, 0.3)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="shipwreck">沉船</option>
                <option value="coral">珊瑚礁</option>
                <option value="unidentified">不明物体</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleMarkerCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                取消
              </button>
              <button
                onClick={handleMarkerConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(0, 191, 255, 0.6)',
                  color: 'white',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 191, 255, 0.85)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 191, 255, 0.6)'
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default SonarScene
