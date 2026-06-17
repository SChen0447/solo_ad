import * as THREE from 'three'

export interface CameraState {
  camera: THREE.PerspectiveCamera
  targetPosition: THREE.Vector3
  targetLookAt: THREE.Vector3
  smoothness: number
  heightOffset: number
  distance: number
  angleOffset: number
}

export function createCamera(
  width: number,
  height: number,
  startPosition: THREE.Vector3
): CameraState {
  const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 5000)

  const dir = new THREE.Vector3(0, 0, -1)
  const cameraPos = startPosition.clone()
    .add(dir.multiplyScalar(-25))
    .add(new THREE.Vector3(0, 15, 0))

  camera.position.copy(cameraPos)
  camera.lookAt(startPosition)

  return {
    camera,
    targetPosition: cameraPos.clone(),
    targetLookAt: startPosition.clone(),
    smoothness: 0.08,
    heightOffset: 15,
    distance: 28,
    angleOffset: 0
  }
}

export function updateThirdPersonCamera(
  state: CameraState,
  vehiclePosition: THREE.Vector3,
  vehicleForward: THREE.Vector3,
  vehicleUp: THREE.Vector3,
  deltaTime: number
): void {
  const { camera } = state

  const forward = vehicleForward.clone().normalize()
  const up = vehicleUp.clone().normalize()

  const desiredCamPos = vehiclePosition.clone()
    .add(forward.multiplyScalar(-state.distance))
    .add(up.multiplyScalar(state.heightOffset))

  const smoothFactor = Math.min(1, state.smoothness * (deltaTime * 60))
  camera.position.lerp(desiredCamPos, smoothFactor)

  const lookTarget = vehiclePosition.clone()
    .add(vehicleForward.clone().multiplyScalar(12))
    .add(up.multiplyScalar(2))

  state.targetLookAt.lerp(lookTarget, smoothFactor)
  camera.lookAt(state.targetLookAt)
}

export function resizeCamera(
  state: CameraState,
  width: number,
  height: number
): void {
  state.camera.aspect = width / height
  state.camera.updateProjectionMatrix()
}
