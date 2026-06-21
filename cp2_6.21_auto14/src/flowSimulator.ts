import * as THREE from 'three';

export type FlowMode = 'laminar' | 'vortex' | 'turbulence';

let currentMode: FlowMode = 'laminar';
let targetMode: FlowMode = 'laminar';
let transitionProgress: number = 1;
const transitionDuration: number = 1.0;
let transitionActive: boolean = false;

const tmpVel1 = new THREE.Vector3();
const tmpVel2 = new THREE.Vector3();

function laminarField(pos: THREE.Vector3, out: THREE.Vector3): void {
  const speed = 2;
  out.set(
    speed * (1 + 0.3 * Math.sin(pos.y * 0.5)),
    0.2 * Math.cos(pos.x * 0.3),
    0.5 * Math.sin(pos.x * 0.2 + pos.z * 0.3)
  );
}

function vortexField(pos: THREE.Vector3, out: THREE.Vector3): void {
  const centerX = 0;
  const centerZ = 0;
  const dx = pos.x - centerX;
  const dz = pos.z - centerZ;
  const dist = Math.sqrt(dx * dx + dz * dz) + 0.5;
  const strength = 3.0;
  
  const angularSpeed = strength / dist;
  const upwardSpeed = 1.5 / (dist * 0.5 + 1);
  
  out.set(
    -dz * angularSpeed,
    upwardSpeed,
    dx * angularSpeed
  );
}

function turbulenceField(pos: THREE.Vector3, out: THREE.Vector3): void {
  const t = performance.now() * 0.0003;
  const scale = 0.4;
  const nx = pos.x * scale + t;
  const ny = pos.y * scale + t * 0.7;
  const nz = pos.z * scale + t * 1.3;
  
  const vx = Math.sin(nx) * Math.cos(ny * 1.3) + Math.sin(nz * 0.8) * 1.5;
  const vy = Math.cos(nx * 0.9) * Math.sin(nz) + Math.sin(ny * 1.1) * 1.2;
  const vz = Math.sin(ny * 1.2) * Math.cos(nx) + Math.cos(nz * 0.7) * 1.3;
  
  out.set(vx, vy, vz).multiplyScalar(1.2);
}

export function computeVelocity(position: THREE.Vector3, out: THREE.Vector3): void {
  if (transitionActive && transitionProgress < 1) {
    computeVelocityForMode(currentMode, position, tmpVel1);
    computeVelocityForMode(targetMode, position, tmpVel2);
    out.lerpVectors(tmpVel1, tmpVel2, transitionProgress);
  } else {
    computeVelocityForMode(currentMode, position, out);
  }
}

function computeVelocityForMode(mode: FlowMode, pos: THREE.Vector3, out: THREE.Vector3): void {
  switch (mode) {
    case 'laminar':
      laminarField(pos, out);
      break;
    case 'vortex':
      vortexField(pos, out);
      break;
    case 'turbulence':
      turbulenceField(pos, out);
      break;
  }
}

export function switchMode(mode: FlowMode): void {
  if (mode === currentMode && !transitionActive) return;
  targetMode = mode;
  transitionProgress = 0;
  transitionActive = true;
}

export function updateFlow(deltaTime: number): void {
  if (transitionActive) {
    transitionProgress += deltaTime / transitionDuration;
    if (transitionProgress >= 1) {
      transitionProgress = 1;
      transitionActive = false;
      currentMode = targetMode;
    }
  }
}

export function getCurrentMode(): FlowMode {
  return transitionActive ? targetMode : currentMode;
}
