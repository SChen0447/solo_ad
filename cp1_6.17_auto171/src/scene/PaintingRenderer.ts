import * as THREE from 'three';
import type { Painting } from '../services/dataService';

export interface PaintingMeshData {
  id: number;
  painting: Painting;
  group: THREE.Group;
  frameMesh: THREE.Mesh;
  paintingMesh: THREE.Mesh;
  isLoaded: boolean;
  isClearing: boolean;
  clearProgress: number;
  isHovered: boolean;
  originalScale: THREE.Vector3;
  isPlayingOpenAnimation: boolean;
  openAnimationProgress: number;
}

export class PaintingRenderer {
  private scene: THREE.Scene;
  private paintingMeshes: Map<number, PaintingMeshData> = new Map();
  private loadedThumbnails: Set<number> = new Set();
  private textureLoader: THREE.TextureLoader;
  private activeFilters: { author: string; startYear: number; endYear: number } | null = null;
  private allPaintings: Painting[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.crossOrigin = 'anonymous';
  }

  setPaintings(paintings: Painting[]) {
    this.allPaintings = paintings;
    this.paintingMeshes.forEach(data => {
      this.scene.remove(data.group);
    });
    this.paintingMeshes.clear();
    this.loadedThumbnails.clear();
    paintings.forEach(painting => {
      this.createPaintingMesh(painting);
    });
    this.applyFiltersInternal();
  }

