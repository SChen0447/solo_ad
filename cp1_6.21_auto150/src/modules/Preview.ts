import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager';
import { MazeGrid, GridCell } from '../core/MazeGrid';

export interface PreviewCallbacks {
  onNoPath?: () => void;
}

export class Preview {
  private sceneManager: SceneManager;
  private mazeGrid: MazeGrid;
  private previewGroup: THREE.Group;
  private ball: THREE.Mesh | null = null;
  private trailLine: THREE.Line | null = null;
  private trailPoints: THREE.Vector3[] = [];
  private endBeam: THREE.Mesh | null = null;
  private endBeamLight: THREE.PointLight | null = null;
  private currentPath: GridCell[] = [];
  private pathIndex: number = 0;
  private ballSpeed: number = 2;
  private isActive: boolean = false;
  private isAnimating: boolean = false;
  private callbacks: PreviewCallbacks;
  private pulseTime: number = 0;
  private trailMesh: THREE.Mesh | null = null;

  constructor(sceneManager: SceneManager, mazeGrid: MazeGrid, callbacks: PreviewCallbacks = {}) {
    this.sceneManager = sceneManager;
    this.mazeGrid = mazeGrid;
    this.callbacks = callbacks;
    this.previewGroup = new THREE.Group();
    this.sceneManager.getScene().add(this.previewGroup);
    this.sceneManager.onUpdate(this.update.bind(this));
  }

  setSpeed(speed: number): void {
    this.ballSpeed = Math.max(1, Math.min(5, speed));
  }

  getSpeed(): number {
    return this.ballSpeed;
  }

  start(): void {
    this.isActive = true;
    this.clear();
    this.createEndBeam();

    const start: GridCell = { x: 0, z: 0 };
    const end: GridCell = { x: this.mazeGrid.size - 1, z: this.mazeGrid.size - 1 };
    const path = this.mazeGrid.findPath(start, end);

    if (!path || path.length === 0) {
      this.callbacks.onNoPath?.();
      return;
    }

    this.currentPath = path;
    this.pathIndex = 0;
    this.trailPoints = [];
    this.createBall();
    this.createTrail();
    this.isAnimating = true;
  }

  stop(): void {
    this.isActive = false;
    this.isAnimating = false;
    this.clear();
  }

  private createBall(): void {
    const geo = new THREE.SphereGeometry(0.28, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4
    });
    this.ball = new THREE.Mesh(geo, mat);
    this.ball.castShadow = true;

    const startPos = this.currentPath[0];
    this.ball.position.set(startPos.x, 0.4, startPos.z);
    this.trailPoints.push(new THREE.Vector3(startPos.x, 0.15, startPos.z));
    this.previewGroup.add(this.ball);

