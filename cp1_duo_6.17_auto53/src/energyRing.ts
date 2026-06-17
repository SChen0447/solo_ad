import * as THREE from 'three'
import type { IslandData } from './terrainGenerator'

export interface EnergyRing {
  mesh: THREE.Group
  position: THREE.Vector3
  collected: boolean
  radius: number
  islandId: number
}

export function generateEnergyRings(
  islands: IslandData[],
  ringCounts: number[]
): EnergyRing[] {
  const rings: EnergyRing[] = []

  for (let i = 0; i < islands.length; i++) {
    const island = islands[i]
    if (island.isFinish) continue

    const count = ringCounts[i] || 3
    const islandHeight = island.size * 0.35

    for (let r = 0; r < count; r++) {
      const angle = (r / count) * Math.PI * 2 + (i * 0.7)
      const dist = island.size * (0.5 + Math.random() * 0.4)
      const heightOffset = islandHeight / 2 + 15 + Math.random() * 35

      const pos = new THREE.Vector3(
        island.position.x + Math.cos(angle) * dist,
        island.position.y + heightOffset,
        island.position.z + Math.sin(angle) * dist
      )

      const ring = createSingleRing()
      ring.position.copy(pos)
      ring.rotation.set(
        Math.random() * 0.3 - 0.15,
        angle + Math.PI / 2,
        Math.random() * 0.3 - 0.15
      )

      rings.push({
        mesh: ring,
        position: pos,
        collected: false,
        radius: 8,
        islandId: island.id
      })
    }
  }

  return rings
}

function createSingleRing(): THREE.Group {
  const group = new THREE.Group()

  const ringGeom = new THREE.TorusGeometry(6, 1.2, 12, 40)
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.15
  })
  const ring = new THREE.Mesh(ringGeom, ringMat)
  group.add(ring)

  const glowGeom = new THREE.TorusGeometry(7, 0.5, 8, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    transparent: true,
    opacity: 0.35
  })
  const glow = new THREE.Mesh(glowGeom, glowMat)
  group.add(glow)

  const innerGeom = new THREE.TorusGeometry(4.5, 0.4, 8, 32)
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffee88,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.9
  })
  const inner = new THREE.Mesh(innerGeom, innerMat)
  group.add(inner)

  const light = new THREE.PointLight(0xffaa00, 1.5, 40)
  group.add(light)

  ;(group as any).userData = { originalY: 0, phase: Math.random() * Math.PI * 2 }

  return group
}

export function createVehicle(): {
  group: THREE.Group
  bodyMeshes: THREE.Mesh[]
} {
  const group = new THREE.Group()
  const bodyMeshes: THREE.Mesh[] = []

  const bodyGeom = new THREE.ConeGeometry(2.5, 10, 6)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x6b21a8,
    metalness: 0.7,
    roughness: 0.25
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.rotation.x = Math.PI / 2
  body.castShadow = true
  group.add(body)
  bodyMeshes.push(body)

  const cockpitGeom = new THREE.SphereGeometry(1.8, 16, 12)
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.7
  })
  const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat)
  cockpit.position.z = -1
  cockpit.scale.set(1, 0.7, 1.2)
  cockpit.castShadow = true
  group.add(cockpit)
  bodyMeshes.push(cockpit)

  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.quadraticCurveTo(3, 0.5, 6, 0)
  wingShape.quadraticCurveTo(5, -1.5, 0, -1.5)
  wingShape.lineTo(0, 0)

  const wingGeom = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3
  })
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    metalness: 0.6,
    roughness: 0.3
  })

  const leftWing = new THREE.Mesh(wingGeom, wingMat)
  leftWing.position.set(0, -0.5, 1.5)
  leftWing.rotation.y = Math.PI / 2
  leftWing.castShadow = true
  group.add(leftWing)
  bodyMeshes.push(leftWing)

  const rightWing = new THREE.Mesh(wingGeom, wingMat)
  rightWing.position.set(0, -0.5, 1.5)
  rightWing.rotation.y = -Math.PI / 2
  rightWing.castShadow = true
  group.add(rightWing)
  bodyMeshes.push(rightWing)

  const tailGeom = new THREE.BoxGeometry(0.3, 2.5, 1.5)
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    metalness: 0.6,
    roughness: 0.3
  })
  const tail = new THREE.Mesh(tailGeom, tailMat)
  tail.position.set(0, 1, 3.5)
  tail.castShadow = true
  group.add(tail)
  bodyMeshes.push(tail)

  const engineGeom = new THREE.CylinderGeometry(1, 1.2, 3, 12)
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a4a,
    metalness: 0.8,
    roughness: 0.2
  })
  const engine = new THREE.Mesh(engineGeom, engineMat)
  engine.rotation.x = Math.PI / 2
  engine.position.z = 5
  engine.castShadow = true
  group.add(engine)
  bodyMeshes.push(engine)

  const flameGeom = new THREE.ConeGeometry(0.8, 3, 8)
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.85
  })
  const flame = new THREE.Mesh(flameGeom, flameMat)
  flame.rotation.x = -Math.PI / 2
  flame.position.z = 7.5
  flame.name = 'engineFlame'
  group.add(flame)

  const innerFlameGeom = new THREE.ConeGeometry(0.4, 2, 8)
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    transparent: true,
    opacity: 0.95
  })
  const innerFlame = new THREE.Mesh(innerFlameGeom, innerFlameMat)
  innerFlame.rotation.x = -Math.PI / 2
  innerFlame.position.z = 7.2
  innerFlame.name = 'innerFlame'
  group.add(innerFlame)

  const vehicleLight = new THREE.PointLight(0x8866ff, 1.2, 30)
  vehicleLight.position.set(0, 2, -3)
  group.add(vehicleLight)

  return { group, bodyMeshes }
}

