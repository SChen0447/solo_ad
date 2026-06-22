import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface InteractionState {
  controls: OrbitControls;
  targetZoomDistance: number;
  currentZoomDistance: number;
  isResetting: boolean;
  resetProgress: number;
  resetStartPosition: THREE.Vector3;
  resetStartTarget: THREE.Vector3;
  initialPosition: THREE.Vector3;
  initialTarget: THREE.Vector3;
}

export function createInteraction(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): InteractionState {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.3;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 20;

  const initialPosition = camera.position.clone();
  const initialTarget = controls.target.clone();

  const state: InteractionState = {
    controls,
    targetZoomDistance: camera.position.length(),
    currentZoomDistance: camera.position.length(),
    isResetting: false,
    resetProgress: 0,
    resetStartPosition: new THREE.Vector3(),
    resetStartTarget: new THREE.Vector3(),
    initialPosition,
    initialTarget,
  };

  domElement.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.01;
    state.targetZoomDistance += zoomDelta;
    state.targetZoomDistance = THREE.MathUtils.clamp(
      state.targetZoomDistance,
      2,
      20
    );
  }, { passive: false });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'r' || e.key === 'R') {
      if (!state.isResetting) {
        state.isResetting = true;
        state.resetProgress = 0;
        state.resetStartPosition.copy(camera.position);
        state.resetStartTarget.copy(controls.target);
      }
    }
  });

  return state;
}

export function updateInteraction(state: InteractionState, delta: number): void {
  if (state.isResetting) {
    state.resetProgress += delta;
    const t = Math.min(state.resetProgress / 1.0, 1.0);
    const eased = easeInOutCubic(t);

    state.controls.object.position.lerpVectors(
      state.resetStartPosition,
      state.initialPosition,
      eased
    );
    state.controls.target.lerpVectors(
      state.resetStartTarget,
      state.initialTarget,
      eased
    );

    state.currentZoomDistance = state.controls.object.position.length();
    state.targetZoomDistance = state.currentZoomDistance;

    if (t >= 1.0) {
      state.isResetting = false;
    }
  } else {
    const smoothing = 1.0 - Math.exp(-delta / 0.5);
    state.currentZoomDistance += (state.targetZoomDistance - state.currentZoomDistance) * smoothing;

    const direction = new THREE.Vector3();
    state.controls.object.getWorldDirection(direction);
    direction.negate();

    const targetPosition = state.controls.target.clone().add(
      direction.multiplyScalar(state.currentZoomDistance)
    );
    state.controls.object.position.copy(targetPosition);
  }

  state.controls.update();
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
