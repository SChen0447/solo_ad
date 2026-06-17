import * as THREE from 'three'
import type { InputState, PlayerPhysicsState } from './gameLoop'
import type { IslandData } from './terrainGenerator'
import type { EnergyRing } from './energyRing'

export const VEHICLE_BOUNDS = {
  length: 10,
  width: 6,
  height: 3
}

export function setupKeyboardInput(inputState: InputState): () => void {
  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'forward',
    ArrowUp: 'forward',
    KeyS: 'backward',
    ArrowDown: 'backward',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'up',
    ShiftLeft: 'down',
    ShiftRight: 'down'
  }

  const pressedKeys = new Set<string>()

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    const inputKey = keyMap[e.code]
    if (inputKey) {
      inputState[inputKey] = true
      pressedKeys.add(e.code)
      e.preventDefault()
    }
  }

  const handleKeyUp = (e: KeyboardEvent): void => {
    const inputKey = keyMap[e.code]
    if (inputKey) {
      inputState[inputKey] = false
      pressedKeys.delete(e.code)
      e.preventDefault()
    }
  }

  const handleWindowBlur = (): void => {
    pressedKeys.clear()
    ;(Object.keys(inputState) as Array<keyof InputState>).forEach((k) => {
      inputState[k] = false
    })
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleWindowBlur)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', handleWindowBlur)
  }
}

export function updateVehicleOrientation(
  vehicleGroup: THREE.Group,
  physics: PlayerPhysicsState,
  input: InputState,
  deltaTime: number
): void {
  vehicleGroup.position.copy(physics.position)

  const lookTarget = physics.position.clone().add(physics.forward)
  const tempMatrix = new THREE.Matrix4()
  tempMatrix.lookAt(physics.position, lookTarget, physics.up)
  vehicleGroup.quaternion.setFromRotationMatrix(tempMatrix)
  vehicleGroup.rotateX(Math.PI / 2)

  const rollTarget = input.left ? 0.4 : input.right ? -0.4 : 0
  const pitchTarget = input.up ? -0.25 : input.down ? 0.25 : 0

  const currentRoll = vehicleGroup.rotation.z
  const currentPitch = vehicleGroup.rotation.x - Math.PI / 2

  const smoothFactor = Math.min(1, deltaTime * 8)
  const newRoll = THREE.MathUtils.lerp(currentRoll, rollTarget, smoothFactor)
  const newPitch = THREE.MathUtils.lerp(currentPitch, pitchTarget, smoothFactor)

  vehicleGroup.rotation.z = newRoll
  vehicleGroup.rotation.x = Math.PI / 2 + newPitch
}

export function collectRing(
  ring: EnergyRing,
  scene: THREE.Scene,
  physics: PlayerPhysicsState,
  currentTime: number
): void {
  if (ring.collected) return

  ring.collected = true

  scene.remove(ring.mesh)
  ring.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })

  physics.boostMultiplier = 1.6
  physics.boostEndTime = currentTime + 3000

  createCollectParticles(scene, ring.position)
}

export function checkRingCollisions(
  physics: PlayerPhysicsState,
  rings: EnergyRing[],
  scene: THREE.Scene,
  currentTime: number,
  onRingCollected: (collected: number, total: number) => void
): boolean {
  let collected = false

  for (const ring of rings) {
    if (ring.collected) continue

    if (isVehicleCollidingWithRing(physics, ring)) {
      collectRing(ring, scene, physics, currentTime)
      collected = true

      const collectedCount = rings.filter((r) => r.collected).length
      onRingCollected(collectedCount, rings.length)
      break
    }
  }

  return collected
}

function isVehicleCollidingWithRing(
  physics: PlayerPhysicsState,
  ring: EnergyRing
): boolean {
  const ringRadius = ring.radius
  const vehicleRadius = Math.max(VEHICLE_BOUNDS.length, VEHICLE_BOUNDS.width) * 0.5
  const collisionRadius = ringRadius + vehicleRadius

  const dist = physics.position.distanceTo(ring.position)
  return dist < collisionRadius
}

export function checkIslandCollisions(
  physics: PlayerPhysicsState,
  islands: IslandData[],
  currentTime: number,
  onCollision: () => void
): boolean {
  if (physics.isColliding) return false

  for (const island of islands) {
    if (isVehicleCollidingWithIsland(physics, island)) {
      physics.speed = 0
      physics.isColliding = true
      physics.collisionEndTime = currentTime + 300
      physics.isFlashing = true
      physics.flashEndTime = currentTime + 500

      pushVehicleAwayFromIsland(physics, island)

      onCollision()
      return true
    }
  }

  return false
}

