import * as THREE from 'three';

export type GeometryType = 'sphere' | 'cube' | 'cylinder';

export interface GeometryEntry {
  id: string;
  type: GeometryType;
  position: THREE.Vector3;
  size: number;
  mesh: THREE.Mesh;
  originalMaterial: THREE.MeshPhongMaterial;
}

let nextId = 0;

export class GeometryManager {
  private entries: Map<string, GeometryEntry> = new Map();

  addGeometry(type: GeometryType, position?: THREE.Vector3, size?: number): GeometryEntry {
    const id = `geo_${nextId++}`;
    const pos = position || new THREE.Vector3(0, 0, 0);
    const sz = size || 1;

    const geometry = this.createGeometry(type, sz);
    const material = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      shininess: 30,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.userData.geoId = id;

    const entry: GeometryEntry = {
      id,
      type,
      position: pos.clone(),
      size: sz,
      mesh,
      originalMaterial: material,
    };

    this.entries.set(id, entry);
    return entry;
  }

  removeGeometry(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
    this.entries.delete(id);
    return true;
  }

  updatePosition(id: string, x: number, y: number, z: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.position.set(x, y, z);
    entry.mesh.position.set(x, y, z);
  }

  updateSize(id: string, size: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.size = size;
    entry.mesh.geometry.dispose();
    entry.mesh.geometry = this.createGeometry(entry.type, size);
  }

  getEntry(id: string): GeometryEntry | undefined {
    return this.entries.get(id);
  }

  getAllEntries(): GeometryEntry[] {
    return Array.from(this.entries.values());
  }

  getBufferGeometry(id: string): THREE.BufferGeometry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    return entry.mesh.geometry;
  }

  getTransformedGeometry(id: string): THREE.BufferGeometry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    const geo = entry.mesh.geometry.clone();
    geo.applyMatrix4(entry.mesh.matrixWorld);
    return geo;
  }

  setMaterialStyle(id: string, style: 'default' | 'selected' | 'unselected'): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    const mat = entry.mesh.material as THREE.MeshPhongMaterial;
    switch (style) {
      case 'default':
        mat.color.setHex(0x4488ff);
        mat.opacity = 0.3;
        break;
      case 'selected':
        mat.color.setHex(0x00ffff);
        mat.opacity = 0.4;
        break;
      case 'unselected':
        mat.color.setHex(0x4488ff);
        mat.opacity = 0.15;
        break;
    }
    mat.needsUpdate = true;
  }

  private createGeometry(type: GeometryType, size: number): THREE.BufferGeometry {
    switch (type) {
      case 'sphere':
        return new THREE.SphereGeometry(size, 32, 32);
      case 'cube':
        return new THREE.BoxGeometry(size, size, size);
      case 'cylinder':
        return new THREE.CylinderGeometry(size * 0.6, size * 0.6, size * 1.5, 32);
      default:
        return new THREE.BoxGeometry(size, size, size);
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.Material).dispose();
    }
    this.entries.clear();
  }
}
