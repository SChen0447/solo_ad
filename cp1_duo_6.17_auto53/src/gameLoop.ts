import * as THREE from 'three'
import type { CameraState } from './cameraControl'
import type { IslandData } from './terrainGenerator'
import type { EnergyRing } from './energyRing'
import { updateThirdPersonCamera } from './cameraControl'
import { updateRingsAnimation, updateRecommendedPathAnimation } from './energyRing'
import { checkIslandCollisions, checkRingCollisions } from './playerController'

export interface GameLoopState {
  running: boolean
  paused: boolean
  startTime: number
  elapsedTime: number
  lastFrameTime: number
  frameCount: number
  fps: number
}

export interface PlayerPhysicsState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  forward: THREE.Vector3
  up: THREE.Vector3
  right: THREE.Vector3
  speed: number
  maxSpeed: number
  acceleration: number
  turnSpeed: number
  pitchSpeed: number
  liftSpeed: number
  drag: number
  boostMultiplier: number
  boostEndTime: number
  isColliding: boolean
  collisionEndTime: number
  isFlashing: boolean
  flashEndTime: number
}

export function createGameLoopState(): GameLoopState {
  return {
    running: false,
    paused: false,
    startTime: 0,
    elapsedTime: 0,
    lastFrameTime: performance.now(),
    frameCount: 0,
    fps: 60
  }
}

export function createPlayerPhysicsState(
  startPosition: THREE.Vector3
): PlayerPhysicsState {
  return {
    position: startPosition.clone(),
    velocity: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(1, 0, 0),
    speed: 0,
    maxSpeed: 120,
    acceleration: 60,
    turnSpeed: 1.8,
    pitchSpeed: 1.2,
    liftSpeed: 40,
    drag: 0.9,
    boostMultiplier: 1.0,
    boostEndTime: 0,
    isColliding: false,
    collisionEndTime: 0,
    isFlashing: false,
    flashEndTime: 0
  }
}

export interface InputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

export function createInputState(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  }
}

export interface GameCallbacks {
  onSpeedChange: (speed: number) => void
  onRingCollected: (index: number, total: number) => void
  onCollision: () => void
  onLapComplete: (time: number) => void
  onFinish: (time: number) => void
  onTimerUpdate: (time: number) => void
}

export function updatePlayerPhysics(
  physics: PlayerPhysicsState,
  input: InputState,
  deltaTime: number,
  currentTime: number
): void {
  if (physics.boostEndTime > 0 && currentTime > physics.boostEndTime) {
    physics.boostMultiplier = 1.0
    physics.boostEndTime = 0
  }

  if (physics.isColliding && currentTime > physics.collisionEndTime) {
    physics.isColliding = false
  }

  if (physics.isFlashing && currentTime > physics.flashEndTime) {
    physics.isFlashing = false
  }

  const effectiveMaxSpeed = physics.maxSpeed * physics.boostMultiplier

  if (!physics.isColliding) {
    if (input.forward) {
      physics.speed += physics.acceleration * deltaTime * physics.boostMultiplier
    }
    if (input.backward) {
      physics.speed -= physics.acceleration * 0.5 * deltaTime
    }
  }

  const hasMovementInput = input.forward || input.backward
  if (!hasMovementInput) {
    const stopFactor = deltaTime / 0.3
    physics.speed *= Math.max(0, 1 - stopFactor * 0.8)
  }

  physics.speed = THREE.MathUtils.clamp(physics.speed, -20, effectiveMaxSpeed)

  const turnFactor = THREE.MathUtils.clamp(
    Math.abs(physics.speed) / 30,
    0.3,
    1.0
  )

  if (input.left) {
    rotateAroundAxis(
      physics.forward,
      physics.up,
      physics.turnSpeed * turnFactor * deltaTime
    )
  }
  if (input.right) {
    rotateAroundAxis(
      physics.forward,
      physics.up,
      -physics.turnSpeed * turnFactor * deltaTime
    )
  }

  if (input.up) {
    const pitchAxis = new THREE.Vector3()
      .crossVectors(physics.forward, physics.up)
      .normalize()
    rotateAroundAxis(
      physics.forward,
      pitchAxis,
      -physics.pitchSpeed * turnFactor * deltaTime
    )
    rotateAroundAxis(
      physics.up,
      pitchAxis,
      -physics.pitchSpeed * turnFactor * deltaTime
    )
  }
  if (input.down) {
    const pitchAxis = new THREE.Vector3()
      .crossVectors(physics.forward, physics.up)
      .normalize()
    rotateAroundAxis(
      physics.forward,
      pitchAxis,
      physics.pitchSpeed * turnFactor * deltaTime
    )
    rotateAroundAxis(
      physics.up,
      pitchAxis,
      physics.pitchSpeed * turnFactor * deltaTime
    )
  }

  physics.forward.normalize()
  physics.up.normalize()
  physics.right.crossVectors(physics.forward, physics.up).normalize()
  physics.up.crossVectors(physics.right, physics.forward).normalize()

  if (!physics.isColliding) {
    const moveSpeed = physics.speed * deltaTime
    physics.position.add(physics.forward.clone().multiplyScalar(moveSpeed))
  }

  if (physics.position.y < 10) {
    physics.position.y = 10
    physics.speed *= 0.95
  }

  if (physics.position.y > 500) {
    physics.position.y = 500
    physics.speed *= 0.95
  }
}

