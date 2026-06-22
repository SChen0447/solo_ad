import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export type SculptureType = 'geometric' | 'portrait' | 'animal';

interface CacheEntry {
  model: THREE.Group;
  timestamp: number;
  size: number;
  lastAccessed: number;
}

const MAX_CACHE_SIZE = 5;
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

export class ModelLoader {
  private scene: THREE.Scene;
  private currentModel: THREE.Group | null = null;
  private modelCache: Map<SculptureType, CacheEntry> = new Map();
  private loadPromises: Map<SculptureType, Promise<THREE.Group>> = new Map();
  private gltfLoader: GLTFLoader;
  private gltfExporter: GLTFExporter;
  private blobUrls: Map<SculptureType, string> = new Map();
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.6;
  private fadeOutModel: THREE.Group | null = null;
  private fadeInModel: THREE.Group | null = null;
  private defaultMetalness: number = 0.5;
  private defaultRoughness: number = 0.3;
  private loadingElement: HTMLElement | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader();
    this.gltfExporter = new GLTFExporter();
    this.createLoadingElement();
    this.preloadModels();
  }

  private createLoadingElement(): void {
    this.loadingElement = document.createElement('div');
    this.loadingElement.id = 'model-loading';
    this.loadingElement.style.position = 'absolute';
    this.loadingElement.style.top = '50%';
    this.loadingElement.style.left = '50%';
    this.loadingElement.style.transform = 'translate(-50%, -50%)';
    this.loadingElement.style.color = '#E0E0E0';
    this.loadingElement.style.fontSize = '16px';
    this.loadingElement.style.zIndex = '100';
    this.loadingElement.style.textAlign = 'center';
    this.loadingElement.style.display = 'none';
    this.loadingElement.style.background = 'rgba(26, 26, 46, 0.9)';
    this.loadingElement.style.padding = '16px 24px';
    this.loadingElement.style.borderRadius = '12px';
    this.loadingElement.style.backdropFilter = 'blur(10px)';
    document.getElementById('app')?.appendChild(this.loadingElement);
  }

  private showLoading(text: string): void {
    if (this.loadingElement) {
      this.loadingElement.textContent = text;
      this.loadingElement.style.display = 'block';
    }
  }

  private updateLoadingProgress(current: number, total: number): void {
    if (this.loadingElement) {
      const pct = Math.round((current / total) * 100);
      this.loadingElement.textContent = `正在加载雕塑模型... ${pct}%`;
    }
  }

  private hideLoading(): void {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  private async preloadModels(): Promise<void> {
    this.showLoading('正在生成GLB模型...');
    const types: SculptureType[] = ['geometric', 'portrait', 'animal'];

    try {
      for (let i = 0; i < types.length; i++) {
        this.updateLoadingProgress(i, types.length);
        await this.loadModelAsync(types[i]);
      }
      this.hideLoading();
    } catch {
      this.hideLoading();
    }
  }

  private async exportToGlb(type: SculptureType): Promise<string> {
    if (this.blobUrls.has(type)) {
      return this.blobUrls.get(type)!;
    }

    const proceduralModel = this.createProceduralModel(type);

    const glb = await this.gltfExporter.parseAsync(proceduralModel, {
      binary: true,
      maxTextureSize: 1024
    });

    this.disposeGroup(proceduralModel);

    const blob = new Blob([glb as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    this.blobUrls.set(type, url);

    return url;
  }

  private createProceduralModel(type: SculptureType): THREE.Group {
    switch (type) {
      case 'geometric':
        return this.createGeometricSculpture();
      case 'portrait':
        return this.createPortraitSculpture();
      case 'animal':
        return this.createAnimalSculpture();
      default:
        return new THREE.Group();
    }
  }

  private async loadModelAsync(type: SculptureType): Promise<THREE.Group> {
    const cached = this.getFromCache(type);
    if (cached) {
      return cached;
    }

    if (this.loadPromises.has(type)) {
      return this.loadPromises.get(type)!;
    }

    const promise = this.loadGltfModel(type);
    this.loadPromises.set(type, promise);

    try {
      const model = await promise;
      this.addToCache(type, model);
      return model;
    } finally {
      this.loadPromises.delete(type);
    }
  }

  private async loadGltfModel(type: SculptureType): Promise<THREE.Group> {
    const blobUrl = await this.exportToGlb(type);

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        blobUrl,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.metalness = this.defaultMetalness;
                child.material.roughness = this.defaultRoughness;
                child.material.envMapIntensity = 1.0;
              }
            }
          });
          resolve(model);
        },
        (progress) => {
          if (progress.total > 0) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            this.updateLoadingProgress(pct, 100);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  private getFromCache(type: SculptureType): THREE.Group | null {
    const entry = this.modelCache.get(type);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      this.evictFromCache(type);
      return null;
    }

    entry.lastAccessed = now;
    return entry.model.clone();
  }

  private addToCache(type: SculptureType, model: THREE.Group): void {
    this.evictIfNeeded();

    const size = this.estimateModelSize(model);
    this.modelCache.set(type, {
      model: model.clone(),
      timestamp: Date.now(),
      size,
      lastAccessed: Date.now()
    });
  }

  private estimateModelSize(model: THREE.Group): number {
    let size = 1;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        size += child.geometry.attributes.position.count * 3 * 4;
        if (child.geometry.index) {
          size += child.geometry.index.count * 4;
        }
      }
    });
    return size;
  }

  private evictIfNeeded(): void {
    if (this.modelCache.size >= MAX_CACHE_SIZE) {
      let oldest: SculptureType | null = null;
      let oldestTime = Infinity;
      this.modelCache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldest = key;
        }
      });
      if (oldest) {
        this.evictFromCache(oldest);
      }
    }
  }

  private evictFromCache(type: SculptureType): void {
    const entry = this.modelCache.get(type);
    if (entry) {
      this.disposeGroup(entry.model);
      this.modelCache.delete(type);
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    const expired: SculptureType[] = [];
    this.modelCache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_EXPIRY_MS) {
        expired.push(key);
      }
    });
    expired.forEach(key => this.evictFromCache(key));
  }

  public getCacheStats(): { count: number; totalSize: number; entries: { type: string; size: number; age: number }[] } {
    const now = Date.now();
    let totalSize = 0;
    const entries: { type: string; size: number; age: number }[] = [];
    this.modelCache.forEach((entry, key) => {
      totalSize += entry.size;
      entries.push({
        type: key,
        size: entry.size,
        age: now - entry.timestamp
      });
    });
    return { count: this.modelCache.size, totalSize, entries };
  }

  private createGeometricSculpture(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0xB8C4D9,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness,
      flatShading: false
    });

    const baseFormGeo = new THREE.IcosahedronGeometry(0.7, 1);
    const positions = baseFormGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = Math.sin(x * 3) * Math.cos(y * 2) * Math.sin(z * 2.5) * 0.15;
      positions.setX(i, x + x * noise);
      positions.setY(i, y + y * noise);
      positions.setZ(i, z + z * noise);
    }
    baseFormGeo.computeVertexNormals();
    const baseForm = new THREE.Mesh(baseFormGeo, material.clone());
    baseForm.position.y = 1.2;
    baseForm.castShadow = true;
    baseForm.receiveShadow = true;
    group.add(baseForm);

    const torusKnotGeo = new THREE.TorusKnotGeometry(0.35, 0.08, 128, 16, 2, 3);
    const torusKnot = new THREE.Mesh(torusKnotGeo, material.clone());
    torusKnot.position.set(0.3, 1.5, 0.2);
    torusKnot.rotation.set(0.5, 0.3, 0.7);
    torusKnot.castShadow = true;
    group.add(torusKnot);

    const tubePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6, 0.8, 0),
      new THREE.Vector3(-0.3, 1.2, 0.3),
      new THREE.Vector3(0.1, 1.0, -0.2),
      new THREE.Vector3(0.5, 1.4, 0.1),
      new THREE.Vector3(0.2, 1.8, -0.3)
    ]);
    const tubeGeo = new THREE.TubeGeometry(tubePath, 64, 0.05, 12, false);
    const tube = new THREE.Mesh(tubeGeo, material.clone());
    tube.castShadow = true;
    group.add(tube);

    const dodecaGeo = new THREE.DodecahedronGeometry(0.25, 0);
    const dodeca = new THREE.Mesh(dodecaGeo, material.clone());
    dodeca.position.set(-0.4, 1.7, -0.2);
    dodeca.rotation.set(0.4, 0.6, 0.2);
    dodeca.castShadow = true;
    group.add(dodeca);

    const icosaGeo = new THREE.IcosahedronGeometry(0.15, 0);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 0.5 + (i * 0.04);
      const icosa = new THREE.Mesh(icosaGeo, material.clone());
      icosa.position.set(
        Math.cos(angle) * radius,
        1.2 + Math.sin(i * 1.5) * 0.3,
        Math.sin(angle) * radius
      );
      icosa.rotation.set(i * 0.6, i * 0.4, i * 0.3);
      icosa.scale.setScalar(0.5 + i * 0.1);
      icosa.castShadow = true;
      group.add(icosa);
    }

    const torusGeo = new THREE.TorusGeometry(0.6, 0.03, 8, 64);
    const torus = new THREE.Mesh(torusGeo, material.clone());
    torus.position.y = 1.0;
    torus.rotation.x = Math.PI / 2;
    torus.castShadow = true;
    group.add(torus);

    const torus2 = new THREE.Mesh(torusGeo, material.clone());
    torus2.position.y = 1.0;
    torus2.rotation.x = Math.PI / 3;
    torus2.rotation.z = Math.PI / 4;
    torus2.castShadow = true;
    group.add(torus2);

    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.4, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x7A8BA0,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.y = -0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const pedestalTopGeo = new THREE.CylinderGeometry(0.9, 0.85, 0.08, 64);
    const pedestalTop = new THREE.Mesh(pedestalTopGeo, baseMaterial.clone());
    pedestalTop.position.y = 0.1;
    pedestalTop.castShadow = true;
    pedestalTop.receiveShadow = true;
    group.add(pedestalTop);

    return group;
  }

  private createPortraitSculpture(): THREE.Group {
    const group = new THREE.Group();
    const bronzeMaterial = new THREE.MeshStandardMaterial({
      color: 0xB87333,
      metalness: this.defaultMetalness + 0.2,
      roughness: this.defaultRoughness + 0.2
    });

    const headGeo = new THREE.SphereGeometry(0.5, 64, 64);
    const headPositions = headGeo.attributes.position;
    for (let i = 0; i < headPositions.count; i++) {
      const x = headPositions.getX(i);
      const y = headPositions.getY(i);
      const z = headPositions.getZ(i);

      let newX = x * 1.0;
      let newY = y * 1.12;
      let newZ = z * 0.92;

      if (z > 0) {
        const faceFactor = (z / 0.5);
        newX *= 1 + faceFactor * 0.05;
        newY += faceFactor * 0.02;
      }

      if (z > 0.2 && y > 0.1 && y < 0.4) {
        const eyeDist = Math.abs(Math.abs(x) - 0.18);
        if (eyeDist < 0.12) {
          newZ -= 0.06 * (1 - eyeDist / 0.12);
        }
      }

      if (z > 0.25 && y > -0.05 && y < 0.1) {
        newZ += 0.04;
      }

      if (z > 0.3 && y > -0.2 && y < -0.05) {
        const mouthDist = Math.abs(x);
        if (mouthDist < 0.15) {
          newZ -= 0.02 * (1 - mouthDist / 0.15);
        }
      }

      if (y < -0.15 && y > -0.4) {
        const jawFactor = (y + 0.15) / (-0.25);
        newX *= 1 - jawFactor * 0.15;
      }

      headPositions.setXYZ(i, newX, newY, newZ);
    }
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, bronzeMaterial.clone());
    head.position.y = 1.7;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    const nosePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.72, 0.45),
      new THREE.Vector3(0, 1.68, 0.5),
      new THREE.Vector3(0, 1.6, 0.52),
      new THREE.Vector3(0, 1.52, 0.48)
    ]);
    const noseGeo = new THREE.TubeGeometry(nosePath, 12, 0.05, 8, false);
    const nose = new THREE.Mesh(noseGeo, bronzeMaterial.clone());
    nose.castShadow = true;
    group.add(nose);

    const tipGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const tip = new THREE.Mesh(tipGeo, bronzeMaterial.clone());
    tip.position.set(0, 1.52, 0.46);
    tip.scale.set(1, 0.8, 1.1);
    group.add(tip);

    const earGeo = new THREE.SphereGeometry(0.09, 24, 24);
    const earPositions = earGeo.attributes.position;
    for (let i = 0; i < earPositions.count; i++) {
      const x = earPositions.getX(i);
      const y = earPositions.getY(i);
      const z = earPositions.getZ(i);
      earPositions.setX(i, x * 0.4);
      earPositions.setY(i, y * 1.1);
      earPositions.setZ(i, z * 0.6);
    }
    earGeo.computeVertexNormals();

    const leftEar = new THREE.Mesh(earGeo, bronzeMaterial.clone());
    leftEar.position.set(-0.48, 1.75, 0.05);
    leftEar.rotation.z = 0.2;
    leftEar.castShadow = true;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, bronzeMaterial.clone());
    rightEar.position.set(0.48, 1.75, 0.05);
    rightEar.rotation.z = -0.2;
    rightEar.castShadow = true;
    group.add(rightEar);

    const hairGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const height = 0.3 + (i * 0.013);
      const radius = 0.3 + (i * 0.008);

      const curlPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(
          Math.cos(angle) * radius * 0.8,
          1.85 + height * 0.2,
          Math.sin(angle) * radius * 0.8
        ),
        new THREE.Vector3(
          Math.cos(angle + 0.3) * radius,
          1.85 + height * 0.6,
          Math.sin(angle + 0.3) * radius
        ),
        new THREE.Vector3(
          Math.cos(angle + 0.6) * radius * 0.9,
          1.85 + height,
          Math.sin(angle + 0.6) * radius * 0.9
        )
      ]);
      const curlGeo = new THREE.TubeGeometry(curlPath, 8, 0.025, 6, false);
      const curl = new THREE.Mesh(curlGeo, bronzeMaterial.clone());
      curl.castShadow = true;
      hairGroup.add(curl);
    }
    group.add(hairGroup);

    const neckGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 32);
    const neckPositions = neckGeo.attributes.position;
    for (let i = 0; i < neckPositions.count; i++) {
      const y = neckPositions.getY(i);
      const factor = (y + 0.175) / 0.35;
      const x = neckPositions.getX(i);
      const z = neckPositions.getZ(i);
      neckPositions.setX(i, x * (0.8 + factor * 0.2));
      neckPositions.setZ(i, z * (0.85 + factor * 0.15));
    }
    neckGeo.computeVertexNormals();
    const neck = new THREE.Mesh(neckGeo, bronzeMaterial.clone());
    neck.position.y = 1.2;
    neck.castShadow = true;
    group.add(neck);

    const shoulderGeo = new THREE.SphereGeometry(0.6, 48, 48);
    const shoulderPositions = shoulderGeo.attributes.position;
    for (let i = 0; i < shoulderPositions.count; i++) {
      const x = shoulderPositions.getX(i);
      const y = shoulderPositions.getY(i);
      const z = shoulderPositions.getZ(i);
      let newX = x * 1.6;
      let newY = y * 0.55;
      let newZ = z * 1.0;

      if (y < 0) {
        const chestFactor = Math.abs(y);
        newZ += chestFactor * 0.1 * (z > 0 ? 1 : 0.3);
      }

      shoulderPositions.setXYZ(i, newX, newY, newZ);
    }
    shoulderGeo.computeVertexNormals();
    const shoulders = new THREE.Mesh(shoulderGeo, bronzeMaterial.clone());
    shoulders.position.y = 0.65;
    shoulders.castShadow = true;
    shoulders.receiveShadow = true;
    group.add(shoulders);

    const collarGeo = new THREE.TorusGeometry(0.35, 0.04, 12, 48);
    const collar = new THREE.Mesh(collarGeo, bronzeMaterial.clone());
    collar.position.set(0, 1.05, 0);
    collar.rotation.x = Math.PI / 2;
    collar.scale.y = 0.8;
    collar.castShadow = true;
    group.add(collar);

    const baseGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.45, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.y = -0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const baseDecorGeo = new THREE.TorusGeometry(0.95, 0.025, 8, 64);
    const baseDecor = new THREE.Mesh(baseDecorGeo, bronzeMaterial.clone());
    baseDecor.position.y = 0.1;
    baseDecor.rotation.x = Math.PI / 2;
    group.add(baseDecor);

    return group;
  }

  private createAnimalSculpture(): THREE.Group {
    const group = new THREE.Group();
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x9B8B7A,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness + 0.3
    });

    const bodyGeo = new THREE.SphereGeometry(0.65, 48, 48);
    const bodyPositions = bodyGeo.attributes.position;
    for (let i = 0; i < bodyPositions.count; i++) {
      const x = bodyPositions.getX(i);
      const y = bodyPositions.getY(i);
      const z = bodyPositions.getZ(i);
      let newX = x * 1.25;
      let newY = y * 0.85;
      let newZ = z * 1.6;

      if (y < 0) {
        const bellyFactor = Math.abs(y) * 2;
        newY += bellyFactor * 0.08;
      }

      bodyPositions.setXYZ(i, newX, newY, newZ);
    }
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, stoneMaterial.clone());
    body.position.set(0, 0.75, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const chestGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const chest = new THREE.Mesh(chestGeo, stoneMaterial.clone());
    chest.position.set(0.45, 0.95, 0);
    chest.scale.set(1, 1.1, 0.9);
    chest.castShadow = true;
    group.add(chest);

    const headGeo = new THREE.SphereGeometry(0.4, 48, 48);
    const headPositions = headGeo.attributes.position;
    for (let i = 0; i < headPositions.count; i++) {
      const x = headPositions.getX(i);
      const y = headPositions.getY(i);
      const z = headPositions.getZ(i);
      let newX = x * 1.15;
      let newY = y * 1.0;
      let newZ = z * 1.05;

      if (x > 0) {
        const snoutFactor = (x / 0.4);
        newX *= 1 + snoutFactor * 0.3;
        newY *= 1 - snoutFactor * 0.15;
      }

      if (x > 0.2 && y > -0.1 && y < 0.1) {
        const eyeDist = Math.abs(Math.abs(z) - 0.12);
        if (eyeDist < 0.08) {
          newX -= 0.04 * (1 - eyeDist / 0.08);
        }
      }

      headPositions.setXYZ(i, newX, newY, newZ);
    }
    headGeo.computeVertexNormals();
    const head = new THREE.Mesh(headGeo, stoneMaterial.clone());
    head.position.set(0.85, 1.15, 0);
    head.castShadow = true;
    group.add(head);

    const noseGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const nose = new THREE.Mesh(noseGeo, new THREE.MeshStandardMaterial({
      color: 0x3D2817,
      metalness: 0.1,
      roughness: 0.8
    }));
    nose.position.set(1.25, 1.1, 0);
    nose.scale.set(1.2, 0.8, 1);
    group.add(nose);

    const earGeo = new THREE.ConeGeometry(0.1, 0.25, 8);
    const leftEar = new THREE.Mesh(earGeo, stoneMaterial.clone());
    leftEar.position.set(0.75, 1.45, 0.22);
    leftEar.rotation.set(0.3, 0, -0.4);
    leftEar.castShadow = true;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, stoneMaterial.clone());
    rightEar.position.set(0.75, 1.45, -0.22);
    rightEar.rotation.set(0.3, 0, 0.4);
    rightEar.castShadow = true;
    group.add(rightEar);

    const maneGroup = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const length = 0.2 + (i * 0.009);
      const baseRadius = 0.35;

      const hairPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(
          0.6 + Math.cos(angle) * baseRadius * 0.3,
          1.25 + Math.sin(angle) * baseRadius * 0.6,
          Math.sin(angle) * baseRadius
        ),
        new THREE.Vector3(
          0.5 + Math.cos(angle + 0.2) * (baseRadius + length * 0.5) * 0.3,
          1.25 + Math.sin(angle + 0.2) * (baseRadius + length * 0.5) * 0.6,
          Math.sin(angle + 0.2) * (baseRadius + length * 0.5)
        ),
        new THREE.Vector3(
          0.4 + Math.cos(angle + 0.4) * (baseRadius + length) * 0.3,
          1.25 + Math.sin(angle + 0.4) * (baseRadius + length) * 0.6,
          Math.sin(angle + 0.4) * (baseRadius + length)
        )
      ]);
      const hairGeo = new THREE.TubeGeometry(hairPath, 6, 0.02 + (i * 0.0004), 6, false);
      const hair = new THREE.Mesh(hairGeo, stoneMaterial.clone());
      hair.castShadow = true;
      maneGroup.add(hair);
    }
    group.add(maneGroup);

    const legPositions = [
      [0.35, 0.3, 0.35],
      [0.35, 0.3, -0.35],
      [-0.35, 0.3, 0.35],
      [-0.35, 0.3, -0.35]
    ];

    legPositions.forEach((pos, index) => {
      const legGroup = new THREE.Group();

      const upperLegGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 16);
      const upperLeg = new THREE.Mesh(upperLegGeo, stoneMaterial.clone());
      upperLeg.position.y = 0.175;
      upperLeg.castShadow = true;
      legGroup.add(upperLeg);

      const lowerLegGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 16);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, stoneMaterial.clone());
      lowerLeg.position.y = -0.125;
      lowerLeg.castShadow = true;
      legGroup.add(lowerLeg);

      const pawGeo = new THREE.SphereGeometry(0.07, 16, 16);
      const paw = new THREE.Mesh(pawGeo, stoneMaterial.clone());
      paw.position.y = -0.27;
      paw.scale.set(1.3, 0.6, 1.2);
      paw.castShadow = true;
      legGroup.add(paw);

      if (index < 2) {
        legGroup.rotation.x = -0.1;
      }

      legGroup.position.set(pos[0], pos[1], pos[2]);
      group.add(legGroup);
    });

    const tailPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6, 0.9, 0),
      new THREE.Vector3(-0.85, 1.1, 0.1),
      new THREE.Vector3(-1.0, 1.4, -0.05),
      new THREE.Vector3(-0.95, 1.6, 0.05)
    ]);
    const tailGeo = new THREE.TubeGeometry(tailPath, 16, 0.035, 8, false);
    const tail = new THREE.Mesh(tailGeo, stoneMaterial.clone());
    tail.castShadow = true;
    group.add(tail);

    const tailTipGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const tailTip = new THREE.Mesh(tailTipGeo, stoneMaterial.clone());
    tailTip.position.set(-0.95, 1.6, 0.05);
    tailTip.scale.set(1, 1.3, 1);
    group.add(tailTip);

    const baseGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.4, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x6B5B4A,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness + 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.y = -0.05;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const baseTopGeo = new THREE.CylinderGeometry(1.1, 1.0, 0.06, 64);
    const baseTop = new THREE.Mesh(baseTopGeo, stoneMaterial.clone());
    baseTop.position.y = 0.15;
    baseTop.castShadow = true;
    baseTop.receiveShadow = true;
    group.add(baseTop);

    return group;
  }

  public async loadModel(type: SculptureType): Promise<void> {
    this.evictExpired();
    const model = await this.loadModelAsync(type);

    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }

    this.currentModel = model;
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.scene.add(this.currentModel);
  }

  public async switchModel(type: SculptureType, duration: number): Promise<void> {
    if (this.isTransitioning) return;

    this.evictExpired();
    const newModel = await this.loadModelAsync(type);

    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.fadeOutModel = this.currentModel;
    this.fadeInModel = newModel;

    this.fadeInModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0;
        }
      }
    });

    this.scene.add(this.fadeInModel);

    if (this.fadeOutModel) {
      this.fadeOutModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.transparent = true;
        }
      });
    }
  }

  public getCurrentModel(): THREE.Group | null {
    return this.currentModel;
  }

  public isModelCached(type: SculptureType): boolean {
    return this.modelCache.has(type);
  }

  public update(delta: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += delta;
    const t = Math.min(this.transitionProgress / this.transitionDuration, 1);
    const easedT = this.easeInOut(t);

    if (this.fadeOutModel) {
      const outOpacity = 1 - easedT;
      this.fadeOutModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = outOpacity;
        }
      });
    }

    if (this.fadeInModel) {
      this.fadeInModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = easedT;
        }
      });
    }

    if (t >= 1) {
      if (this.fadeOutModel) {
        this.scene.remove(this.fadeOutModel);
        this.fadeOutModel = null;
      }
      if (this.fadeInModel) {
        this.fadeInModel.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = false;
            child.material.opacity = 1;
          }
        });
        this.currentModel = this.fadeInModel;
        this.fadeInModel = null;
      }
      this.isTransitioning = false;
    }
  }

  public setMaterialProperties(metalness: number, roughness: number): void {
    const updateMaterial = (model: THREE.Group | null) => {
      if (!model) return;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.metalness = metalness;
          child.material.roughness = roughness;
          child.material.needsUpdate = true;
        }
      });
    };

    updateMaterial(this.currentModel);
    updateMaterial(this.fadeInModel);
    updateMaterial(this.fadeOutModel);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public dispose(): void {
    this.modelCache.forEach((entry) => {
      this.disposeGroup(entry.model);
    });
    this.modelCache.clear();

    this.blobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.blobUrls.clear();

    this.loadPromises.clear();
  }
}
