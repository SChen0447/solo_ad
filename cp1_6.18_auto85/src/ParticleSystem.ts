import * as THREE from 'three';
import { scene, buildingBoxes, GROUND_SIZE } from './SceneSetup';
import {
  useWindStore,
  WindSourceData,
  DIRECTION_VECTORS,
  WindDirection,
} from './WindSource';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  sourceId: string;
  color: THREE.Color;
  size: number;
  swirlOffset: number;
  isSwirling: boolean;
  swirlCenter: THREE.Vector3 | null;
  swirlRadius: number;
  swirlAngle: number;
  swirlSpeed: number;
  riseSpeed: number;
  originalColor: THREE.Color;
}

const MAX_PARTICLES = 8000;
const PARTICLES_PER_SOURCE = 500;

let particles: Particle[] = [];
let points: THREE.Points | null = null;
let geometry: THREE.BufferGeometry | null = null;
let positions: Float32Array | null = null;
let colors: Float32Array | null = null;
let sizes: Float32Array | null = null;

let lastEmitTime: Map<string, number> = new Map();

export function initParticleSystem() {
  geometry = new THREE.BufferGeometry();

  positions = new Float32Array(MAX_PARTICLES * 3);
  colors = new Float32Array(MAX_PARTICLES * 3);
  sizes = new Float32Array(MAX_PARTICLES);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: texture,
    sizeAttenuation: true,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  useWindStore.subscribe((state) => {
    syncWindSources(state.windSources);
  });
}

function syncWindSources(sources: WindSourceData[]) {
  const sourceIds = new Set(sources.map((s) => s.id));

  particles = particles.filter((p) => sourceIds.has(p.sourceId));

  sources.forEach((source) => {
    if (!lastEmitTime.has(source.id)) {
      lastEmitTime.set(source.id, 0);
    }
  });

  lastEmitTime.forEach((_, id) => {
    if (!sourceIds.has(id)) {
      lastEmitTime.delete(id);
    }
  });
}

