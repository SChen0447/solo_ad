import * as THREE from 'three';
import type { VectorDataset } from '../types';
import { valueToColor, VELOCITY_COLORMAP, gridToWorld, clamp } from '../utils/interpolation';

export class GlyphRenderer {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private arrowGeometry: THREE.ConeGeometry;
  private shaftGeometry: THREE.CylinderGeometry;
  private combinedGeometry: THREE.BufferGeometry;
  private glyphScale: number = 1.0;
  private opacity: number = 0.8;
  private visible: boolean = true;
  private data: VectorDataset | null = null;
  private dummy: THREE.Object3D;
  private instanceColors: Float32Array | null = null;
  private instanceScales: Float32Array | null = null;
  private numInstances: number = 0;
  private minMagnitude: number = 0;
  private maxMagnitude: number = 1;
  private stepSize: number = 1;

  private static readonly ARROW_BASE_DIR = new THREE.Vector3(0, 1, 0);
  private static readonly UP_VECTORS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0)
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.dummy = new THREE.Object3D();

    this.arrowGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
    this.arrowGeometry.translate(0, 0.425, 0);
    this.shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    this.shaftGeometry.translate(0, 0, 0);

    this.combinedGeometry = this.mergeGeometries(this.shaftGeometry, this.arrowGeometry);
    this.combinedGeometry.translate(0, 0.25, 0);
  }

  private mergeGeometries(g1: THREE.BufferGeometry, g2: THREE.BufferGeometry): THREE.BufferGeometry {
    const positions1 = g1.attributes.position.array as Float32Array;
    const positions2 = g2.attributes.position.array as Float32Array;
    const normals1 = g1.attributes.normal.array as Float32Array;
    const normals2 = g2.attributes.normal.array as Float32Array;

    const positions = new Float32Array(positions1.length + positions2.length);
    const normals = new Float32Array(normals1.length + normals2.length);

    positions.set(positions1, 0);
    positions.set(positions2, positions1.length);
    normals.set(normals1, 0);
    normals.set(normals2, normals1.length);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const index1 = g1.index ? g1.index.array : null;
    const index2 = g2.index ? g2.index.array : null;

    if (index1 && index2) {
      const indices = new Uint32Array(index1.length + index2.length);
      indices.set(index1, 0);
      const offset = positions1.length / 3;
      for (let i = 0; i < index2.length; i++) {
        indices[i + index1.length] = index2[i] + offset;
      }
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    return geometry;
  }

  setGlyphScale(scale: number): void {
    this.glyphScale = scale;
    this.updateInstances();
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    if (this.instancedMesh && this.instancedMesh.material instanceof THREE.MeshBasicMaterial) {
      (this.instancedMesh.material as THREE.MeshBasicMaterial).opacity = this.visible ? opacity : 0;
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.instancedMesh && this.instancedMesh.material instanceof THREE.MeshBasicMaterial) {
      const targetOpacity = visible ? this.opacity : 0;
      this.animateMaterialOpacity(this.instancedMesh.material as THREE.MeshBasicMaterial, targetOpacity, 500);
    }
  }

  private animateMaterialOpacity(
    material: THREE.MeshBasicMaterial,
    targetOpacity: number,
    duration: number
  ): void {
    const startTime = performance.now();
    const startOpacity = material.opacity;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = clamp(elapsed / duration, 0, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      material.opacity = startOpacity + (targetOpacity - startOpacity) * eased;
      material.transparent = true;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  loadData(dataset: VectorDataset): void {
    this.data = dataset;

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      if (this.instancedMesh.material instanceof THREE.Material) {
        this.instancedMesh.material.dispose();
      }
      this.instancedMesh = null;
    }

    const { nx, ny, nz } = dataset.gridSize;
    this.stepSize = Math.max(1, Math.floor(Math.pow(15000 / (nx * ny * nz), 1/3)));
    let count = 0;
    for (let iz = 0; iz < nz; iz += this.stepSize) {
      for (let iy = 0; iy < ny; iy += this.stepSize) {
        for (let ix = 0; ix < nx; ix += this.stepSize) {
          count++;
        }
      }
    }
    this.numInstances = count;

    this.instanceScales = new Float32Array(this.numInstances);
    let minMag = Infinity;
    let maxMag = -Infinity;
    for (const vec of dataset.values) {
      const mag = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
      if (mag < minMag) minMag = mag;
      if (mag > maxMag) maxMag = mag;
    }
    this.minMagnitude = isFinite(minMag) ? minMag : 0;
    this.maxMagnitude = (isFinite(maxMag) && maxMag > this.minMagnitude) ? maxMag : this.minMagnitude + 1;

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.visible ? this.opacity : 0,
      vertexColors: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.instancedMesh = new THREE.InstancedMesh(
      this.combinedGeometry,
      material,
      this.numInstances
    );

    this.instanceColors = new Float32Array(this.numInstances * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.instanceColors, 3);

    this.group.add(this.instancedMesh);
    this.updateInstances();
  }

  private alignArrowToDirection(quaternion: THREE.Quaternion, direction: THREE.Vector3): void {
    const dir = direction.clone().normalize();

    if (!isFinite(dir.x) || !isFinite(dir.y) || !isFinite(dir.z) || dir.lengthSq() < 1e-8) {
      quaternion.identity();
      return;
    }

    const dot = GlyphRenderer.ARROW_BASE_DIR.dot(dir);
    if (dot > 0.99999) {
      quaternion.identity();
      return;
    }
    if (dot < -0.99999) {
      let up: THREE.Vector3;
      if (Math.abs(GlyphRenderer.ARROW_BASE_DIR.x) < 0.9) {
        up = GlyphRenderer.UP_VECTORS[0];
      } else {
        up = GlyphRenderer.UP_VECTORS[1];
      }
      quaternion.setFromAxisAngle(up, Math.PI);
      return;
    }

    const axis = new THREE.Vector3().crossVectors(GlyphRenderer.ARROW_BASE_DIR, dir).normalize();
    const angle = Math.acos(dot);
    quaternion.setFromAxisAngle(axis, angle);
  }

  updateInstances(): void {
    if (!this.data || !this.instancedMesh || !this.instanceColors || !this.instanceScales) return;

    const { nx, ny, nz } = this.data.gridSize;
    let instanceIndex = 0;
    const tmpQuat = new THREE.Quaternion();

    for (let iz = 0; iz < nz; iz += this.stepSize) {
      for (let iy = 0; iy < ny; iy += this.stepSize) {
        for (let ix = 0; ix < nx; ix += this.stepSize) {
          const idx = iz * nx * ny + iy * nx + ix;
          const vec = this.data.values[idx];
          const [wx, wy, wz] = gridToWorld(ix, iy, iz, this.data.bounds, this.data.gridSize);

          const magnitude = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
          const magRange = this.maxMagnitude - this.minMagnitude;
          const normalizedMag = magRange > 1e-8 ? clamp((magnitude - this.minMagnitude) / magRange, 0, 1) : 0;
          const color = valueToColor(magnitude, this.minMagnitude, this.maxMagnitude, VELOCITY_COLORMAP);

          const lengthScale = 0.3 + normalizedMag * 1.2;
          const uniformScale = this.glyphScale * lengthScale;
          this.instanceScales[instanceIndex] = uniformScale;

          const dirVec = new THREE.Vector3(vec[0], vec[1], vec[2]);
          this.alignArrowToDirection(tmpQuat, dirVec);

          this.dummy.position.set(wx, wy, wz);
          this.dummy.quaternion.copy(tmpQuat);
          this.dummy.scale.set(uniformScale, uniformScale, uniformScale);
          this.dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(instanceIndex, this.dummy.matrix);

          const colorIdx = instanceIndex * 3;
          this.instanceColors[colorIdx] = color[0];
          this.instanceColors[colorIdx + 1] = color[1];
          this.instanceColors[colorIdx + 2] = color[2];

          instanceIndex++;
        }
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.instancedMesh.computeBoundingSphere();
  }
}