export function updateRingsAnimation(rings: EnergyRing[], time: number): void {
  for (const ring of rings) {
    if (ring.collected) continue

    const userData = (ring.mesh as any).userData
    ring.mesh.rotation.z += 0.015
    ring.mesh.position.y = ring.position.y + Math.sin(time * 0.002 + userData.phase) * 2
  }
}

export function createRecommendedPath(
  islands: IslandData[],
  rings: EnergyRing[]
): {
  line: THREE.Line
  arrows: THREE.Group[]
} {
  const points: THREE.Vector3[] = []
  const arrows: THREE.Group[] = []

  const finishIsland = islands.find(i => i.isFinish)
  if (!finishIsland) return { line: new THREE.Line(), arrows: [] }

  const sortedIslands = [...islands].filter(i => !i.isFinish)
  sortedIslands.sort((a, b) => a.id - b.id)

  for (const island of sortedIslands) {
    const islandRings = rings.filter(r => r.islandId === island.id)
    if (islandRings.length > 0) {
      for (const r of islandRings) {
        points.push(r.position.clone())
      }
    } else {
      points.push(new THREE.Vector3(
        island.position.x,
        island.position.y + island.size * 0.5,
        island.position.z
      ))
    }
  }

  points.push(new THREE.Vector3(
    finishIsland.position.x,
    finishIsland.position.y + finishIsland.size * 0.5 + 40,
    finishIsland.position.z
  ))

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  const curvePoints = curve.getPoints(200)

  const geom = new THREE.BufferGeometry().setFromPoints(curvePoints)
  const mat = new THREE.LineDashedMaterial({
    color: 0x8b5cf6,
    dashSize: 8,
    gapSize: 6,
    transparent: true,
    opacity: 0.45
  })
  const line = new THREE.Line(geom, mat)
  line.computeLineDistances()

  for (let i = 0; i < curvePoints.length - 20; i += 25) {
    const start = curvePoints[i]
    const end = curvePoints[i + 15]

    const arrowGeom = new THREE.ConeGeometry(3, 10, 6)
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.4
    })
    const arrow = new THREE.Mesh(arrowGeom, arrowMat)

    const arrowGroup = new THREE.Group()
    arrowGroup.add(arrow)
    arrowGroup.position.copy(start)
    arrowGroup.lookAt(end)
    arrowGroup.rotateX(Math.PI / 2)

    arrows.push(arrowGroup)
  }

  return { line, arrows }
}

export function validateVehicleFaceCount(vehicle: THREE.Group): { total: number; valid: boolean } {
  const MAX_VEHICLE_FACES = 2000
  let totalTriangles = 0

  vehicle.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry
      if (geom.index) {
        totalTriangles += geom.index.count / 3
      } else if (geom.attributes.position) {
        totalTriangles += geom.attributes.position.count / 3
      }
    }
  })

  console.log(`[Vehicle] 飞行器总三角面数: ${Math.floor(totalTriangles)} / ${MAX_VEHICLE_FACES} (限制)`)

  if (totalTriangles > MAX_VEHICLE_FACES) {
    console.warn(`[Vehicle] 警告: 飞行器面数 ${Math.floor(totalTriangles)} 超过限制 ${MAX_VEHICLE_FACES}!`)
  }

  return {
    total: Math.floor(totalTriangles),
    valid: totalTriangles <= MAX_VEHICLE_FACES
  }
}

export function updateRecommendedPathAnimation(arrows: THREE.Group[], time: number): void {
  const pulse = (Math.sin(time * 0.003) + 1) * 0.5

  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i]
    const phaseOffset = i * 0.2
    const individualPulse = (Math.sin(time * 0.003 + phaseOffset) + 1) * 0.5

    arrow.scale.setScalar(0.8 + individualPulse * 0.4)

    arrow.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = 0.3 + individualPulse * 0.3
      }
    })
  }
}
