import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { RoomData } from './room';
import { RayPath, RayTracer, ReflectionPoint } from './rayTracer';

export interface SoundSourceParams {
  position: THREE.Vector3;
  rayCount: number;
  maxReflections: number;
}

export interface SourceVisualization {
  group: THREE.Group;
  sphere: THREE.Mesh;
  glow: THREE.Mesh;
  innerGlow: THREE.PointLight;
  rayGroup: THREE.Group;
  rayLines: THREE.Line[];
  reflectionMarkers: THREE.Mesh[];
  rayPaths: RayPath[];
  totalReflections: number;
}

export class SoundSource {
  private scene: THREE.Scene;
  private room: RoomData;
  private source!: SourceVisualization;

  constructor(scene: THREE.Scene, room: RoomData) {
    this.scene = scene;
    this.room = room;
    this.create(new THREE.Vector3(0, 1.5, 0));
  }

  public create(position: THREE.Vector3): SourceVisualization {
    if (this.source) {
      this.scene.remove(this.source.group);
      this.disposeVisualization();
    }

    const group = new THREE.Group();

    const sphereGeom = new THREE.SphereGeometry(0.15, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.userData.isSoundSource = true;
    group.add(sphere);

    const glowGeom = new THREE.SphereGeometry(0.35, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffff44,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);

    const innerGlow = new THREE.PointLight(0xffdd00, 1.5, 5, 2);
    innerGlow.castShadow = false;
    group.add(innerGlow);

    const ringGeom = new THREE.RingGeometry(0.22, 0.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffee66,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringX = new THREE.Mesh(ringGeom, ringMat);
    ringX.rotation.y = Math.PI / 2;
    group.add(ringX);

    const ringY = new THREE.Mesh(ringGeom, ringMat.clone());
    ringY.rotation.x = Math.PI / 2;
    group.add(ringY);

    const ringZ = new THREE.Mesh(ringGeom, ringMat.clone());
    group.add(ringZ);

    const rayGroup = new THREE.Group();
    group.add(rayGroup);

    this.source = {
      group,
      sphere,
      glow,
      innerGlow,
      rayGroup,
      rayLines: [],
      reflectionMarkers: [],
      rayPaths: [],
      totalReflections: 0,
    };

    this.setPosition(position);
    this.scene.add(group);

    return this.source;
  }

  public setPosition(position: THREE.Vector3): void {
    const bounds = this.room.getBounds();
    const margin = 0.2;
    const clampedPos = new THREE.Vector3(
      Math.min(bounds.max.x - margin, Math.max(bounds.min.x + margin, position.x)),
      Math.min(bounds.max.y - margin, Math.max(bounds.min.y + margin, position.y)),
      Math.min(bounds.max.z - margin, Math.max(bounds.min.z + margin, position.z))
    );
    this.source.group.position.copy(clampedPos);
  }

  public getPosition(): THREE.Vector3 {
    return this.source.group.position.clone();
  }

  public updatePulse(elapsedTime: number): void {
    const period = 2.0;
    const t = (elapsedTime % period) / period;
    const pulse = 0.3 + 0.5 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));

    (this.source.glow.material as THREE.MeshBasicMaterial).opacity = pulse;
    const scale = 1 + pulse * 0.3;
    this.source.glow.scale.set(scale, scale, scale);

    this.source.innerGlow.intensity = 1 + pulse * 0.8;

    const ringPulse = 0.4 + pulse * 0.6;
    const ringScale = 1 + pulse * 0.2;
    this.source.group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
        (child.material as THREE.MeshBasicMaterial).opacity = ringPulse * 0.6;
        child.scale.set(ringScale, ringScale, ringScale);
      }
    });
  }

  public recalculateRays(params: { rayCount: number; maxReflections?: number }): void {
    this.clearRays();

    const rayPaths = RayTracer.trace({
      sourcePosition: this.getPosition(),
      rayCount: params.rayCount,
      maxReflections: params.maxReflections,
      room: this.room,
      seed: uuidv4().charCodeAt(0) * Date.now(),
    });

    this.source.rayPaths = rayPaths;
    this.source.totalReflections = rayPaths.reduce((sum, rp) => sum + rp.totalReflections, 0);

    rayPaths.forEach((path) => {
      this.renderRayPath(path);
    });
  }

  private renderRayPath(path: RayPath): void {
    if (path.points.length < 2) return;

    for (let i = 0; i < path.points.length - 1; i++) {
      const start = path.points[i];
      const end = path.points[i + 1];
      this.renderSegment(start, end);
    }

    for (let i = 1; i < path.points.length; i++) {
      const point = path.points[i];
      if (point.hitWall && i < path.points.length - 1) {
        this.renderReflectionMarker(point);
      }
    }
  }

  private renderSegment(start: ReflectionPoint, end: ReflectionPoint): void {
    const positions = new Float32Array([
      start.position.x - this.source.group.position.x,
      start.position.y - this.source.group.position.y,
      start.position.z - this.source.group.position.z,
      end.position.x - this.source.group.position.x,
      end.position.y - this.source.group.position.y,
      end.position.z - this.source.group.position.z,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const reflectionIdx = Math.min(start.reflectionIndex, end.reflectionIndex);
    const avgEnergy = (start.energy + end.energy) / 2;
    const color = RayTracer.getColorForReflection(reflectionIdx, avgEnergy);
    const opacity = RayTracer.getOpacityForEnergy(avgEnergy, reflectionIdx);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });

    const line = new THREE.Line(geometry, material);
    this.source.rayGroup.add(line);
    this.source.rayLines.push(line);
  }

  private renderReflectionMarker(point: ReflectionPoint): void {
    const size = 0.04 + Math.min(0.06, point.energy * 0.08);
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const color = RayTracer.getColorForReflection(point.reflectionIndex, point.energy);

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: Math.min(1, point.energy + 0.3),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(
      point.position.x - this.source.group.position.x,
      point.position.y - this.source.group.position.y,
      point.position.z - this.source.group.position.z
    );

    this.source.rayGroup.add(marker);
    this.source.reflectionMarkers.push(marker);
  }

  public clearRays(): void {
    this.source.rayLines.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.source.rayLines = [];

    this.source.reflectionMarkers.forEach((marker) => {
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    });
    this.source.reflectionMarkers = [];

    while (this.source.rayGroup.children.length > 0) {
      this.source.rayGroup.remove(this.source.rayGroup.children[0]);
    }

    this.source.rayPaths = [];
    this.source.totalReflections = 0;
  }

  public updateRoom(room: RoomData): void {
    this.room = room;
    this.setPosition(this.getPosition());
  }

  public getRayPaths(): RayPath[] {
    return this.source.rayPaths;
  }

  public getTotalReflections(): number {
    return this.source.totalReflections;
  }

  public getRayCount(): number {
    return this.source.rayPaths.length;
  }

  public getVisualization(): SourceVisualization {
    return this.source;
  }

  public getInteractableMesh(): THREE.Mesh {
    return this.source.sphere;
  }

  private disposeVisualization(): void {
    this.clearRays();

    this.source.sphere.geometry.dispose();
    (this.source.sphere.material as THREE.Material).dispose();

    this.source.glow.geometry.dispose();
    (this.source.glow.material as THREE.Material).dispose();

    this.source.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== this.source.sphere && obj !== this.source.glow) {
        if (obj.geometry instanceof THREE.RingGeometry) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  public dispose(): void {
    this.disposeVisualization();
    this.scene.remove(this.source.group);
  }
}