function isVehicleCollidingWithIsland(
  physics: PlayerPhysicsState,
  island: IslandData
): boolean {
  const halfLength = VEHICLE_BOUNDS.length * 0.5
  const halfWidth = VEHICLE_BOUNDS.width * 0.5
  const halfHeight = VEHICLE_BOUNDS.height * 0.5

  const forward = physics.forward.clone().normalize()
  const right = physics.right.clone().normalize()
  const up = physics.up.clone().normalize()

  const vehicleCorners: THREE.Vector3[] = []
  for (let l = -1; l <= 1; l += 2) {
    for (let w = -1; w <= 1; w += 2) {
      for (let h = -1; h <= 1; h += 2) {
        const corner = physics.position
          .clone()
          .add(forward.multiplyScalar(l * halfLength))
          .add(right.multiplyScalar(w * halfWidth))
          .add(up.multiplyScalar(h * halfHeight))
        vehicleCorners.push(corner)
      }
    }
  }

  const islandHeight = island.size * 0.6
  const islandTop = island.position.y + islandHeight * 0.5
  const islandBottom = island.position.y - islandHeight * 0.5

  for (const corner of vehicleCorners) {
    const dx = corner.x - island.position.x
    const dz = corner.z - island.position.z
    const horizontalDist = Math.sqrt(dx * dx + dz * dz)

    if (
      horizontalDist < island.collisionRadius * 0.92 &&
      corner.y > islandBottom - 5 &&
      corner.y < islandTop + 5
    ) {
      return true
    }
  }

  return false
}

function pushVehicleAwayFromIsland(
  physics: PlayerPhysicsState,
  island: IslandData
): void {
  const dx = physics.position.x - island.position.x
  const dz = physics.position.z - island.position.z
  const horizontalDist = Math.sqrt(dx * dx + dz * dz)

  if (horizontalDist > 0.001) {
    const pushDistance = island.collisionRadius * 0.15
    const pushX = (dx / horizontalDist) * pushDistance
    const pushZ = (dz / horizontalDist) * pushDistance
    physics.position.x += pushX
    physics.position.z += pushZ
  }
}

function createCollectParticles(scene: THREE.Scene, position: THREE.Vector3): void {
  const particleCount = 25
  const particles = new THREE.Group()

  for (let i = 0; i < particleCount; i++) {
    const size = 0.2 + Math.random() * 0.5
    const geom = new THREE.SphereGeometry(size, 6, 6)
    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xffd700 : 0xffaa00,
      transparent: true,
      opacity: 1.0
    })
    const particle = new THREE.Mesh(geom, mat)

    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 4
    particle.position.set(
      position.x + Math.cos(angle) * radius,
      position.y + (Math.random() - 0.5) * 6,
      position.z + Math.sin(angle) * radius
    )
    ;(particle as any).userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 35,
        Math.random() * 30 + 15,
        (Math.random() - 0.5) * 35
      ),
      life: 1.0
    }
    particles.add(particle)
  }

  scene.add(particles)

  let startTime = performance.now()
  const animateParticles = () => {
    const elapsed = (performance.now() - startTime) / 1000
    if (elapsed > 1.2) {
      scene.remove(particles)
      particles.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
      return
    }

    const dt = 0.016
    particles.children.forEach((child) => {
      const particle = child as THREE.Mesh
      const data = (particle as any).userData
      particle.position.add(data.velocity.clone().multiplyScalar(dt))
      data.velocity.y -= 35 * dt
      ;(particle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - elapsed / 1.2)
      particle.scale.setScalar(Math.max(0.1, 1 - elapsed * 0.8))
    })

    requestAnimationFrame(animateParticles)
  }
  animateParticles()
}

export function collisionFlashEffect(
  bodyMeshes: THREE.Mesh[],
  duration: number = 500
): void {
  const originalEmissives: { color: THREE.Color; intensity: number }[] = []

  bodyMeshes.forEach((mesh) => {
    const mat = mesh.material as THREE.MeshStandardMaterial
    originalEmissives.push({
      color: mat.emissive.clone(),
      intensity: mat.emissiveIntensity
    })

    mat.emissive = new THREE.Color(0xff2200)
    mat.emissiveIntensity = 1.5
  })

  const startTime = performance.now()
  const flashInterval = 70

  const flash = () => {
    const elapsed = performance.now() - startTime
    if (elapsed >= duration) {
      bodyMeshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.emissive.copy(originalEmissives[i].color)
        mat.emissiveIntensity = originalEmissives[i].intensity
        mesh.visible = true
      })
      return
    }

    const phase = Math.floor(elapsed / flashInterval) % 2
    const visible = phase === 0

    bodyMeshes.forEach((mesh) => {
      mesh.visible = visible
    })

    setTimeout(flash, flashInterval)
  }

  setTimeout(flash, 10)
}
