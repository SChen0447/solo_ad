import * as THREE from 'three';
import type { BuildingData } from '../data/SampleLayouts';

export interface BuildingMesh {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  data: BuildingData;
  floors: number;
}

const FLOOR_HEIGHT = 3;

export class BuildingGenerator {
  private bottomColor = new THREE.Color(0xd0d5dd);
  private topColor = new THREE.Color(0x1e3a5f);

  public generate(buildings: BuildingData[], density: number): BuildingMesh[] {
    const count = Math.max(4, Math.floor(buildings.length * density));
    const sorted = [...buildings].sort((a, b) => b.height - a.height);
    const selected = sorted.slice(0, count);
    return selected.map((b) => this.createBuildingMesh(b));
  }

  public createBuildingMesh(data: BuildingData): BuildingMesh {
    const geometry = this.createLowPolyBox(data.width, data.height, data.depth);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
    });

    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(positionAttr.count * 3);
    const maxH = data.height;

    for (let i = 0; i < positionAttr.count; i++) {
      const y = positionAttr.getY(i);
      const t = Math.max(0, Math.min(1, (y + maxH / 2) / maxH));
      const color = this.bottomColor.clone().lerp(this.topColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x, data.height / 2, data.z);
    if (data.rotation) {
      mesh.rotation.y = data.rotation;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = this.createEdges(geometry);
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);

    const floors = Math.max(1, Math.round(data.height / FLOOR_HEIGHT));

    const bm: BuildingMesh = { mesh, edges, data, floors };
    mesh.userData.building = bm;
    return bm;
  }

  private createLowPolyBox(w: number, h: number, d: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const jitter = 0.04;
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * w * jitter);
      pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * h * jitter * 0.4);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * d * jitter);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  private createEdges(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const edgesGeo = new THREE.EdgesGeometry(geometry, 25);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x3a5a8a,
      transparent: true,
      opacity: 0.55,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    return edges;
  }

  public highlightEdges(edges: THREE.LineSegments, highlight: boolean): void {
    const mat = edges.material as THREE.LineBasicMaterial;
    if (highlight) {
      mat.color.setHex(0x8ad1ff);
      mat.opacity = 1.0;
    } else {
      mat.color.setHex(0x3a5a8a);
      mat.opacity = 0.55;
    }
  }

  public getHeightColor(height: number, maxHeight: number): THREE.Color {
    const t = Math.max(0, Math.min(1, height / maxHeight));
    return this.bottomColor.clone().lerp(this.topColor, t);
  }
}
