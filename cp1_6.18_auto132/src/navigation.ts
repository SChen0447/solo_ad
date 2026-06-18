import * as THREE from 'three';
import type { BranchNode, Particle } from './stores/caveStore';

const EASING_FACTOR = 0.1;
const FLY_DURATION = 1.5;
const WALL_HIGHLIGHT_DISTANCE = 5;

export function handleMovement(
  keys: Set<string>,
  camera: THREE.Camera,
  cameraTarget: THREE.Vector3,
  deltaTime: number,
  tunnelPaths: THREE.Vector3[][]
): { newCameraPos: THREE.Vector3; newCameraTarget: THREE.Vector3; wallProximity: number } {
  const speed = 20 * deltaTime;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const movement = new THREE.Vector3();

  if (keys.has('w') || keys.has('W')) movement.add(forward.clone().multiplyScalar(speed));
  if (keys.has('s') || keys.has('S')) movement.add(forward.clone().multiplyScalar(-speed));
  if (keys.has('a') || keys.has('A')) movement.add(right.clone().multiplyScalar(-speed));
  if (keys.has('d') || keys.has('D')) movement.add(right.clone().multiplyScalar(speed));

  const newPos = camera.position.clone().add(movement);

  let wallProximity = 0;
  let minDist = Infinity;
  for (const path of tunnelPaths) {
    for (const pt of path) {
      const dist = newPos.distanceTo(pt);
      if (dist < minDist) {
        minDist = dist;
      }
      if (dist < WALL_HIGHLIGHT_DISTANCE) break;
    }
    if (minDist < WALL_HIGHLIGHT_DISTANCE) break;
  }

  if (minDist < WALL_HIGHLIGHT_DISTANCE) {
    wallProximity = 1 - minDist / WALL_HIGHLIGHT_DISTANCE;
  }

  const easedPos = new THREE.Vector3().lerpVectors(
    camera.position,
    newPos,
    EASING_FACTOR
  );

  const targetOffset = forward.clone().multiplyScalar(10);
  targetOffset.y = -5;
  const newTarget = easedPos.clone().add(targetOffset);

  const easedTarget = new THREE.Vector3().lerpVectors(
    cameraTarget,
    newTarget,
    EASING_FACTOR
  );

  return {
    newCameraPos: easedPos,
    newCameraTarget: easedTarget,
    wallProximity,
  };
}

export function flyToNode(
  fromPos: THREE.Vector3,
  toNode: BranchNode,
  elapsed: number,
  fromTarget: THREE.Vector3
): { position: THREE.Vector3; target: THREE.Vector3; progress: number; particles: Particle[] } {
  const t = Math.min(elapsed / FLY_DURATION, 1);
  const easedT = easeInOutCubic(t);

  const position = new THREE.Vector3().lerpVectors(fromPos, toNode.position, easedT);
  position.y += 5;

  const target = toNode.position.clone();
  const easedTarget = new THREE.Vector3().lerpVectors(fromTarget, target, easedT);

  const particles: Particle[] = [];
  if (t < 1) {
    for (let i = 0; i < 2; i++) {
      particles.push({
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          )
        ),
        life: 1.0,
        maxLife: 1.0,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 2,
          (Math.random() - 0.5) * 2
        ),
      });
    }
  }

  return { position, target: easedTarget, progress: t, particles };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function checkCollision(
  position: THREE.Vector3,
  tunnelPaths: THREE.Vector3[][],
  radius: number = 3
): boolean {
  for (const path of tunnelPaths) {
    for (const pt of path) {
      const dist = position.distanceTo(pt);
      if (dist < radius) return true;
    }
  }
  return false;
}

export function getWallDistance(
  position: THREE.Vector3,
  tunnelPaths: THREE.Vector3[][]
): number {
  let minDist = Infinity;
  for (const path of tunnelPaths) {
    for (const pt of path) {
      const dist = position.distanceTo(pt);
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }
  return minDist;
}

export function clampCameraAngle(
  camera: THREE.PerspectiveCamera,
  minDeg: number = 45,
  maxDeg: number = 75
): void {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const angle = THREE.MathUtils.radToDeg(Math.asin(-dir.y));
  if (angle < minDeg) {
    const correction = THREE.MathUtils.degToRad(minDeg - angle);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    camera.rotateOnAxis(right, -correction);
  } else if (angle > maxDeg) {
    const correction = THREE.MathUtils.degToRad(angle - maxDeg);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    camera.rotateOnAxis(right, correction);
  }
}