function rotateAroundAxis(
  vector: THREE.Vector3,
  axis: THREE.Vector3,
  angle: number
): void {
  const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  vector.applyQuaternion(quat)
}

export function checkFinishLine(
  physics: PlayerPhysicsState,
  islands: IslandData[],
  hasFinished: boolean,
  onFinish: (time: number) => void,
  currentTime: number,
  startTime: number
): boolean {
  if (hasFinished) return true

  const finishIsland = islands.find((i) => i.isFinish)
  if (!finishIsland) return false

  const dx = physics.position.x - finishIsland.position.x
  const dz = physics.position.z - finishIsland.position.z
  const dy = physics.position.y - (finishIsland.position.y + 40)

  const horizontalDist = Math.sqrt(dx * dx + dz * dz)
  const verticalDist = Math.abs(dy)

  if (horizontalDist < finishIsland.size * 0.4 && verticalDist < 50) {
    onFinish(currentTime - startTime)
    return true
  }

  return false
}

export function gameLoopStep(
  loopState: GameLoopState,
  physics: PlayerPhysicsState,
  input: InputState,
  cameraState: CameraState,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  islands: IslandData[],
  rings: EnergyRing[],
  _vehicleGroup: THREE.Group,
  recommendedArrows: THREE.Group[],
  callbacks: GameCallbacks,
  hasFinished: { value: boolean }
): void {
  const now = performance.now()
  const deltaTime = Math.min((now - loopState.lastFrameTime) / 1000, 0.05)
  loopState.lastFrameTime = now

  if (!loopState.running || loopState.paused) {
    renderer.render(scene, cameraState.camera)
    return
  }

  const currentTime = now
  loopState.elapsedTime = currentTime - loopState.startTime

  loopState.frameCount++
  if (loopState.frameCount % 30 === 0) {
    loopState.fps = Math.round(1 / deltaTime)
  }

  updatePlayerPhysics(physics, input, deltaTime, currentTime)

  checkIslandCollisions(physics, islands, currentTime, callbacks.onCollision)

  checkRingCollisions(
    physics,
    rings,
    scene,
    currentTime,
    callbacks.onRingCollected
  )

  const finished = checkFinishLine(
    physics,
    islands,
    hasFinished.value,
    callbacks.onFinish,
    currentTime,
    loopState.startTime
  )
  if (finished) {
    hasFinished.value = true
    loopState.paused = true
  }

  const speedKmh = Math.round(Math.abs(physics.speed) * 3.6)
  callbacks.onSpeedChange(speedKmh)

  if (!hasFinished.value) {
    callbacks.onTimerUpdate(loopState.elapsedTime)
  }

  updateRingsAnimation(rings, loopState.elapsedTime)

  updateRecommendedPathAnimation(recommendedArrows, loopState.elapsedTime)

  updateThirdPersonCamera(
    cameraState,
    physics.position,
    physics.forward,
    physics.up,
    deltaTime
  )

  renderer.render(scene, cameraState.camera)
}

export function formatTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const centiseconds = Math.floor((ms % 1000) / 10)

  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(centiseconds).padStart(2, '0')
  )
}
