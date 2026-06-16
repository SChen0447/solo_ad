import * as THREE from 'three';
import type { BuildingData, LayerResponse, LayerType, LayerState } from './types';
import { LAYER_COLORS } from './types';

export class HeatmapRenderer {
  private buildingMeshes: Map<number, { mesh: THREE.Mesh; edges: THREE.LineSegments; heatMesh: THREE.Mesh }> = new Map();
  private baseColorAttribute: Map<number, THREE.Float32BufferAttribute> = new Map();
  private pendingUpdates: Set<number> = new Set();
  private animationFrameId: number | null = null;

  valueToColor(value: number, min: number, max: number): THREE.Color {
    const normalized = max > min ? (value - min) / (max - min) : 0.5;
    const clamped = Math.max(0, Math.min(1, normalized));

    if (clamped < 0.25) {
      const t = clamped / 0.25;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x0000ff),
        new THREE.Color(0x0066ff),
        t
      );
    } else if (clamped < 0.5) {
      const t = (clamped - 0.25) / 0.25;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x0066ff),
        new THREE.Color(0x99cc00),
        t
      );
    } else if (clamped < 0.75) {
      const t = (clamped - 0.5) / 0.25;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x99cc00),
        new THREE.Color(0xffcc00),
        t
      );
    } else {
      const t = (clamped - 0.75) / 0.25;
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffcc00),
        new THREE.Color(0xff0000),
        t
      );
    }
  }

  lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(c1, c2, t);
  }

  createBuildingMesh(building: BuildingData): { mesh: THREE.Mesh; edges: THREE.LineSegments; heatMesh: THREE.Mesh } {
    const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);

    const heightNormalized = (building.height - 5) / 75;
    const baseColor = new THREE.Color().lerpColors(
      new THREE.Color(0x87ceeb),
      new THREE.Color(0x4b0082),
      heightNormalized
    );

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.85,
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, baseMaterial);
    mesh.position.set(building.x, building.height / 2, building.z);
    mesh.userData = { buildingId: building.id, buildingData: building };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = baseColor.r;
      colors[i + 1] = baseColor.g;
      colors[i + 2] = baseColor.b;
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.baseColorAttribute.set(building.id, geometry.getAttribute('color') as THREE.Float32BufferAttribute);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    edges.position.copy(mesh.position);

    const heatGeometry = new THREE.BoxGeometry(
      building.width + 0.5,
      building.height + 0.5,
      building.depth + 0.5
    );
    const heatColors = new Float32Array(heatGeometry.attributes.position.count * 3);
    for (let i = 0; i < heatColors.length; i += 3) {
      heatColors[i] = 0;
      heatColors[i + 1] = 0;
      heatColors[i + 2] = 1;
    }
    heatGeometry.setAttribute('color', new THREE.Float32BufferAttribute(heatColors, 3));

    const heatMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const heatMesh = new THREE.Mesh(heatGeometry, heatMaterial);
    heatMesh.position.set(building.x, building.height / 2, building.z);
    heatMesh.userData = { buildingId: building.id, isHeatOverlay: true };

    return { mesh, edges, heatMesh };
  }

  addBuilding(building: BuildingData, scene: THREE.Scene): void {
    const { mesh, edges, heatMesh } = this.createBuildingMesh(building);
    this.buildingMeshes.set(building.id, { mesh, edges, heatMesh });
    scene.add(mesh);
    scene.add(edges);
    scene.add(heatMesh);
  }

  updateHeatmapLayer(
    layerType: LayerType,
    layerData: LayerResponse,
    opacity: number,
    enabled: boolean
  ): void {
    if (!enabled) {
      this.buildingMeshes.forEach(({ heatMesh }) => {
        const material = heatMesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0;
      });
      return;
    }

    const layerColor = LAYER_COLORS[layerType];
    const { values, minValue, maxValue } = layerData;

    this.buildingMeshes.forEach(({ heatMesh }, buildingId) => {
      const value = values[String(buildingId)] ?? 0;
      const heatColor = this.valueToColor(value, minValue, maxValue);

      const finalColor = new THREE.Color(
        heatColor.r * layerColor.r,
        heatColor.g * layerColor.g,
        heatColor.b * layerColor.b
      );

      const colors = heatMesh.geometry.getAttribute('color') as THREE.Float32BufferAttribute;
      for (let i = 0; i < colors.count; i++) {
        colors.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
      }
      colors.needsUpdate = true;

      const material = heatMesh.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
    });

    this.scheduleUpdate();
  }

  updateCombinedHeatmap(layers: Record<LayerType, LayerState>): void {
    this.buildingMeshes.forEach(({ heatMesh }, buildingId) => {
      let r = 0, g = 0, b = 0;
      let totalWeight = 0;

      (['energy', 'traffic', 'green'] as LayerType[]).forEach((layerType) => {
        const layer = layers[layerType];
        if (layer.enabled && layer.data) {
          const value = layer.data.values[String(buildingId)] ?? 0;
          const heatColor = this.valueToColor(value, layer.data.minValue, layer.data.maxValue);
          const layerColor = LAYER_COLORS[layerType];

          const finalColor = new THREE.Color(
            heatColor.r * layerColor.r,
            heatColor.g * layerColor.g,
            heatColor.b * layerColor.b
          );

          const weight = layer.opacity;
          r += finalColor.r * weight;
          g += finalColor.g * weight;
          b += finalColor.b * weight;
          totalWeight += weight;
        }
      });

      if (totalWeight > 0) {
        r /= totalWeight;
        g /= totalWeight;
        b /= totalWeight;
      }

      const colors = heatMesh.geometry.getAttribute('color') as THREE.Float32BufferAttribute;
      for (let i = 0; i < colors.count; i++) {
        colors.setXYZ(i, r, g, b);
      }
      colors.needsUpdate = true;

      const material = heatMesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(1, totalWeight * 0.8);
    });

    this.scheduleUpdate();
  }

  highlightBuilding(buildingId: number, scene: THREE.Scene): void {
    const building = this.buildingMeshes.get(buildingId);
    if (!building) return;

    const { mesh } = building;

    const highlightGeometry = new THREE.BoxGeometry(
      (mesh.geometry as THREE.BoxGeometry).parameters.width + 2,
      (mesh.geometry as THREE.BoxGeometry).parameters.height + 2,
      (mesh.geometry as THREE.BoxGeometry).parameters.depth + 2
    );

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide
    });

    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.position.copy(mesh.position);
    highlightMesh.userData = { isHighlight: true, buildingId };

    scene.add(highlightMesh);

    const startTime = performance.now();
    const duration = 1500;

    const animateHighlight = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 0.7) {
        highlightMaterial.opacity = 0.4 + Math.sin(elapsed * 0.01) * 0.15;
      } else {
        highlightMaterial.opacity = 0.4 * (1 - (progress - 0.7) / 0.3);
      }

      if (progress < 1) {
        requestAnimationFrame(animateHighlight);
      } else {
        scene.remove(highlightMesh);
        highlightGeometry.dispose();
        highlightMaterial.dispose();
      }
    };

    animateHighlight();
  }

  private scheduleUpdate(): void {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.buildingMeshes.forEach(({ heatMesh }) => {
        const colors = heatMesh.geometry.getAttribute('color') as THREE.Float32BufferAttribute;
        colors.needsUpdate = true;
      });
    });
  }

  getBuildingMesh(buildingId: number): THREE.Mesh | null {
    return this.buildingMeshes.get(buildingId)?.mesh || null;
  }

  getAllBuildingMeshes(): THREE.Mesh[] {
    return Array.from(this.buildingMeshes.values()).map((b) => b.mesh);
  }

  clear(scene: THREE.Scene): void {
    this.buildingMeshes.forEach(({ mesh, edges, heatMesh }) => {
      scene.remove(mesh);
      scene.remove(edges);
      scene.remove(heatMesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      heatMesh.geometry.dispose();
      (heatMesh.material as THREE.Material).dispose();
    });
    this.buildingMeshes.clear();
    this.baseColorAttribute.clear();
  }

  getBuildingCount(): number {
    return this.buildingMeshes.size;
  }
}

export const heatmapRenderer = new HeatmapRenderer();