    const glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.ball.add(glow);
  }

  private createTrail(): void {
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.currentPath.length * 3 * 2);
    const colors = new Float32Array(this.currentPath.length * 3 * 2);

    for (let i = 0; i < this.currentPath.length * 2; i++) {
      colors[i * 3] = 0.13;
      colors[i * 3 + 1] = 0.78;
      colors[i * 3 + 2] = 0.43;
    }

    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    this.trailMesh = new THREE.Mesh(trailGeo, trailMat);
    this.previewGroup.add(this.trailMesh);
  }

  private updateTrailMesh(): void {
    if (!this.trailMesh || this.trailPoints.length < 2) return;

    const positions = (this.trailMesh.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const trailWidth = 0.08;

    for (let i = 0; i < this.trailPoints.length; i++) {
      const p = this.trailPoints[i];
      let dirX = 0, dirZ = 0;

      if (i < this.trailPoints.length - 1) {
        const next = this.trailPoints[i + 1];
        dirX = next.x - p.x;
        dirZ = next.z - p.z;
      } else if (i > 0) {
        const prev = this.trailPoints[i - 1];
        dirX = p.x - prev.x;
        dirZ = p.z - prev.z;
      }

      const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
      const perpX = -dirZ / len;
      const perpZ = dirX / len;

      positions[i * 6] = p.x + perpX * trailWidth;
      positions[i * 6 + 1] = p.y;
      positions[i * 6 + 2] = p.z + perpZ * trailWidth;

      positions[i * 6 + 3] = p.x - perpX * trailWidth;
      positions[i * 6 + 4] = p.y;
      positions[i * 6 + 5] = p.z - perpZ * trailWidth;
    }

    this.trailMesh.geometry.attributes.position.needsUpdate = true;
    this.trailMesh.geometry.setDrawRange(0, this.trailPoints.length * 2);
    this.trailMesh.geometry.computeBoundingSphere();
  }

  private createEndBeam(): void {
    const size = this.mazeGrid.size;

    const beamGeo = new THREE.CylinderGeometry(0.15, 0.35, 4, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    this.endBeam = new THREE.Mesh(beamGeo, beamMat);
    this.endBeam.position.set(size - 1, 2, size - 1);
    this.previewGroup.add(this.endBeam);

    const innerGeo = new THREE.CylinderGeometry(0.06, 0.12, 4, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.9
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    this.endBeam.add(inner);

    this.endBeamLight = new THREE.PointLight(0xfbbf24, 1.2, 6);
    this.endBeamLight.position.set(size - 1, 1.5, size - 1);
    this.previewGroup.add(this.endBeamLight);

    const ringGeo = new THREE.RingGeometry(0.4, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(size - 1, 0.05, size - 1);
    ring.name = 'endRing';
    this.previewGroup.add(ring);
  }

  private update(delta: number): void {
    this.pulseTime += delta;

    if (this.endBeam) {
      const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 4);
      (this.endBeam.material as THREE.MeshBasicMaterial).opacity = 0.4 + pulse * 0.4;
      this.endBeam.scale.x = 1 + pulse * 0.15;
      this.endBeam.scale.z = 1 + pulse * 0.15;
    }

    if (this.endBeamLight) {
      this.endBeamLight.intensity = 0.8 + 0.5 * Math.sin(this.pulseTime * 4);
    }

    const ring = this.previewGroup.getObjectByName('endRing');
    if (ring) {
      const scale = 1 + 0.3 * Math.sin(this.pulseTime * 3);
      ring.scale.set(scale, scale, scale);
    }

    if (!this.isAnimating || !this.ball || this.currentPath.length === 0) return;

    const moveDistance = this.ballSpeed * delta;
    let remaining = moveDistance;

    while (remaining > 0 && this.pathIndex < this.currentPath.length - 1) {
      const target = this.currentPath[this.pathIndex + 1];
      const targetPos = new THREE.Vector3(target.x, 0.4, target.z);
      const toTarget = targetPos.clone().sub(this.ball.position);
      const distToTarget = toTarget.length();

      if (remaining >= distToTarget) {
        this.ball.position.copy(targetPos);
        this.pathIndex++;
        remaining -= distToTarget;

        const trailPoint = new THREE.Vector3(target.x, 0.12, target.z);
        this.trailPoints.push(trailPoint);
      } else {
        toTarget.normalize().multiplyScalar(remaining);
        this.ball.position.add(toTarget);

        const trailPoint = new THREE.Vector3(
          this.ball.position.x,
          0.12,
          this.ball.position.z
        );
        this.trailPoints[this.trailPoints.length - 1] = trailPoint;
        remaining = 0;
      }
    }

    this.updateTrailMesh();

    this.ball.rotation.y += delta * 3;
    this.ball.position.y = 0.4 + 0.08 * Math.sin(this.pulseTime * 6);

    if (this.pathIndex >= this.currentPath.length - 1) {
      this.isAnimating = false;
    }
  }

  private clear(): void {
    const toRemove: THREE.Object3D[] = [];
    this.previewGroup.traverse((obj) => {
      if (obj !== this.previewGroup) {
        toRemove.push(obj);
      }
    });

    for (const obj of toRemove) {
      this.previewGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          (mat as THREE.Material).dispose();
        }
      }
    }

    this.ball = null;
    this.trailLine = null;
    this.trailMesh = null;
    this.endBeam = null;
    this.endBeamLight = null;
    this.trailPoints = [];
    this.currentPath = [];
    this.pathIndex = 0;
    this.isAnimating = false;
  }

  restart(): void {
    if (this.isActive) {
      this.start();
    }
  }

  dispose(): void {
    this.sceneManager.offUpdate(this.update.bind(this));
    this.clear();
    this.sceneManager.getScene().remove(this.previewGroup);
  }
}
