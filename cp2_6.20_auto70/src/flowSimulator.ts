import * as THREE from 'three';

export type FlowMode = 'laminar' | 'vortex' | 'turbulence';

interface FlowState {
  mode: FlowMode;
  previousMode: FlowMode;
  transitionProgress: number;
  transitionDuration: number;
  isTransitioning: boolean;
  time: number;
}

const state: FlowState = {
  mode: 'laminar',
  previousMode: 'laminar',
  transitionProgress: 1,
  transitionDuration: 1000,
  isTransitioning: false,
  time: 0
};

export function switchMode(newMode: FlowMode): void {
  if (newMode === state.mode) return;
  state.previousMode = state.mode;
  state.mode = newMode;
  state.transitionProgress = 0;
  state.isTransitioning = true;
}

export function getCurrentMode(): FlowMode {
  return state.mode;
}

export function isTransitioning(): boolean {
  return state.isTransitioning;
}

export function updateFlowTime(delta: number): void {
  state.time += delta;
  if (state.isTransitioning) {
    state.transitionProgress += (delta * 1000) / state.transitionDuration;
    if (state.transitionProgress >= 1) {
      state.transitionProgress = 1;
      state.isTransitioning = false;
    }
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function computeLaminarVelocity(position: THREE.Vector3, time: number): THREE.Vector3 {
  const velocity = new THREE.Vector3();
  velocity.x = 0.5 + 0.2 * Math.sin(position.y * 0.3 + time * 0.5);
  velocity.y = 0.1 * Math.sin(position.x * 0.2);
  velocity.z = 0.3 * Math.cos(position.x * 0.25 + time * 0.3);
  return velocity;
}

function computeVortexVelocity(position: THREE.Vector3, time: number): THREE.Vector3 {
  const velocity = new THREE.Vector3();
  const radius = Math.sqrt(position.x * position.x + position.z * position.z);
  const angle = Math.atan2(position.z, position.x);
  const angularSpeed = 2.0 / (radius + 1.0);
  const upFlow = 0.5 * Math.sin(time * 0.3 + radius * 0.2);
  
  velocity.x = -Math.sin(angle) * angularSpeed * radius;
  velocity.z = Math.cos(angle) * angularSpeed * radius;
  velocity.y = upFlow + 0.3 * Math.sin(angle * 2 + time);
  return velocity;
}

function computeTurbulenceVelocity(position: THREE.Vector3, time: number): THREE.Vector3 {
  const velocity = new THREE.Vector3();
  const freq1 = 0.4;
  const freq2 = 0.7;
  const freq3 = 1.1;
  const amp1 = 0.8;
  const amp2 = 0.5;
  const amp3 = 0.3;
  
  velocity.x = amp1 * Math.sin(position.y * freq1 + time)
             + amp2 * Math.cos(position.z * freq2 + time * 1.3)
             + amp3 * Math.sin(position.x * freq3 + time * 0.7);
  
  velocity.y = amp1 * Math.cos(position.z * freq1 + time * 0.8)
             + amp2 * Math.sin(position.x * freq2 + time * 1.1)
             + amp3 * Math.cos(position.y * freq3 + time * 0.5);
  
  velocity.z = amp1 * Math.sin(position.x * freq1 + time * 1.2)
             + amp2 * Math.cos(position.y * freq2 + time * 0.9)
             + amp3 * Math.sin(position.z * freq3 + time * 0.6);
  
  return velocity;
}

function getVelocityForMode(mode: FlowMode, position: THREE.Vector3, time: number): THREE.Vector3 {
  switch (mode) {
    case 'laminar':
      return computeLaminarVelocity(position, time);
    case 'vortex':
      return computeVortexVelocity(position, time);
    case 'turbulence':
      return computeTurbulenceVelocity(position, time);
    default:
      return computeLaminarVelocity(position, time);
  }
}

export function computeVelocity(position: THREE.Vector3): THREE.Vector3 {
  const currentTime = state.time;
  
  if (!state.isTransitioning) {
    return getVelocityForMode(state.mode, position, currentTime);
  }
  
  const prevVelocity = getVelocityForMode(state.previousMode, position, currentTime);
  const nextVelocity = getVelocityForMode(state.mode, position, currentTime);
  const t = easeInOutCubic(state.transitionProgress);
  
  return prevVelocity.clone().lerp(nextVelocity, t);
}
