import * as THREE from 'three';

export interface MarkerPoint {
  mesh: THREE.Mesh;
  elevation: number;
  originalScale: number;
  blinkTimer: number;
  blinkCount: number;
  isBlinking: boolean;
  labelActive: boolean;
}

export class GridHelper {
  private scene: THREE.Scene;
  private terrainMesh: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private centerMarker: THREE.Mesh | null = null;
  private markers: MarkerPoint[] = [];
  private terrainHeights: Float32Array | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  public createTerrain(): void {
    const gridSize = 20;
    const bounds = 80;

    const geometry = new THREE.PlaneGeometry(bounds, bounds, gridSize - 1, gridSize - 1);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    this.terrainHeights = new Float32Array(gridSize * gridSize);

    for (let i = 0; i < positions.count; i++) {
      const height = Math.random() * 5;
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      this.terrainHeights[row * gridSize + col] = height;

      positions.setY(i, height);

      const t = height / 5;
      colors[i * 3] = this.lerp(0xD2 / 255, 0x8B / 255, t);
      colors[i * 3 + 1] = this.lerp(0xB4 / 255, 0x45 / 255, t);
      colors[i * 3 + 2] = this.lerp(0x8C / 255, 0x13 / 255, t);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  public createGrid(): void {
    this.gridHelper = new THREE.GridHelper(80, 20, 0x444444, 0x333333);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    const centerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.centerMarker = new THREE.Mesh(centerGeometry, centerMaterial);
    this.centerMarker.position.set(0, 0.3, 0);
    this.scene.add(this.centerMarker);
  }

  public createMarkers(): void {
    if (!this.terrainHeights) return;

    const gridSize = 20;
    const bounds = 80;
    const halfBounds = bounds / 2;

    for (let i = 0; i < 10; i++) {
      const col = Math.floor(Math.random() * gridSize);
      const row = Math.floor(Math.random() * gridSize);

      const x = (col / (gridSize - 1)) * bounds - halfBounds;
      const z = (row / (gridSize - 1)) * bounds - halfBounds;
      const elevation = this.terrainHeights[row * gridSize + col];

      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, elevation + 0.5, z);
      mesh.userData.markerIndex = i;

      this.scene.add(mesh);

      this.markers.push({
        mesh,
        elevation,
        originalScale: 1,
        blinkTimer: 0,
        blinkCount: 0,
        isBlinking: false,
        labelActive: false
      });
    }
  }

  public getTerrainHeights(): Float32Array | null {
    return this.terrainHeights;
  }

  public getMarkers(): MarkerPoint[] {
    return this.markers;
  }

  public getMarkerMeshes(): THREE.Mesh[] {
    return this.markers.map(m => m.mesh);
  }

  public activateMarker(index: number): void {
    const marker = this.markers[index];
    if (!marker) return;

    marker.isBlinking = true;
    marker.blinkTimer = 0;
    marker.blinkCount = 0;
    marker.labelActive = true;
  }

  public deactivateMarker(index: number): void {
    const marker = this.markers[index];
    if (!marker) return;

    marker.labelActive = false;
    const material = marker.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.9;
    marker.mesh.scale.setScalar(1);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(deltaTime: number, time: number): void {
    for (const marker of this.markers) {
      marker.mesh.rotation.y += deltaTime * 2;

      if (marker.isBlinking) {
        marker.blinkTimer += deltaTime;
        const blinkDuration = 0.2;
        const progress = this.easeOutCubic(Math.min(1, marker.blinkTimer / blinkDuration));

        if (marker.blinkCount < 4) {
          const isOddBlink = Math.floor(marker.blinkCount / 2) % 2 === 0;
          const targetOpacity = isOddBlink ? 0.2 : 0.9;
          const targetScale = marker.labelActive ? 1.5 : 1;

          const material = marker.mesh.material as THREE.MeshBasicMaterial;
          const baseOpacity = marker.blinkCount % 2 === 0 ? 0.9 : 0.2;
          const nextOpacity = marker.blinkCount % 2 === 0 ? 0.2 : 0.9;

          material.opacity = this.lerp(baseOpacity, nextOpacity, progress);

          const currentScale = marker.mesh.scale.x;
          const targetScaleValue = marker.blinkCount === 0 ?
            this.lerp(1, 1.5, progress) : 1.5;
          marker.mesh.scale.setScalar(targetScaleValue);

          if (marker.blinkTimer >= blinkDuration) {
            marker.blinkTimer = 0;
            marker.blinkCount++;
          }
        } else {
          marker.isBlinking = false;
          const material = marker.mesh.material as THREE.MeshBasicMaterial;
          material.opacity = 0.9;
          marker.mesh.scale.setScalar(1.5);
        }
      } else if (marker.labelActive) {
        const material = marker.mesh.material as THREE.MeshBasicMaterial;
        const breathe = 0.85 + Math.sin(time * 4) * 0.1;
        material.opacity = breathe;
        marker.mesh.scale.setScalar(1.5);
      } else {
        const material = marker.mesh.material as THREE.MeshBasicMaterial;
        const pulse = 0.75 + Math.sin(time * 2.5) * 0.15;
        material.opacity = pulse;
        marker.mesh.scale.setScalar(this.lerp(marker.mesh.scale.x, 1, 0.1));
      }
    }
  }

  public dispose(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      (this.terrainMesh.geometry as THREE.BufferGeometry).dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
    }

    if (this.centerMarker) {
      this.scene.remove(this.centerMarker);
      this.centerMarker.geometry.dispose();
      (this.centerMarker.material as THREE.Material).dispose();
    }

    for (const marker of this.markers) {
      this.scene.remove(marker.mesh);
      marker.mesh.geometry.dispose();
      (marker.mesh.material as THREE.Material).dispose();
    }

    this.markers = [];
  }
}
