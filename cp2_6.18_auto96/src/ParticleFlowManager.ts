import * as THREE from 'three';
import { SegmentPath } from './RoadNetworkManager';

interface Particle {
  segmentId: string;
  direction: 1 | -1;
  t: number;
  speed: number;
  laneOffset: number;
  trailPositions: THREE.Vector3[];
}

const PARTICLE_COUNT_PER_SEGMENT = 14;
const TRAIL_LENGTH = 6;
const PARTICLE_SIZE = 3;
const MIN_SPEED = 0.2;
const MAX_SPEED = 0.8;

export class ParticleFlowManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private segmentPaths: Map<string, SegmentPath> = new Map();
  private densityMap: Map<string, number> = new Map();
  private directionMap: Map<string, 1 | -1> = new Map();

  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particlePoints: THREE.Points;

  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private trailLines: THREE.LineSegments;

  private pathLinesGroup: THREE.Group;
  private activeParticleCount: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: PARTICLE_SIZE,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);

    this.pathLinesGroup = new THREE.Group();
    this.pathLinesGroup.visible = false;
  }

  build(paths: SegmentPath[]): void {
    this.segmentPaths.clear();
    this.particles = [];

    for (const path of paths) {
      this.segmentPaths.set(path.id, path);

      const halfCount = Math.ceil(PARTICLE_COUNT_PER_SEGMENT / 2);
      for (let i = 0; i < halfCount; i++) {
        this.particles.push(this.createParticle(path.id, 1, i, halfCount));
      }
      for (let i = 0; i < halfCount; i++) {
        this.particles.push(this.createParticle(path.id, -1, i, halfCount));
      }
    }

    this.activeParticleCount = this.particles.length;

    this.initBuffers();
    this.createPathLines();

    this.scene.add(this.particlePoints);
    this.scene.add(this.trailLines);
    this.scene.add(this.pathLinesGroup);
  }

  private createParticle(
    segmentId: string,
    direction: 1 | -1,
    index: number,
    total: number
  ): Particle {
    const laneOffset = (index % 2 === 0 ? 0.8 : -0.8) * direction;
    const t = (index / total) + Math.random() * 0.1;

    return {
      segmentId,
      direction,
      t: t % 1,
      speed: MAX_SPEED,
      laneOffset,
      trailPositions: [],
    };
  }

  private initBuffers(): void {
    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const maxTrailVerts = count * TRAIL_LENGTH * 2;
    const trailPos = new Float32Array(maxTrailVerts * 3);
    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(trailPos, 3)
    );
  }

  private createPathLines(): void {
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      dashSize: 0.5,
      gapSize: 0.5,
    });

    this.segmentPaths.forEach((path) => {
      const midStart = path.start.clone();
      const midEnd = path.end.clone();

      if (path.isHorizontal) {
        midStart.z += 0.8;
        midEnd.z += 0.8;
      } else {
        midStart.x += 0.8;
        midEnd.x += 0.8;
      }

      const geo = new THREE.BufferGeometry().setFromPoints([midStart, midEnd]);
      const line = new THREE.Line(geo, lineMat.clone());
      line.computeLineDistances();
      this.pathLinesGroup.add(line);

      if (path.isHorizontal) {
        midStart.z -= 1.6;
        midEnd.z -= 1.6;
      } else {
        midStart.x -= 1.6;
        midEnd.x -= 1.6;
      }

      const geo2 = new THREE.BufferGeometry().setFromPoints([midStart, midEnd]);
      const line2 = new THREE.Line(geo2, lineMat.clone());
      line2.computeLineDistances();
      this.pathLinesGroup.add(line2);
    });
  }

  updateFlowDirection(
    directionMap: Map<string, 1 | -1>,
    densityMap: Map<string, number>
  ): void {
    this.directionMap = directionMap;
    this.densityMap = densityMap;

    for (const p of this.particles) {
      const dir = directionMap.get(p.segmentId);
      if (dir !== undefined) {
        p.direction = dir;
      }
    }
  }

  update(delta: number, cameraDistance: number): void {
    const visible = cameraDistance < 80;

    this.particlePoints.visible = visible;
    this.trailLines.visible = visible;
    this.pathLinesGroup.visible = cameraDistance < 30;

    if (!visible) return;

    const reducedParticles = cameraDistance >= 40;

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    let activeCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (reducedParticles && i % 2 !== 0) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        continue;
      }

      activeCount++;

      const path = this.segmentPaths.get(p.segmentId);
      if (!path) continue;

      const density = this.densityMap.get(p.segmentId) ?? 100;
      const densityNorm = Math.max(0, Math.min(200, density)) / 200;
      p.speed = MAX_SPEED - (MAX_SPEED - MIN_SPEED) * densityNorm;

      p.t += (p.speed * p.direction * delta) / path.start.distanceTo(path.end);

      if (p.t > 1 || p.t < 0) {
        p.t = p.direction === 1 ? 0 : 1;
        p.trailPositions = [];
      }

      const pos = this.getParticlePosition(p, path);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      p.trailPositions.unshift(pos.clone());
      if (p.trailPositions.length > TRAIL_LENGTH) {
        p.trailPositions.length = TRAIL_LENGTH;
      }
    }

    this.activeParticleCount = activeCount;
    posAttr.needsUpdate = true;

    this.updateTrailBuffers();
  }

  private getParticlePosition(p: Particle, path: SegmentPath): THREE.Vector3 {
    const t = Math.max(0, Math.min(1, p.t));
    const pos = new THREE.Vector3().lerpVectors(path.start, path.end, t);

    if (path.isHorizontal) {
      pos.z += p.laneOffset;
    } else {
      pos.x += p.laneOffset;
    }

    pos.y = 0.1;
    return pos;
  }

  private updateTrailBuffers(): void {
    const trailPosAttr = this.trailGeometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const trailPositions = trailPosAttr.array as Float32Array;

    let idx = 0;
    const maxVerts = (trailPositions.length / 3);

    for (let i = 0; i < this.particles.length && idx + 1 < maxVerts; i++) {
      const p = this.particles[i];
      if (p.trailPositions.length < 2) continue;

      for (let j = 0; j < p.trailPositions.length - 1 && idx + 1 < maxVerts; j++) {
        const curr = p.trailPositions[j];
        const next = p.trailPositions[j + 1];

        trailPositions[idx * 3] = curr.x;
        trailPositions[idx * 3 + 1] = curr.y;
        trailPositions[idx * 3 + 2] = curr.z;
        idx++;

        trailPositions[idx * 3] = next.x;
        trailPositions[idx * 3 + 1] = next.y;
        trailPositions[idx * 3 + 2] = next.z;
        idx++;
      }
    }

    for (let i = idx * 3; i < trailPositions.length; i++) {
      trailPositions[i] = 0;
    }

    trailPosAttr.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, idx);
  }
}