export function updateParticles(delta: number, time: number) {
  const state = useWindStore.getState();
  const { windSources, highlightedId } = state;

  windSources.forEach((source) => {
    emitParticles(source, delta, time);
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    if (particle.isSwirling) {
      updateSwirlingParticle(particle, delta);
    } else {
      updateNormalParticle(particle, delta);
    }

    particle.age += delta;

    if (particle.age >= particle.life) {
      particles.splice(i, 1);
    }
  }

  checkWindSourceInteractions(windSources, delta);

  updateBuffers(highlightedId);
}

function emitParticles(source: WindSourceData, delta: number, time: number) {
  const emitRate = source.speed * 30;
  const interval = 1000 / emitRate;

  let lastEmit = lastEmitTime.get(source.id) || 0;
  const currentTime = time * 1000;

  while (currentTime - lastEmit >= interval) {
    if (particles.length < MAX_PARTICLES) {
      const particle = createParticle(source);
      particles.push(particle);
    }
    lastEmit += interval;
  }

  lastEmitTime.set(source.id, lastEmit);
}

function createParticle(source: WindSourceData): Particle {
  const dirVector = DIRECTION_VECTORS[source.direction].clone();
  const spread = 0.3;

  const offset = new THREE.Vector3(
    (Math.random() - 0.5) * 10,
    Math.random() * 5 + 1,
    (Math.random() - 0.5) * 10
  );

  const velocity = dirVector.clone();
  velocity.x += (Math.random() - 0.5) * spread;
  velocity.z += (Math.random() - 0.5) * spread;
  velocity.normalize().multiplyScalar(source.speed * 3);

  const color = new THREE.Color(source.color);

  return {
    position: source.position.clone().add(offset),
    velocity,
    age: 0,
    life: 6 + Math.random() * 4,
    sourceId: source.id,
    color: color.clone(),
    originalColor: color.clone(),
    size: 2 + Math.random() * 2,
    swirlOffset: Math.random() * Math.PI * 2,
    isSwirling: false,
    swirlCenter: null,
    swirlRadius: 0,
    swirlAngle: 0,
    swirlSpeed: 0,
    riseSpeed: 0,
  };
}

function updateNormalParticle(particle: Particle, delta: number) {
  const speed = particle.velocity.length();

  let collision = checkBuildingCollision(particle);

  if (collision.collides) {
    const tangent = new THREE.Vector3();
    const normal = collision.normal!.clone();

    if (Math.abs(normal.x) > Math.abs(normal.z)) {
      tangent.set(0, 0, normal.x > 0 ? 1 : -1);
    } else {
      tangent.set(normal.z > 0 ? 1 : -1, 0, 0);
    }

    const dot = particle.velocity.dot(tangent);
    const tangentVel = tangent.multiplyScalar(Math.abs(dot) * 0.8);

    particle.velocity.lerp(tangentVel, 0.15);

    const pushAway = collision.normal!.clone().multiplyScalar(1.5);
    particle.position.add(pushAway);

    particle.position.x += (Math.random() - 0.5) * 0.3;
    particle.position.z += (Math.random() - 0.5) * 0.3;
  }

  if (speed > 0.5) {
    particle.velocity.normalize().multiplyScalar(speed);
  }

  particle.position.add(particle.velocity.clone().multiplyScalar(delta * 60));

  particle.position.y += Math.sin(particle.age * 2 + particle.swirlOffset) * 0.05;

  const halfGround = GROUND_SIZE / 2;
  if (
    Math.abs(particle.position.x) > halfGround ||
    Math.abs(particle.position.z) > halfGround
  ) {
    particle.life = particle.age + 0.5;
  }

  particle.position.y = Math.max(0.5, particle.position.y);
}

interface CollisionResult {
  collides: boolean;
  normal: THREE.Vector3 | null;
  buildingIndex: number;
}

function checkBuildingCollision(particle: Particle): CollisionResult {
  const result: CollisionResult = {
    collides: false,
    normal: null,
    buildingIndex: -1,
  };

  const particleRadius = 2;

  for (let i = 0; i < buildingBoxes.length; i++) {
    const box = buildingBoxes[i];

    if (
      particle.position.x + particleRadius > box.min.x &&
      particle.position.x - particleRadius < box.max.x &&
      particle.position.z + particleRadius > box.min.z &&
      particle.position.z - particleRadius < box.max.z &&
      particle.position.y < box.max.y
    ) {
      const centerX = (box.min.x + box.max.x) / 2;
      const centerZ = (box.min.z + box.max.z) / 2;

      const dx = particle.position.x - centerX;
      const dz = particle.position.z - centerZ;

      const halfWidth = (box.max.x - box.min.x) / 2;
      const halfDepth = (box.max.z - box.min.z) / 2;

      const overlapX = halfWidth - Math.abs(dx) + particleRadius;
      const overlapZ = halfDepth - Math.abs(dz) + particleRadius;

      const normal = new THREE.Vector3();

      if (overlapX < overlapZ) {
        normal.x = dx > 0 ? 1 : -1;
        normal.z = 0;
      } else {
        normal.x = 0;
        normal.z = dz > 0 ? 1 : -1;
      }

      result.collides = true;
      result.normal = normal;
      result.buildingIndex = i;
      break;
    }
  }

  return result;
}

function checkWindSourceInteractions(sources: WindSourceData[], delta: number) {
  if (sources.length < 2) return;

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sourceA = sources[i];
      const sourceB = sources[j];

      const dist = sourceA.position.distanceTo(sourceB.position);

      if (dist < 200) {
        const midPoint = new THREE.Vector3()
          .addVectors(sourceA.position, sourceB.position)
          .multiplyScalar(0.5);

        const dirA = DIRECTION_VECTORS[sourceA.direction];
        const dirB = DIRECTION_VECTORS[sourceB.direction];
        const cross = new THREE.Vector3().crossVectors(dirA, dirB);

        if (Math.abs(cross.y) > 0.3) {
          createSwirlEffect(midPoint, sourceA, sourceB, delta);
        }
      }
    }
  }
}

