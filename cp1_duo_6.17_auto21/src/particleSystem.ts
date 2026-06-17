import * as THREE from 'three';
import { SimulationParams } from './eventBus';

interface ObjectManager {
  getObstacleMesh(): THREE.Object3D | null;
  getPressureAt(point: THREE.Vector3): number;
}

interface ParticleData {
  position: Float32Array;
  velocity: Float32Array;
  age: Float32Array;
  size: Float32Array;
  trail: Float32Array;
  trailCount: Int32Array;
  vorticity: Float32Array;
}

interface SpatialHash {
  cellSize: number;
  buckets: Map<string, number[]>;
}

type DisplayMode = 'particles' | 'streamlines' | 'pressure' | 'overlay';

const COLOR_PALETTE = [
  new THREE.Color(0x87CEEB),
  new THREE.Color(0xADD8E6),
  new THREE.Color(0xE0F6FF),
  new THREE.Color(0xFFFFFF),
];

const TRAIL_LENGTH = 30;
const LIFETIME = 6.0;
const EMITTER_X = -12;
const EMITTER_Y_MIN = -3;
const EMITTER_Y_MAX = 3;
const EMITTER_Z_MIN = -3;
const EMITTER_Z_MAX = 3;
const DEGRADATION_THRESHOLD = 8000;
const LERP_DURATION = 0.5;
const SEPARATION_ANGLE = (120 * Math.PI) / 180;

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp2(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad3(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

const PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function perlinNoise3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;
  return lerp2(
    lerp2(
      lerp2(grad3(PERM[AA], x, y, z), grad3(PERM[BA], x - 1, y, z), u),
      lerp2(grad3(PERM[AB], x, y - 1, z), grad3(PERM[BB], x - 1, y - 1, z), u),
      v
    ),
    lerp2(
      lerp2(grad3(PERM[AA + 1], x, y, z - 1), grad3(PERM[BA + 1], x - 1, y, z - 1), u),
      lerp2(grad3(PERM[AB + 1], x, y - 1, z - 1), grad3(PERM[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private objectManager: ObjectManager;
  private params: SimulationParams;
  private targetParams: SimulationParams;
  private lerpProgress: number = 1;

  private particleCount: number;
  private degradedMode: boolean = false;

  private particles!: ParticleData;
  private points!: THREE.Points;
  private pointsGeometry!: THREE.BufferGeometry;
  private pointsMaterial!: THREE.PointsMaterial;

  private trailSegments!: THREE.LineSegments;
  private trailGeometry!: THREE.BufferGeometry;
  private trailMaterial!: THREE.LineBasicMaterial;

  private raycaster: THREE.Raycaster;
  private spatialHash: SpatialHash;

  private displayMode: DisplayMode = 'particles';
  private currentParams: SimulationParams;

  private tmpVector: THREE.Vector3;
  private tmpNormal: THREE.Vector3;
  private tmpTangent: THREE.Vector3;
  private tmpColor: THREE.Color;

  private avgSpeed: number = 0;
  private turbulenceIntensity: number = 0;

  constructor(
    scene: THREE.Scene,
    params: SimulationParams,
    objectManager: ObjectManager
  ) {
    this.scene = scene;
    this.objectManager = objectManager;
    this.params = { ...params };
    this.targetParams = { ...params };
    this.currentParams = { ...params };

    this.particleCount = Math.max(
      1000,
      Math.min(10000, params.particleDensity)
    );

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.0;

    this.spatialHash = {
      cellSize: 1.0,
      buckets: new Map(),
    };

    this.tmpVector = new THREE.Vector3();
    this.tmpNormal = new THREE.Vector3();
    this.tmpTangent = new THREE.Vector3();
    this.tmpColor = new THREE.Color();

    this.initParticles();
    this.initTrails();
    this.checkDegradationMode();
  }

  private initParticles(): void {
    const count = this.particleCount;

    this.particles = {
      position: new Float32Array(count * 3),
      velocity: new Float32Array(count * 3),
      age: new Float32Array(count),
      size: new Float32Array(count),
      trail: new Float32Array(count * TRAIL_LENGTH * 3),
      trailCount: new Int32Array(count),
      vorticity: new Float32Array(count * 3),
    };

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, Math.random() * LIFETIME);
    }

    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particles.position, 3)
    );
    this.pointsGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    );
    this.pointsGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.particles.size, 1)
    );

    this.pointsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private initTrails(): void {
    const count = this.particleCount;
    const vertexCount = count * TRAIL_LENGTH * 2;

    const trailPositions = new Float32Array(vertexCount * 3);
    const trailColors = new Float32Array(vertexCount * 3);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(trailPositions, 3)
    );
    this.trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(trailColors, 3)
    );

    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailSegments = new THREE.LineSegments(
      this.trailGeometry,
      this.trailMaterial
    );
    this.trailSegments.frustumCulled = false;
    this.scene.add(this.trailSegments);
  }

  private resetParticle(index: number, initialAge: number = 0): void {
    const pi = index * 3;

    const y = EMITTER_Y_MIN + Math.random() * (EMITTER_Y_MAX - EMITTER_Y_MIN);
    const z = EMITTER_Z_MIN + Math.random() * (EMITTER_Z_MAX - EMITTER_Z_MIN);

    this.particles.position[pi] = EMITTER_X;
    this.particles.position[pi + 1] = y;
    this.particles.position[pi + 2] = z;

    const speed = this.currentParams.windSpeed;
    this.particles.velocity[pi] = speed;
    this.particles.velocity[pi + 1] = (Math.random() - 0.5) * 0.5;
    this.particles.velocity[pi + 2] = (Math.random() - 0.5) * 0.5;

    this.particles.age[index] = initialAge;

    const baseSize = this.degradedMode ? 0.04 : 0.08;
    const maxSize = this.degradedMode ? 0.15 : 0.3;
    this.particles.size[index] = baseSize + Math.random() * (maxSize - baseSize);

    this.particles.trailCount[index] = 0;
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const ti = index * TRAIL_LENGTH * 3 + t * 3;
      this.particles.trail[ti] = EMITTER_X;
      this.particles.trail[ti + 1] = y;
      this.particles.trail[ti + 2] = z;
    }

    this.particles.vorticity[pi] = (Math.random() - 0.5) * 2;
    this.particles.vorticity[pi + 1] = (Math.random() - 0.5) * 2;
    this.particles.vorticity[pi + 2] = (Math.random() - 0.5) * 2;
  }

  private checkDegradationMode(): void {
    this.degradedMode = this.particleCount > DEGRADATION_THRESHOLD;

    if (this.pointsMaterial) {
      this.pointsMaterial.size = this.degradedMode ? 0.075 : 0.15;
    }

    if (this.trailSegments) {
      this.trailSegments.visible = !this.degradedMode;
    }
  }

  private updateSpatialHash(): void {
    this.spatialHash.buckets.clear();
    const cellSize = this.spatialHash.cellSize;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = i * 3;
      const x = Math.floor(this.particles.position[pi] / cellSize);
      const y = Math.floor(this.particles.position[pi + 1] / cellSize);
      const z = Math.floor(this.particles.position[pi + 2] / cellSize);
      const key = `${x},${y},${z}`;

      if (!this.spatialHash.buckets.has(key)) {
        this.spatialHash.buckets.set(key, []);
      }
      this.spatialHash.buckets.get(key)!.push(i);
    }
  }

  private getNearbyParticles(index: number): number[] {
    const pi = index * 3;
    const cellSize = this.spatialHash.cellSize;
    const px = this.particles.position[pi];
    const py = this.particles.position[pi + 1];
    const pz = this.particles.position[pi + 2];

    const nearby: number[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const x = Math.floor(px / cellSize) + dx;
          const y = Math.floor(py / cellSize) + dy;
          const z = Math.floor(pz / cellSize) + dz;
          const key = `${x},${y},${z}`;
          const bucket = this.spatialHash.buckets.get(key);
          if (bucket) {
            for (const idx of bucket) {
              if (idx !== index) {
                nearby.push(idx);
              }
            }
          }
        }
      }
    }

    return nearby;
  }

  private calculateReynolds(
    windSpeed: number,
    charLength: number = 3.0,
    nu: number = 1.5e-5
  ): number {
    return (windSpeed * charLength) / nu;
  }

  private computeBarycentric(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    p: THREE.Vector3
  ): THREE.Vector3 {
    const v0 = new THREE.Vector3().subVectors(b, a);
    const v1 = new THREE.Vector3().subVectors(c, a);
    const v2 = new THREE.Vector3().subVectors(p, a);
    const d00 = v0.dot(v0);
    const d01 = v0.dot(v1);
    const d11 = v1.dot(v1);
    const d20 = v2.dot(v0);
    const d21 = v2.dot(v1);
    const denom = d00 * d11 - d01 * d01;
    const eps = 1e-8;
    if (Math.abs(denom) < eps) {
      return new THREE.Vector3(1 / 3, 1 / 3, 1 / 3);
    }
    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;
    return new THREE.Vector3(u, v, w);
  }

  private estimateCurvature(
    object: THREE.Object3D,
    point: THREE.Vector3,
    normal: THREE.Vector3
  ): number {
    if (!(object instanceof THREE.Mesh)) {
      return 0;
    }

    const geometry = object.geometry as THREE.BufferGeometry;
    if (!geometry.attributes.position || !geometry.index) {
      return 0;
    }

    const positions = geometry.attributes.position;
    const indices = geometry.index;

    const sampleRadius = 0.3;
    let angleSum = 0;
    let sampleCount = 0;

    const localPoint = point.clone();
    localPoint.applyMatrix4(object.matrixWorld.clone().invert());

    const worldNormal = normal.clone().normalize();

    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);

      const v0 = new THREE.Vector3(
        positions.getX(i0),
        positions.getY(i0),
        positions.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2)
      );

      const center = new THREE.Vector3()
        .addVectors(v0, v1)
        .add(v2)
        .multiplyScalar(1 / 3);
      const dist = center.distanceTo(localPoint);

      if (dist < sampleRadius && dist > 0.0001) {
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const faceNormal = new THREE.Vector3()
          .crossVectors(edge1, edge2)
          .normalize();

        faceNormal.transformDirection(object.matrixWorld);

        const dot = Math.max(-1, Math.min(1, faceNormal.dot(worldNormal)));
        const angleDiff = Math.acos(dot);

        angleSum += angleDiff;
        sampleCount++;
      }
    }

    if (sampleCount === 0) {
      return 0;
    }

    const avgAngleDiff = angleSum / sampleCount;
    const curvatureMagnitude = avgAngleDiff / sampleRadius;

    const probeOffset = localPoint.clone().add(
      worldNormal.clone().multiplyScalar(0.05)
    );
    let insideCount = 0;
    let totalNearby = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);

      const v0 = new THREE.Vector3(
        positions.getX(i0),
        positions.getY(i0),
        positions.getZ(i0)
      );
      const center = new THREE.Vector3()
        .addVectors(
          v0,
          new THREE.Vector3(
            positions.getX(i1),
            positions.getY(i1),
            positions.getZ(i1)
          )
        )
        .add(
          new THREE.Vector3(
            positions.getX(i2),
            positions.getY(i2),
            positions.getZ(i2)
          )
        )
        .multiplyScalar(1 / 3);

      if (center.distanceTo(localPoint) < sampleRadius) {
        totalNearby++;
        const toProbe = new THREE.Vector3().subVectors(probeOffset, center);
        if (toProbe.lengthSq() < center.distanceTo(localPoint) ** 2) {
          insideCount++;
        }
      }
    }

    const sign = totalNearby > 0 && insideCount < totalNearby / 2 ? 1 : -1;
    return curvatureMagnitude * sign;
  }

  private checkCollision(
    index: number,
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    delta: number
  ): { hit: boolean; normal: THREE.Vector3; curvature: number; point: THREE.Vector3; baryNormal: THREE.Vector3 } {
    const obstacle = this.objectManager.getObstacleMesh();
    if (!obstacle) {
      return { hit: false, normal: new THREE.Vector3(), curvature: 0, point: new THREE.Vector3(), baryNormal: new THREE.Vector3() };
    }

    const speed = vel.length();
    if (speed < 0.001) {
      return { hit: false, normal: new THREE.Vector3(), curvature: 0, point: new THREE.Vector3(), baryNormal: new THREE.Vector3() };
    }

    this.tmpVector.copy(vel).normalize();
    this.raycaster.set(pos, this.tmpVector);
    this.raycaster.far = speed * delta + 0.3;

    const intersects = this.raycaster.intersectObject(obstacle, true);
    if (intersects.length === 0) {
      return { hit: false, normal: new THREE.Vector3(), curvature: 0, point: new THREE.Vector3(), baryNormal: new THREE.Vector3() };
    }

    const hit = intersects[0];
    const hitPoint = hit.point.clone();

    let interpolatedNormal: THREE.Vector3;
    if (hit.face && hit.uv && hit.object instanceof THREE.Mesh) {
      const mesh = hit.object as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry;
      const normalAttr = geom.attributes.normal;
      const idx = geom.index;

      if (normalAttr && idx && hit.face) {
        const ia = idx.getX(hit.face.a);
        const ib = idx.getX(hit.face.b);
        const ic = idx.getX(hit.face.c);

        const na = new THREE.Vector3(
          normalAttr.getX(ia),
          normalAttr.getY(ia),
          normalAttr.getZ(ia)
        );
        const nb = new THREE.Vector3(
          normalAttr.getX(ib),
          normalAttr.getY(ib),
          normalAttr.getZ(ib)
        );
        const nc = new THREE.Vector3(
          normalAttr.getX(ic),
          normalAttr.getY(ic),
          normalAttr.getZ(ic)
        );

        const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        const vA = new THREE.Vector3(posAttr.getX(ia), posAttr.getY(ia), posAttr.getZ(ia));
        const vB = new THREE.Vector3(posAttr.getX(ib), posAttr.getY(ib), posAttr.getZ(ib));
        const vC = new THREE.Vector3(posAttr.getX(ic), posAttr.getY(ic), posAttr.getZ(ic));
        const localHitPoint = hit.point.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
        const bc = this.computeBarycentric(vA, vB, vC, localHitPoint);
        interpolatedNormal = new THREE.Vector3()
          .addScaledVector(na, bc.x)
          .addScaledVector(nb, bc.y)
          .addScaledVector(nc, bc.z)
          .normalize();

        interpolatedNormal.transformDirection(mesh.matrixWorld);
      } else {
        interpolatedNormal = hit.face.normal.clone();
        interpolatedNormal.transformDirection(hit.object.matrixWorld);
      }
    } else if (hit.face) {
      interpolatedNormal = hit.face.normal.clone();
      interpolatedNormal.transformDirection(hit.object.matrixWorld);
    } else {
      interpolatedNormal = new THREE.Vector3(0, 1, 0);
    }

    interpolatedNormal.normalize();

    const curvature = this.estimateCurvature(
      obstacle,
      hitPoint,
      interpolatedNormal
    );

    return { hit: true, normal: interpolatedNormal, curvature, point: hitPoint, baryNormal: interpolatedNormal };
  }

  private handleCollision(
    vel: THREE.Vector3,
    normal: THREE.Vector3,
    curvature: number,
    delta: number,
    index: number,
    age: number,
    vorticity: THREE.Vector3,
    hitPoint: THREE.Vector3,
    particlePos: THREE.Vector3
  ): void {
    const vel_initial = vel.clone();
    const Re = this.calculateReynolds(this.currentParams.windSpeed);

    const vnMag = vel.dot(normal);
    const vn = normal.clone().multiplyScalar(vnMag);
    const vt = vel.clone().sub(vn);

    if (vnMag < 0) {
      vn.multiplyScalar(-0.1);
      particlePos.addScaledVector(normal, 0.05);
    }

    const R = 1 / Math.max(Math.abs(curvature), 0.01);
    const vtMag = vt.length();

    if (vtMag > 0.001 && Math.abs(curvature) > 0.01) {
      const vtNorm = vt.clone().normalize();
      const deflectionDir = new THREE.Vector3().crossVectors(normal, vtNorm).normalize();
      const a_n = (vtMag * vtMag) / R * Math.sign(curvature);
      vt.addScaledVector(deflectionDir, a_n * delta * 0.3);
    }

    if (Re > 0) {
      const Cf = 0.0592 / Math.pow(Re, 0.2);
      vt.multiplyScalar(1 - Cf * 0.5);
    }

    vel.copy(vn).add(vt);

    const currentFlowDir = vel.clone().normalize();
    const initialFlowDir = vel_initial.lengthSq() > 0 ? vel_initial.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const flowAlongNormal = currentFlowDir.dot(initialFlowDir);
    const adversePressureGradient = (1 - flowAlongNormal) > 0.7;
    const highCurvature = curvature > 0.3;
    const separation = adversePressureGradient && highCurvature && Re > 1000;

    if (separation) {
      const flowDirection = initialFlowDir.clone();
      const vortexCore = hitPoint.clone().addScaledVector(normal, 0.5);
      const rVector = particlePos.clone().sub(vortexCore);
      const r = rVector.length();
      const omegaSign = Math.sign(curvature) !== 0 ? Math.sign(curvature) : 1;
      const omega = (2 * vtMag) / R * omegaSign;
      const vortexDir = new THREE.Vector3().crossVectors(normal, flowDirection).normalize();

      if (r > 0.001) {
        const rNorm = rVector.clone().divideScalar(r);
        const vVortex = new THREE.Vector3()
          .crossVectors(vortexDir, rNorm)
          .multiplyScalar(omega * r * Math.exp(-(r * r) / 0.5));
        vel.addScaledVector(vVortex, 0.8);
      }
    }

    const speed = vel.length();
    if (speed > 0.001) {
      if (Re < 2300) {
        const disturbanceCoeff = 0.02 * Math.sin(age * 5 + index);
        const disturbanceDir = new THREE.Vector3(
          Math.sin(age * 3 + index * 0.1),
          Math.cos(age * 2.5 + index * 0.15),
          Math.sin(age * 2 + index * 0.2)
        ).normalize();
        vel.addScaledVector(disturbanceDir, disturbanceCoeff * speed);
      } else {
        const px = particlePos.x;
        const py = particlePos.y;
        const pz = particlePos.z;
        const noiseX = perlinNoise3(px * 2 + index * 0.01, py * 2, pz * 2);
        const noiseY = perlinNoise3(px * 2 + 100, py * 2 + index * 0.01, pz * 2 + 100);
        const noiseZ = perlinNoise3(px * 2 + 200, py * 2 + 200, pz * 2 + index * 0.01);
        const disturbanceDir = new THREE.Vector3(noiseX, noiseY, noiseZ).normalize();
        const disturbanceCoeff = 0.15 * (noiseX * 0.5 + 0.5);
        vel.addScaledVector(disturbanceDir, disturbanceCoeff * speed);
      }
    }

    vorticity.multiplyScalar(0.995);
    if (separation) {
      const flowDirection = initialFlowDir.lengthSq() > 0 ? initialFlowDir.clone().normalize() : new THREE.Vector3(1, 0, 0);
      const vortexDir = new THREE.Vector3().crossVectors(normal, flowDirection).normalize();
      vorticity.addScaledVector(vortexDir, curvature * 0.01);
    }
  }

  private updateColor(index: number, speed: number, age: number): void {
    const pi = index * 3;
    const colors = this.pointsGeometry.attributes.color as THREE.BufferAttribute;

    const t = (speed / this.currentParams.windSpeed) * 0.5 + age / LIFETIME * 0.5;
    const clampedT = Math.max(0, Math.min(1, t));

    if (this.degradedMode) {
      const colorIndex = Math.min(
        COLOR_PALETTE.length - 1,
        Math.floor(clampedT * COLOR_PALETTE.length)
      );
      const color = COLOR_PALETTE[colorIndex];
      colors.setXYZ(index, color.r, color.g, color.b);
    } else {
      this.tmpColor.setHex(0x87ceeb);
      this.tmpColor.lerp(new THREE.Color(0xffffff), clampedT);

      const shimmer = 0.8 + Math.sin(age * 8 + index * 0.1) * 0.2;
      colors.setXYZ(
        index,
        this.tmpColor.r * shimmer,
        this.tmpColor.g * shimmer,
        this.tmpColor.b * shimmer
      );
    }
  }

  private updatePressureColor(index: number, pos: THREE.Vector3): void {
    const cp = this.objectManager.getPressureAt(pos);
    const colors = this.pointsGeometry.attributes.color as THREE.BufferAttribute;

    const t = Math.max(0, Math.min(1, (cp + 1.5) / 3.0));
    const r = t;
    const b = 1 - t;
    const g = (1 - Math.abs(t - 0.5) * 2) * 0.5;

    colors.setXYZ(index, r, g, b);
  }

  private updateTrail(index: number, pos: THREE.Vector3, age: number): void {
    if (this.degradedMode) return;

    const ti = index * TRAIL_LENGTH * 3;

    for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
      this.particles.trail[ti + t * 3] = this.particles.trail[ti + (t - 1) * 3];
      this.particles.trail[ti + t * 3 + 1] =
        this.particles.trail[ti + (t - 1) * 3 + 1];
      this.particles.trail[ti + t * 3 + 2] =
        this.particles.trail[ti + (t - 1) * 3 + 2];
    }

    this.particles.trail[ti] = pos.x;
    this.particles.trail[ti + 1] = pos.y;
    this.particles.trail[ti + 2] = pos.z;

    if (this.particles.trailCount[index] < TRAIL_LENGTH) {
      this.particles.trailCount[index]++;
    }
  }

  private updateTrailGeometry(): void {
    if (this.degradedMode) return;

    const trailPositions = this.trailGeometry.attributes.position as THREE.BufferAttribute;
    const trailColors = this.trailGeometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const ti = i * TRAIL_LENGTH * 3;
      const trailCount = this.particles.trailCount[i];

      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        if (t >= trailCount - 1) break;

        const vi = i * TRAIL_LENGTH * 2 + t * 2;

        trailPositions.setXYZ(
          vi * 3,
          this.particles.trail[ti + t * 3],
          this.particles.trail[ti + t * 3 + 1],
          this.particles.trail[ti + t * 3 + 2]
        );
        trailPositions.setXYZ(
          vi * 3 + 3,
          this.particles.trail[ti + t * 3 + 3],
          this.particles.trail[ti + t * 3 + 4],
          this.particles.trail[ti + t * 3 + 5]
        );

        const alpha = 1 - t / TRAIL_LENGTH;
        const ageFactor = this.particles.age[i] / LIFETIME;
        const colorT = (t / TRAIL_LENGTH) * 0.5 + ageFactor * 0.5;

        if (this.degradedMode) {
          const colorIndex = Math.min(
            COLOR_PALETTE.length - 1,
            Math.floor(colorT * COLOR_PALETTE.length)
          );
          const color = COLOR_PALETTE[colorIndex];
          trailColors.setXYZ(vi * 3, color.r * alpha, color.g * alpha, color.b * alpha);
          trailColors.setXYZ(vi * 3 + 3, color.r * alpha * 0.8, color.g * alpha * 0.8, color.b * alpha * 0.8);
        } else {
          this.tmpColor.setHex(0x87ceeb);
          this.tmpColor.lerp(new THREE.Color(0xffffff), colorT);
          trailColors.setXYZ(vi * 3, this.tmpColor.r * alpha, this.tmpColor.g * alpha, this.tmpColor.b * alpha);
          trailColors.setXYZ(vi * 3 + 3, this.tmpColor.r * alpha * 0.8, this.tmpColor.g * alpha * 0.8, this.tmpColor.b * alpha * 0.8);
        }
      }
    }

    trailPositions.needsUpdate = true;
    trailColors.needsUpdate = true;
  }

  private updateParamLerp(delta: number): void {
    if (this.lerpProgress >= 1) return;

    this.lerpProgress = Math.min(1, this.lerpProgress + delta / LERP_DURATION);
    const t = this.lerpProgress;
    const smoothT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.currentParams.windSpeed = THREE.MathUtils.lerp(
      this.params.windSpeed,
      this.targetParams.windSpeed,
      smoothT
    );
    this.currentParams.particleDensity = THREE.MathUtils.lerp(
      this.params.particleDensity,
      this.targetParams.particleDensity,
      smoothT
    );

    if (this.lerpProgress >= 1) {
      this.params = { ...this.targetParams };
    }
  }

  private resizeParticleCount(newCount: number): void {
    const targetCount = Math.max(1000, Math.min(10000, Math.round(newCount)));
    if (targetCount === this.particleCount) return;

    this.scene.remove(this.points);
    this.scene.remove(this.trailSegments);
    this.pointsGeometry.dispose();
    this.pointsMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();

    this.particleCount = targetCount;
    this.initParticles();
    this.initTrails();
    this.checkDegradationMode();
    this.setDisplayMode(this.displayMode);
  }

  update(delta: number, elapsed: number): void {
    this.updateParamLerp(delta);

    const targetDensity = this.lerpProgress >= 1
      ? this.targetParams.particleDensity
      : this.currentParams.particleDensity;
    const targetCount = Math.max(1000, Math.min(10000, Math.round(targetDensity)));
    if (targetCount !== this.particleCount) {
      this.resizeParticleCount(targetCount);
    }

    this.updateSpatialHash();

    let totalSpeed = 0;
    let speedVariance = 0;
    const meanSpeed = this.currentParams.windSpeed;

    const positions = this.pointsGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = i * 3;

      this.particles.age[i] += delta;

      if (this.particles.age[i] >= LIFETIME ||
          this.particles.position[pi] > 20 ||
          this.particles.position[pi + 1] < -10 ||
          this.particles.position[pi + 1] > 10 ||
          this.particles.position[pi + 2] < -10 ||
          this.particles.position[pi + 2] > 10) {
        this.resetParticle(i);
      }

      this.tmpVector.set(
        this.particles.position[pi],
        this.particles.position[pi + 1],
        this.particles.position[pi + 2]
      );

      const vel = new THREE.Vector3(
        this.particles.velocity[pi],
        this.particles.velocity[pi + 1],
        this.particles.velocity[pi + 2]
      );

      const vort = new THREE.Vector3(
        this.particles.vorticity[pi],
        this.particles.vorticity[pi + 1],
        this.particles.vorticity[pi + 2]
      );

      const collision = this.checkCollision(i, this.tmpVector, vel, delta);
      if (collision.hit) {
        this.handleCollision(
          vel,
          collision.normal,
          collision.curvature,
          delta,
          i,
          this.particles.age[i],
          vort,
          collision.point,
          this.tmpVector
        );
      }

      vel.x += (this.currentParams.windSpeed - vel.x) * delta * 0.5;

      const nearby = this.getNearbyParticles(i);
      for (const ni of nearby) {
        const npi = ni * 3;
        const dx = this.particles.position[npi] - this.particles.position[pi];
        const dy = this.particles.position[npi + 1] - this.particles.position[pi + 1];
        const dz = this.particles.position[npi + 2] - this.particles.position[pi + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 0.2 && dist > 0.001) {
          const force = (0.2 - dist) * 2;
          vel.x -= (dx / dist) * force * delta;
          vel.y -= (dy / dist) * force * delta;
          vel.z -= (dz / dist) * force * delta;
        }
      }

      const vortexForce = new THREE.Vector3()
        .crossVectors(vort, vel)
        .multiplyScalar(delta * 0.05);
      vel.add(vortexForce);

      this.particles.velocity[pi] = vel.x;
      this.particles.velocity[pi + 1] = vel.y;
      this.particles.velocity[pi + 2] = vel.z;

      this.particles.vorticity[pi] = vort.x;
      this.particles.vorticity[pi + 1] = vort.y;
      this.particles.vorticity[pi + 2] = vort.z;

      this.particles.position[pi] = this.tmpVector.x + vel.x * delta;
      this.particles.position[pi + 1] = this.tmpVector.y + vel.y * delta;
      this.particles.position[pi + 2] = this.tmpVector.z + vel.z * delta;

      positions.setXYZ(
        i,
        this.particles.position[pi],
        this.particles.position[pi + 1],
        this.particles.position[pi + 2]
      );

      const speed = vel.length();
      totalSpeed += speed;
      speedVariance += (speed - meanSpeed) * (speed - meanSpeed);

      this.tmpVector.set(
        this.particles.position[pi],
        this.particles.position[pi + 1],
        this.particles.position[pi + 2]
      );

      if (this.displayMode === 'pressure' || this.displayMode === 'overlay') {
        this.updatePressureColor(i, this.tmpVector);
      } else {
        this.updateColor(i, speed, this.particles.age[i]);
      }

      this.updateTrail(i, this.tmpVector, this.particles.age[i]);
    }

    positions.needsUpdate = true;
    (this.pointsGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    this.updateTrailGeometry();

    this.avgSpeed = totalSpeed / this.particleCount;
    this.turbulenceIntensity = Math.sqrt(speedVariance / this.particleCount) / Math.max(0.1, meanSpeed);
  }

  updateParams(params: SimulationParams): void {
    this.targetParams = { ...params };
    this.lerpProgress = 0;
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;

    switch (mode) {
      case 'particles':
        this.points.visible = true;
        this.trailSegments.visible = !this.degradedMode;
        this.pointsMaterial.opacity = 0.9;
        this.trailMaterial.opacity = 0.4;
        break;
      case 'streamlines':
        this.points.visible = false;
        this.trailSegments.visible = true;
        this.trailMaterial.opacity = 0.8;
        break;
      case 'pressure':
        this.points.visible = true;
        this.trailSegments.visible = !this.degradedMode;
        this.pointsMaterial.opacity = 0.9;
        this.trailMaterial.opacity = 0.3;
        break;
      case 'overlay':
        this.points.visible = true;
        this.trailSegments.visible = true;
        this.pointsMaterial.opacity = 0.7;
        this.trailMaterial.opacity = 0.6;
        break;
    }
  }

  getStats(): { avgSpeed: number; turbulenceIntensity: number; particleCount: number } {
    return {
      avgSpeed: this.avgSpeed,
      turbulenceIntensity: this.turbulenceIntensity,
      particleCount: this.particleCount,
    };
  }

  getParticleState(): Float32Array {
    const stateSize = 10;
    const state = new Float32Array(this.particleCount * stateSize);

    for (let i = 0; i < this.particleCount; i++) {
      const pi = i * 3;
      const si = i * stateSize;

      state[si] = this.particles.position[pi];
      state[si + 1] = this.particles.position[pi + 1];
      state[si + 2] = this.particles.position[pi + 2];
      state[si + 3] = this.particles.velocity[pi];
      state[si + 4] = this.particles.velocity[pi + 1];
      state[si + 5] = this.particles.velocity[pi + 2];
      state[si + 6] = this.particles.age[i];
      state[si + 7] = this.particles.size[i];
      state[si + 8] = this.particles.vorticity[pi];
      state[si + 9] = this.particles.vorticity[pi + 1];
    }

    return state;
  }

  setPlaybackState(state: Float32Array): void {
    const stateSize = 10;
    const count = Math.min(this.particleCount, Math.floor(state.length / stateSize));

    const positions = this.pointsGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const pi = i * 3;
      const si = i * stateSize;

      this.particles.position[pi] = state[si];
      this.particles.position[pi + 1] = state[si + 1];
      this.particles.position[pi + 2] = state[si + 2];
      this.particles.velocity[pi] = state[si + 3];
      this.particles.velocity[pi + 1] = state[si + 4];
      this.particles.velocity[pi + 2] = state[si + 5];
      this.particles.age[i] = state[si + 6];
      this.particles.size[i] = state[si + 7];
      this.particles.vorticity[pi] = state[si + 8];
      this.particles.vorticity[pi + 1] = state[si + 9];

      positions.setXYZ(
        i,
        this.particles.position[pi],
        this.particles.position[pi + 1],
        this.particles.position[pi + 2]
      );
    }

    positions.needsUpdate = true;
  }
}
