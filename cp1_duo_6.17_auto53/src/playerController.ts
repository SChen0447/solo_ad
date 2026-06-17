import * as THREE from 'three'
import type { InputState, PlayerPhysicsState } from './gameLoop'

export function setupKeyboardInput(inputState: InputState): () => void {
  const keyMap: Record<string, keyof InputState> = {
    'KeyW': 'forward',
    'ArrowUp': 'forward',
    'KeyS': 'backward',
    'ArrowDown': 'backward',
    'KeyA': 'left',
    'ArrowLeft': 'left',
    'KeyD': 'right',
    'ArrowRight': 'right',
    'Space': 'up',
    'ShiftLeft': 'down',
    'ShiftRight': 'down'
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
    ;(Object.keys(inputState) as Array<keyof InputState>).forEach(k => {
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

export function collectRingEffect(
  _vehicleGroup: THREE.Group,
  scene: THREE.Scene,
  position: THREE.Vector3
): void {
  const particleCount = 20
  const particles = new THREE.Group()

  for (let i = 0; i < particleCount; i++) {
    const geom = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 6, 6)
    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xffd700 : 0xffaa00,
      transparent: true,
      opacity: 1.0
    })
    const particle = new THREE.Mesh(geom, mat)

    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 3
    particle.position.set(
      position.x + Math.cos(angle) * radius,
      position.y + (Math.random() - 0.5) * 4,
      position.z + Math.sin(angle) * radius
    )
    ;(particle as any).userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        Math.random() * 25 + 10,
        (Math.random() - 0.5) * 30
      ),
      life: 1.0
    }
    particles.add(particle)
  }

  scene.add(particles)

  let startTime = performance.now()
  const animateParticles = () => {
    const elapsed = (performance.now() - startTime) / 1000
    if (elapsed > 1.0) {
      scene.remove(particles)
      return
    }

    particles.children.forEach(child => {
      const particle = child as THREE.Mesh
      const data = (particle as any).userData
      particle.position.add(data.velocity.clone().multiplyScalar(0.016))
      data.velocity.y -= 30 * 0.016
      ;(particle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - elapsed)
    })

    requestAnimationFrame(animateParticles)
  }
  animateParticles()
}

export function collisionFlashEffect(
  bodyMeshes: THREE.Mesh[],
  duration: number = 500
): void {
  const originalMaterials: THREE.MeshStandardMaterial[] = []

  bodyMeshes.forEach(mesh => {
    const mat = mesh.material as THREE.MeshStandardMaterial
    originalMaterials.push(mat.clone())

    mat.emissive = new THREE.Color(0xff2200)
    mat.emissiveIntensity = 1.5
  })

  const startTime = performance.now()
  const flashInterval = 80
  let visible = true

  const flash = () => {
    const elapsed = performance.now() - startTime
    if (elapsed >= duration) {
      bodyMeshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.emissive.copy(originalMaterials[i].emissive)
        mat.emissiveIntensity = originalMaterials[i].emissiveIntensity
        mesh.visible = true
      })
      return
    }

    const phase = Math.floor(elapsed / flashInterval) % 2
    visible = phase === 0

    bodyMeshes.forEach(mesh => {
      mesh.visible = visible
    })

    setTimeout(flash, flashInterval / 2)
  }

  setTimeout(flash, 10)
}