function createSwirlEffect(
  center: THREE.Vector3,
  sourceA: WindSourceData,
  sourceB: WindSourceData,
  delta: number
) {
  const swirlRadius = 30;

  particles.forEach((particle) => {
    if (particle.isSwirling) return;

    const dist = particle.position.distanceTo(center);

    if (
      dist < swirlRadius * 1.5 &&
      (particle.sourceId === sourceA.id || particle.sourceId === sourceB.id)
    ) {
      const chance = 0.02;
      if (Math.random() < chance) {
        startSwirl(particle, center, swirlRadius);
      }
    }
  });
}

function startSwirl(
  particle: Particle,
  center: THREE.Vector3,
  radius: number
) {
  particle.isSwirling = true;
  particle.swirlCenter = center.clone();
  particle.swirlRadius = radius * (0.5 + Math.random() * 0.5);

  const dx = particle.position.x - center.x;
  const dz = particle.position.z - center.z;
  particle.swirlAngle = Math.atan2(dz, dx);

  particle.swirlSpeed = 1.5 + Math.random() * 1.5;
  particle.riseSpeed = 5 + Math.random() * 5;
}

function updateSwirlingParticle(particle: Particle, delta: number) {
  if (!particle.swirlCenter) return;

  particle.swirlAngle += particle.swirlSpeed * delta;

  particle.swirlRadius += delta * 2;

  particle.position.x =
    particle.swirlCenter.x +
    Math.cos(particle.swirlAngle) * particle.swirlRadius;
  particle.position.z =
    particle.swirlCenter.z +
    Math.sin(particle.swirlAngle) * particle.swirlRadius;

  particle.position.y += particle.riseSpeed * delta;

  particle.riseSpeed *= 1 - delta * 0.1;

  const fadeStart = particle.life * 0.6;
  if (particle.age > fadeStart) {
    const fadeAmount = (particle.age - fadeStart) / (particle.life - fadeStart);
    particle.color.copy(particle.originalColor);
    particle.color.multiplyScalar(1 - fadeAmount * 0.8);
  }

  if (particle.position.y > 100) {
    particle.life = particle.age + 0.3;
  }
}

function updateBuffers(highlightedId: string | null) {
  if (!geometry || !positions || !colors || !sizes) return;

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const colAttr = geometry.attributes.color as THREE.BufferAttribute;
  const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;

  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (i < particles.length) {
      const p = particles[i];

      posAttr.array[i * 3] = p.position.x;
      posAttr.array[i * 3 + 1] = p.position.y;
      posAttr.array[i * 3 + 2] = p.position.z;

      let opacity = 1;
      if (highlightedId) {
        opacity = p.sourceId === highlightedId ? 1 : 0.2;
      }

      const fadeStart = p.life * 0.7;
      if (p.age > fadeStart) {
        opacity *= 1 - (p.age - fadeStart) / (p.life - fadeStart);
      }

      colAttr.array[i * 3] = p.color.r * opacity;
      colAttr.array[i * 3 + 1] = p.color.g * opacity;
      colAttr.array[i * 3 + 2] = p.color.b * opacity;

      sizeAttr.array[i] = p.size * (p.isSwirling ? 1.5 : 1);
    } else {
      posAttr.array[i * 3] = 0;
      posAttr.array[i * 3 + 1] = -1000;
      posAttr.array[i * 3 + 2] = 0;
      colAttr.array[i * 3] = 0;
      colAttr.array[i * 3 + 1] = 0;
      colAttr.array[i * 3 + 2] = 0;
      sizeAttr.array[i] = 0;
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  sizeAttr.needsUpdate = true;
  geometry.setDrawRange(0, particles.length);
}

export function resetAllParticles() {
  particles = [];
  lastEmitTime.clear();
}

export function getPoints() {
  return points;
}