  private createPaintingMesh(painting: Painting) {
    const group = new THREE.Group();
    group.userData.paintingId = painting.id;

    const frameGeometry = new THREE.BoxGeometry(2.6, 3.4, 0.15);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xD4A017,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x332200,
      emissiveIntensity: 0.3
    });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    frameMesh.name = 'frame';
    group.add(frameMesh);

    const canvasGeometry = new THREE.PlaneGeometry(2.2, 3.0);
    const placeholderCanvas = document.createElement('canvas');
    placeholderCanvas.width = 2;
    placeholderCanvas.height = 2;
    const ctx = placeholderCanvas.getContext('2d')!;
    ctx.fillStyle = '#2A1810';
    ctx.fillRect(0, 0, 2, 2);
    const placeholderTexture = new THREE.CanvasTexture(placeholderCanvas);

    const canvasMaterial = new THREE.MeshStandardMaterial({
      map: placeholderTexture,
      roughness: 0.8,
      metalness: 0.05
    });
    const paintingMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
    paintingMesh.position.z = 0.08;
    paintingMesh.name = 'painting';
    group.add(paintingMesh);

    const x = painting.wall === 'left' ? -4.3 : 4.3;
    const z = painting.position;
    const y = 2.2;
    group.position.set(x, y, z);
    group.rotation.y = painting.wall === 'left' ? Math.PI / 2 : -Math.PI / 2;

    this.scene.add(group);

    const meshData: PaintingMeshData = {
      id: painting.id,
      painting,
      group,
      frameMesh,
      paintingMesh,
      isLoaded: false,
      isClearing: false,
      clearProgress: 0,
      isHovered: false,
      originalScale: new THREE.Vector3(1, 1, 1),
      isPlayingOpenAnimation: false,
      openAnimationProgress: 0
    };

    this.paintingMeshes.set(painting.id, meshData);
  }

  loadThumbnail(id: number): Promise<void> {
    const meshData = this.paintingMeshes.get(id);
    if (!meshData || meshData.isLoaded) return Promise.resolve();

    return new Promise((resolve) => {
      this.textureLoader.load(
        meshData.painting.thumbnailUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const material = meshData.paintingMesh.material as THREE.MeshStandardMaterial;
          if (material.map) {
            (material.map as THREE.Texture).dispose();
          }
          material.map = texture;
          material.needsUpdate = true;
          meshData.isLoaded = true;
          this.loadedThumbnails.add(id);
          resolve();
        },
        undefined,
        () => {
          meshData.isLoaded = true;
          resolve();
        }
      );
    });
  }

  loadVisiblePaintings(cameraPosition: THREE.Vector3, loadRadius: number = 15) {
    const initialLoadIds = new Set<number>();
    const sortedByDistance: Array<{ id: number; distance: number }> = [];

    this.paintingMeshes.forEach((data, id) => {
      if (data.isLoaded) return;
      const distance = Math.abs(cameraPosition.z - data.painting.position);
      if (distance < loadRadius) {
        sortedByDistance.push({ id, distance });
      }
    });

    sortedByDistance.sort((a, b) => a.distance - b.distance);
    const toLoad = sortedByDistance.slice(0, 4).map(item => item.id);

    toLoad.forEach(id => initialLoadIds.add(id));

    if (this.loadedThumbnails.size === 0) {
      const allSorted: Array<{ id: number; distance: number }> = [];
      this.paintingMeshes.forEach((data, id) => {
        if (!data.isLoaded) {
          allSorted.push({ id, distance: Math.abs(cameraPosition.z - data.painting.position) });
        }
      });
      allSorted.sort((a, b) => a.distance - b.distance);
      allSorted.slice(0, 4).forEach(item => initialLoadIds.add(item.id));
    }

    const loadPromises: Promise<void>[] = [];
    initialLoadIds.forEach(id => {
      if (!this.loadedThumbnails.has(id)) {
        loadPromises.push(this.loadThumbnail(id));
      }
    });

    return Promise.all(loadPromises);
  }

  update(cameraPosition: THREE.Vector3, deltaTime: number) {
    const clearDistance = 3.0;

    this.paintingMeshes.forEach((data) => {
      const distance = Math.abs(cameraPosition.z - data.painting.position) + 
                       Math.abs(cameraPosition.x - data.group.position.x) * 0.5;

      if (distance < clearDistance && !data.isClearing && data.isLoaded) {
        data.isClearing = true;
      }

      if (data.isClearing) {
        data.clearProgress = Math.min(1, data.clearProgress + deltaTime / 2.0);
        const material = data.paintingMesh.material as THREE.MeshStandardMaterial;
        if (material.map) {
          (material.map as THREE.Texture).anisotropy = 16;
        }
        material.needsUpdate = true;
      } else if (data.isLoaded) {
        const blurProgress = Math.min(1, Math.max(0, (distance - clearDistance) / 5));
        const material = data.paintingMesh.material as THREE.MeshStandardMaterial;
        if (material.map) {
          (material.map as THREE.Texture).anisotropy = Math.max(1, Math.floor(16 * (1 - blurProgress)));
        }
      }

      if (data.isHovered) {
        const targetScale = 1.05;
        const currentScale = data.group.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * Math.min(1, deltaTime * 10);
        data.group.scale.setScalar(newScale);

        const frameMat = data.frameMesh.material as THREE.MeshStandardMaterial;
        frameMat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.008) * 0.2 + 0.2;
      } else {
        const targetScale = 1.0;
        const currentScale = data.group.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * Math.min(1, deltaTime * 10);
        data.group.scale.setScalar(newScale);

        const frameMat = data.frameMesh.material as THREE.MeshStandardMaterial;
        frameMat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.002) * 0.1;
      }

      if (data.isPlayingOpenAnimation) {
        data.openAnimationProgress = Math.min(1, data.openAnimationProgress + deltaTime * 2.5);
        const t = data.openAnimationProgress;
        const easeOutBack = (x: number) => {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        };
        const eased = easeOutBack(t);
        const forwardAmount = eased * 0.8;
        const rotationAmount = Math.sin(t * Math.PI) * 0.3;
        const wallSign = data.painting.wall === 'left' ? 1 : -1;
        data.frameMesh.position.z = forwardAmount * wallSign;
        data.frameMesh.rotation.y = rotationAmount * wallSign;
        data.paintingMesh.position.z = 0.08 + forwardAmount * wallSign;
        data.paintingMesh.rotation.y = rotationAmount * wallSign;

        if (t >= 1) {
          data.isPlayingOpenAnimation = false;
        }
      } else {
        data.frameMesh.position.set(0, 0, 0);
        data.frameMesh.rotation.set(0, 0, 0);
        data.paintingMesh.position.set(0, 0, 0.08);
        data.paintingMesh.rotation.set(0, 0, 0);
      }
    });
  }

  playOpenAnimation(id: number) {
    const data = this.paintingMeshes.get(id);
    if (data) {
      data.isPlayingOpenAnimation = true;
      data.openAnimationProgress = 0;
      setTimeout(() => {
        if (this.paintingMeshes.has(id)) {
          const d = this.paintingMeshes.get(id)!;
          d.isPlayingOpenAnimation = false;
          d.openAnimationProgress = 0;
        }
      }, 1000);
    }
  }

  setHovered(id: number | null) {
    this.paintingMeshes.forEach((data, key) => {
      data.isHovered = key === id;
    });
  }

  getPaintingByMesh(mesh: THREE.Object3D): PaintingMeshData | undefined {
    const paintingId = mesh.userData.paintingId;
    if (paintingId !== undefined && this.paintingMeshes.has(paintingId)) {
      return this.paintingMeshes.get(paintingId);
    }
    let parent = mesh.parent;
    while (parent) {
      if (parent.userData.paintingId !== undefined) {
        return this.paintingMeshes.get(parent.userData.paintingId);
      }
      parent = parent.parent;
    }
    return undefined;
  }

  applyFilters(filters: { author: string; startYear: number; endYear: number }) {
    this.activeFilters = filters;
    this.applyFiltersInternal();
  }

  private applyFiltersInternal() {
    if (!this.activeFilters) {
      this.paintingMeshes.forEach(data => {
        data.group.visible = true;
      });
      return;
    }

    const { author, startYear, endYear } = this.activeFilters;
    this.paintingMeshes.forEach(data => {
      const p = data.painting;
      const authorMatch = author === 'all' || p.author === author;
      const yearMatch = p.year >= startYear && p.year <= endYear;
      data.group.visible = authorMatch && yearMatch;
    });
  }

  getVisiblePaintings(): number[] {
    const ids: number[] = [];
    this.paintingMeshes.forEach((data, id) => {
      if (data.group.visible) ids.push(id);
    });
    return ids;
  }

  dispose() {
    this.paintingMeshes.forEach(data => {
      this.scene.remove(data.group);
      (data.frameMesh.geometry as THREE.BufferGeometry).dispose();
      (data.frameMesh.material as THREE.Material).dispose();
      (data.paintingMesh.geometry as THREE.BufferGeometry).dispose();
      const canvasMaterial = data.paintingMesh.material as THREE.MeshStandardMaterial;
      if (canvasMaterial.map) {
        (canvasMaterial.map as THREE.Texture).dispose();
      }
      canvasMaterial.dispose();
    });
    this.paintingMeshes.clear();
    this.loadedThumbnails.clear();
  }
}
